import React, { useEffect, useRef, useState } from 'react';
import { Place } from '../../types';
import { googleMapsConfig } from '../../lib/env';
import { loadGoogleMaps } from '../../lib/googleMapsLoader';
import { INITIAL_MOODS } from '../../data/initialMoods';
import { classifyPlace } from '../../services/googlePlacesAdapter';

interface GoogleMapProps { places: Place[]; onMarkerClick?: (place: Place) => void; selectedPlace?: Place | null; userLocation?: { lat: number; lng: number } | null; onError?: (message: string) => void; }

type AnyMarker = google.maps.marker.AdvancedMarkerElement | google.maps.Marker;

function getPlaceMarkerEmoji(place: Place): string {
  const text = `${place.name} ${place.tags.join(' ')}`.toLowerCase();
  const { category } = classifyPlace(place.tags, place.name);
  if (/mosque|masjid|مسجد|جامع|mosquée|mosquee/.test(text)) return '🕌';
  if (/church|eglise|église|كنيسة/.test(text)) return '⛪';
  if (/synagogue|كنيس/.test(text)) return '🕍';
  if (/hospital|clinic|pharmacy|hôpital|clinique|مستشفى|صيدلية/.test(text)) return '🏥';
  if (/hotel|hostel|motel|hôtel|فندق/.test(text)) return '🏨';
  if (/school|university|école|université|مدرسة|جامعة/.test(text)) return '🎓';
  if (/game|arcade|gaming|gamer|playstation|xbox|jeux|video game|ألعاب/.test(text)) return '🎮';
  if (/cinema|movie|theater|film|cinéma|سينما|مسرح/.test(text)) return '🎬';
  if (/restaurant|food|bakery|مطعم|مخبزة/.test(text)) return '🍽️';
  if (/coffee|cafe|café|قهوة|مقهى/.test(text)) return '☕';
  if (/gym|fitness|sport|stadium|pool|tennis|رياضة|ملعب|مسبح/.test(text)) return '🏋️';
  if (/park|garden|playground|nature|حديقة/.test(text)) return '🌳';
  if (/shopping|mall|store|market|boutique|تسوق|سوق/.test(text)) return '🛍️';
  if (/museum|gallery|library|متحف|مكتبة/.test(text)) return '🏛️';
  if (/bar|club|nightlife|music|karaoke|barre|موسيقى/.test(text)) return '🎵';
  if (/airport|station|bus|train|transit|مطار|محطة/.test(text)) return '🚉';
  switch (category) {
    case 'food-drink': return '🍽️';
    case 'nightlife': return '🎵';
    case 'arcade-gaming': return '🎮';
    case 'outdoors-nature': return '🌳';
    case 'entertainment': return '🎬';
    case 'arts-culture': return '🏛️';
    case 'shopping-vintage': return '🛍️';
    case 'chill-spots': return '☕';
    default: return '📍';
  }
}

export const GoogleMap: React.FC<GoogleMapProps> = ({ places, onMarkerClick, selectedPlace, userLocation, onError }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<AnyMarker[]>([]);
  const onLoadCallbackRef = useRef(onMarkerClick);
  const markerRef = useRef<{ advanced: typeof google.maps.marker.AdvancedMarkerElement | null; classic: typeof google.maps.Marker | null }>({ advanced: null, classic: null });
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const defaultCenter = { lat: 20, lng: 0 };
  onLoadCallbackRef.current = onMarkerClick;
  // Advanced markers require a map ID; without one they never appear on the
  // canvas (Google silently drops them). Classic markers need no map ID.
  const useAdvancedMarkers = Boolean(googleMapsConfig.mapId?.trim());

  const clearMarkers = () => {
    markersRef.current.forEach(marker => {
      try {
        const advanced = marker as google.maps.marker.AdvancedMarkerElement;
        if (advanced && typeof advanced === 'object' && 'map' in advanced) {
          advanced.map = null;
          return;
        }
      } catch { /* marker already detached */ }
      try { (marker as google.maps.Marker).setMap(null); } catch { /* marker already detached */ }
    });
    markersRef.current = [];
  };

  useEffect(() => {
    let cancelled = false;
    let mapInstance: google.maps.Map | null = null;

    const initializeMap = async () => {
      if (!googleMapsConfig.apiKey) {
        const message = 'Google Maps API key is not configured; using the legacy map fallback.';
        setMapError(message);
        onError?.(message);
        return;
      }
      if (!mapRef.current) return;
      try {
        const { Map, AdvancedMarkerElement, Marker } = await loadGoogleMaps();
        if (cancelled || !mapRef.current) return;
        markerRef.current = { advanced: AdvancedMarkerElement, classic: Marker };
        const map = new Map(mapRef.current, {
          center: userLocation || defaultCenter,
          zoom: userLocation ? 14 : 2,
          ...(googleMapsConfig.mapId?.trim() ? { mapId: googleMapsConfig.mapId.trim() } : {}),
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        mapInstance = map;
        googleMapRef.current = map;
        setMapLoaded(true);

        // Watchdog: when the API key is invalid/quota-exhausted (or a map ID is
        // required but missing) Google does not throw — it silently paints its
        // own error panel inside the map and no tiles ever load. Detect that
        // panel and fail over to the Leaflet fallback instead of leaving the
        // user staring at a raw Google error.
        const mapContainer = mapRef.current;
        let tilesLoaded = false;
        let watchdog: number | undefined;
        const stopWatchdog = () => { if (watchdog !== undefined) { window.clearInterval(watchdog); watchdog = undefined; } };
        const failGoogle = () => {
          if (cancelled) return;
          const message = 'Google Maps tiles could not load (API key or quota problem). Showing the fallback map.';
          console.warn('[GoogleMap]', message);
          setMapError(message);
          onError?.(message);
        };
        try {
          map.addListener('tilesloaded', () => { tilesLoaded = true; stopWatchdog(); });
        } catch { /* listener unavailable — the poller below still covers us */ }
        const startedAt = Date.now();
        watchdog = window.setInterval(() => {
          if (cancelled || tilesLoaded || !mapContainer || !mapContainer.isConnected) { stopWatchdog(); return; }
          // Google paints its own error panel for invalid keys / quota.
          if (mapContainer.querySelector('.gm-err-container')) {
            stopWatchdog();
            failGoogle();
            return;
          }
          // Degraded keys can also leave the canvas permanently blank without
          // an error panel: no tiles, no attribution chrome, no canvas after a
          // grace period. Fail over to the Leaflet fallback instead of showing
          // an empty panel.
          const hasAnyProgress = !!mapContainer.querySelector('.gm-style, canvas');
          if (!hasAnyProgress && Date.now() - startedAt > 9000) {
            stopWatchdog();
            failGoogle();
          }
        }, 2000);
        window.setTimeout(() => { if (watchdog !== undefined) stopWatchdog(); }, 30000);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Google Maps error';
        console.error('[GoogleMap] Google Maps initialization error:', message);
        if (!cancelled) {
          setMapError(message);
          onError?.(message);
        }
      }
    };
    initializeMap();
    return () => {
      cancelled = true;
      clearMarkers();
      if (mapInstance) mapInstance = null;
      googleMapRef.current = null;
      markerRef.current = { advanced: null, classic: null };
      setMapLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current) return;
    const map = googleMapRef.current;
    clearMarkers();
    const advancedCtor = markerRef.current.advanced;
    const classicCtor = markerRef.current.classic;

    places.forEach(place => {
      const lat = place.location?.lat;
      const lng = place.location?.lng;
      if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      try {
        const { mood: classifiedMood } = classifyPlace(place.tags, place.name);
        const moodObj = INITIAL_MOODS.find(m => m.id === classifiedMood);
        const emoji = getPlaceMarkerEmoji(place);
        const color = moodObj?.accentColor || '#CCFF00';
        const isSelected = selectedPlace?.id === place.id;
        const position = { lat, lng };
        const openPlace = () => onLoadCallbackRef.current?.({ ...place, primaryMood: classifiedMood });

        if (useAdvancedMarkers && advancedCtor) {
          const markerContent = document.createElement('div');
          markerContent.className = `custom-map-marker group relative cursor-pointer${isSelected ? ' selected' : ''}`;
          markerContent.style.cssText = `width:46px;height:46px;border-radius:14px;overflow:hidden;border:2px solid #000;box-shadow:0 4px 14px rgba(0,0,0,.35);background:#111;position:relative;transform:${isSelected ? 'scale(1.25)' : 'scale(1)'};z-index:${isSelected ? '20' : '1'};transition:transform .2s ease;`;
          const imageUrl = place.images.find(image => image?.trim().toLowerCase().startsWith('http'))?.trim();
          const fallback = document.createElement('span');
          fallback.textContent = emoji;
          fallback.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:24px;background:${color};`;
          if (imageUrl) {
            const image = document.createElement('img');
            image.src = imageUrl;
            image.alt = place.name;
            image.loading = 'lazy';
            image.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
            image.onerror = () => {
              image.remove();
              markerContent.appendChild(fallback);
            };
            markerContent.appendChild(image);
          }
          markerContent.appendChild(fallback);
          const marker = new advancedCtor({
            map,
            position,
            content: markerContent,
            title: place.name,
            zIndex: isSelected ? 1000 : 1,
          });
          marker.addListener('gmp-click', openPlace);
          markersRef.current.push(marker);
          return;
        }

        // Classic marker fallback (works without a map ID).
        if (classicCtor) {
          const marker = new classicCtor({
            map,
            position,
            title: place.name,
            zIndex: isSelected ? 1000 : 1,
            label: { text: emoji, fontSize: '16px', color: '#111111' },
          });
          marker.addListener('click', openPlace);
          markersRef.current.push(marker);
        }
      } catch (error) {
        // A single bad marker must never take down the whole map.
        console.warn('[GoogleMap] Skipped marker for', place.name, error);
      }
    });
  }, [places, mapLoaded, selectedPlace, useAdvancedMarkers]);

  useEffect(() => {
    if (!googleMapRef.current || !selectedPlace?.location) return;
    const { lat, lng } = selectedPlace.location;
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    try {
      googleMapRef.current.panTo({ lat, lng });
      googleMapRef.current.setZoom(17);
    } catch (error) {
      console.warn('[GoogleMap] Could not center selected place', error);
    }
  }, [selectedPlace]);

  if (mapError) return null;
  return <div ref={mapRef} className="w-full h-full rounded-3xl overflow-hidden" style={{ minHeight: '550px' }} aria-label="Google Maps" />;
};
