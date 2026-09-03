import React, { useEffect, useRef, useState } from 'react';
import { Place } from '../../types';
import { googleMapsConfig } from '../../lib/env';
import { loadGoogleMaps } from '../../lib/googleMapsLoader';
import { INITIAL_MOODS } from '../../data/initialMoods';
import { classifyPlace } from '../../services/googlePlacesAdapter';

interface GoogleMapProps { places: Place[]; onMarkerClick?: (place: Place) => void; selectedPlace?: Place | null; userLocation?: { lat: number; lng: number } | null; onError?: (message: string) => void; }

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
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const onLoadCallbackRef = useRef(onMarkerClick);
  const advancedMarkerRef = useRef<typeof google.maps.marker.AdvancedMarkerElement | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const defaultCenter = { lat: 20, lng: 0 };
  onLoadCallbackRef.current = onMarkerClick;

  useEffect(() => {
    let cancelled = false;
    let mapInstance: google.maps.Map | null = null;
    const initializeMap = async () => {
      if (!mapRef.current || !googleMapsConfig.apiKey) return;
      try {
        const { Map, AdvancedMarkerElement } = await loadGoogleMaps();
        advancedMarkerRef.current = AdvancedMarkerElement;
        if (cancelled || !mapRef.current) return;
        const mapId = googleMapsConfig.mapId?.trim() || 'DEMO_MAP_ID';
        const map = new Map(mapRef.current, { center: userLocation || defaultCenter, zoom: userLocation ? 14 : 2, mapId, zoomControl: true, mapTypeControl: false, streetViewControl: false, fullscreenControl: true });
        mapInstance = map;
        googleMapRef.current = map;
        setMapLoaded(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown Google Maps error';
        console.error('[GoogleMap] Google Maps initialization error:', message);
        setMapError(message);
        onError?.(message);
      }
    };
    initializeMap();
    return () => {
      cancelled = true;
      markersRef.current.forEach(marker => { marker.map = null; });
      markersRef.current = [];
      if (mapInstance) mapInstance = null;
      googleMapRef.current = null;
      advancedMarkerRef.current = null;
      setMapLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current || !advancedMarkerRef.current) return;
    markersRef.current.forEach(marker => { marker.map = null; });
    markersRef.current = [];
    const AdvancedMarkerElement = advancedMarkerRef.current;
    places.forEach(place => {
      if (place.location?.lat == null || place.location?.lng == null) return;
      const { mood: classifiedMood } = classifyPlace(place.tags, place.name);
      const moodObj = INITIAL_MOODS.find(m => m.id === classifiedMood);
      const emoji = getPlaceMarkerEmoji(place);
      const color = moodObj?.accentColor || '#CCFF00';
      const isSelected = selectedPlace?.id === place.id;
      const markerContent = document.createElement('div');
      markerContent.className = `custom-map-marker group relative cursor-pointer${isSelected ? ' selected' : ''}`;
      markerContent.style.cssText = `width:46px;height:46px;border-radius:14px;overflow:hidden;border:2px solid #000;box-shadow:0 4px 14px rgba(0,0,0,.35);background:#111;position:relative;transform:${isSelected ? 'scale(1.25)' : 'scale(1)'};z-index:${isSelected ? '20' : '1'};transition:transform .2s ease;`;
      const imageUrl = place.images.find(image => /^https?:\/\//i.test(image?.trim()))?.trim();
      if (imageUrl) {
        const image = document.createElement('img');
        image.src = imageUrl; image.alt = place.name; image.loading = 'lazy';
        image.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        image.onerror = () => { image.remove(); const fallback = document.createElement('span'); fallback.textContent = emoji; fallback.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:24px;background:#111;'; markerContent.appendChild(fallback); };
        markerContent.appendChild(image);
        const tint = document.createElement('span');
        tint.style.cssText = `position:absolute;inset:0;border:2px solid ${isSelected ? '#FFFFFF' : color};border-radius:12px;pointer-events:none;box-shadow:${isSelected ? '0 0 0 3px rgba(204,255,0,.65), 0 0 22px rgba(204,255,0,.7), ' : ''}inset 0 0 0 1px rgba(255,255,255,.18);`;
        markerContent.appendChild(tint);
      } else {
        const fallback = document.createElement('span');
        fallback.textContent = emoji; fallback.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:24px;background:${color};`; markerContent.appendChild(fallback);
      }
      const marker = new AdvancedMarkerElement({ map: googleMapRef.current!, position: { lat: place.location.lat, lng: place.location.lng }, content: markerContent, title: place.name, zIndex: isSelected ? 1000 : 1 });
      marker.addEventListener('gmp-click', () => onLoadCallbackRef.current?.({ ...place, primaryMood: classifiedMood }));
      markersRef.current.push(marker);
    });
  }, [places, mapLoaded, selectedPlace]);

  useEffect(() => {
    if (!googleMapRef.current || !selectedPlace?.location) return;
    const { lat, lng } = selectedPlace.location;
    if (lat == null || lng == null) return;
    googleMapRef.current.panTo({ lat, lng });
    googleMapRef.current.setZoom(17);
  }, [selectedPlace]);

  if (mapError) return null;
  return <div ref={mapRef} className="w-full h-full rounded-3xl overflow-hidden" style={{ minHeight: '550px' }} aria-label="Google Maps" />;
};
