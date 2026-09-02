import React, { useEffect, useRef, useState } from 'react';
import { Place } from '../../types';
import { googleMapsConfig } from '../../lib/env';
import { loadGoogleMaps } from '../../lib/googleMapsLoader';
import { INITIAL_MOODS } from '../../data/initialMoods';

interface GoogleMapProps {
  places: Place[];
  onMarkerClick?: (place: Place) => void;
  selectedPlace?: Place | null;
  userLocation?: { lat: number; lng: number } | null;
  onError?: (message: string) => void;
}

export const GoogleMap: React.FC<GoogleMapProps> = ({
  places,
  onMarkerClick,
  selectedPlace,
  userLocation,
  onError,
}) => {
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
        const map = new Map(mapRef.current, {
          center: userLocation || defaultCenter,
          zoom: userLocation ? 14 : 2,
          mapId,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

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
      markersRef.current.forEach((marker) => { marker.map = null; });
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

    markersRef.current.forEach((marker) => { marker.map = null; });
    markersRef.current = [];
    const AdvancedMarkerElement = advancedMarkerRef.current;

    places.forEach((place) => {
      if (place.location?.lat == null || place.location?.lng == null) return;

      const moodObj = INITIAL_MOODS.find((m) => m.id === place.primaryMood);
      const emoji = moodObj?.emoji || '📍';
      const color = moodObj?.accentColor || '#CCFF00';
      const markerContent = document.createElement('div');
      markerContent.innerHTML = `
        <div class="custom-map-marker group relative cursor-pointer">
          <div class="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-black font-sans shadow-lg" style="background-color:${color};border:2px solid #000;box-shadow:0 0 15px ${color}88">
            <span>${emoji}</span>
            <span class="font-mono text-[11px] font-extrabold">${place.features.isFree ? 'FREE' : place.priceLevel}</span>
          </div>
          <div class="w-2 h-2 bg-black rotate-45 mx-auto -mt-1 border-r border-b border-black"></div>
        </div>`;

      const marker = new AdvancedMarkerElement({
        map: googleMapRef.current!,
        position: { lat: place.location.lat, lng: place.location.lng },
        content: markerContent,
        title: place.name,
      });

      marker.addEventListener('gmp-click', () => onLoadCallbackRef.current?.(place));
      markersRef.current.push(marker);
    });
  }, [places, mapLoaded]);

  useEffect(() => {
    if (!googleMapRef.current || !selectedPlace?.location) return;
    const { lat, lng } = selectedPlace.location;
    if (lat == null || lng == null) return;
    googleMapRef.current.panTo({ lat, lng });
  }, [selectedPlace]);

  if (mapError) return null;

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-3xl overflow-hidden"
      style={{ minHeight: '550px' }}
      aria-label="Google Maps"
    />
  );
};
