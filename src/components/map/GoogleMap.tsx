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
}

export const GoogleMap: React.FC<GoogleMapProps> = ({
  places,
  onMarkerClick,
  selectedPlace,
  userLocation,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const onLoadCallbackRef = useRef(onMarkerClick);
  const advancedMarkerRef = useRef<typeof google.maps.marker.AdvancedMarkerElement | null>(null);

  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const defaultCenter = { lat: 40.7185, lng: -73.9925 };

  // Keep the latest callback without forcing marker re-creation.
  onLoadCallbackRef.current = onMarkerClick;

  // -----------------------------------------------------------------------
  // 1. Load Google Maps + initialise the map instance (runs once)
  // -----------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let mapInstance: google.maps.Map | null = null;

    const initializeMap = async () => {
      if (!mapRef.current || !googleMapsConfig.apiKey) {
        return;
      }

      try {
        const { Map, AdvancedMarkerElement } = await loadGoogleMaps();
        advancedMarkerRef.current = AdvancedMarkerElement;

        if (cancelled || !mapRef.current) {
          return;
        }

        const mapId = googleMapsConfig.mapId?.trim() || 'DEMO_MAP_ID';

        const map = new Map(mapRef.current, {
          center: userLocation || defaultCenter,
          zoom: 14,
          // Required for AdvancedMarkerElement.
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
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.error('[GoogleMap] Google Maps initialization error:', message);
        setMapError(message);
      }
    };

    initializeMap();

    return () => {
      cancelled = true;

      markersRef.current.forEach((marker) => {
        marker.map = null;
      });
      markersRef.current = [];

      if (mapInstance) {
        mapInstance = null;
      }
      googleMapRef.current = null;
      advancedMarkerRef.current = null;
      setMapLoaded(false);
    };
    // Re-initialise ONLY when the user's location changes so the map centers
    // on them. Changing places / selectedPlace must NOT reload the script or
    // recreate the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  useEffect(() => {
    if (
      !mapLoaded ||
      !googleMapRef.current ||
      !advancedMarkerRef.current
    ) {
      return;
    }

    markersRef.current.forEach((marker) => {
      marker.map = null;
    });

    markersRef.current = [];

    const AdvancedMarkerElement = advancedMarkerRef.current;

    places.forEach((place) => {
      if (
        place.location?.lat == null ||
        place.location?.lng == null
      ) {
        return;
      }

      const moodObj = INITIAL_MOODS.find(
        (m) => m.id === place.primaryMood
      );

      const emoji = moodObj?.emoji || '📍';
      const color = moodObj?.accentColor || '#CCFF00';

      const markerContent = document.createElement('div');

      markerContent.innerHTML = `
        <div class="custom-map-marker group relative cursor-pointer">
          <div
            class="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-black font-sans shadow-lg"
            style="
              background-color: ${color};
              border: 2px solid #000;
              box-shadow: 0 0 15px ${color}88;
            "
          >
            <span>${emoji}</span>
            <span class="font-mono text-[11px] font-extrabold">
              ${place.features.isFree ? 'FREE' : place.priceLevel}
            </span>
          </div>

          <div
            class="w-2 h-2 bg-black rotate-45 mx-auto -mt-1 border-r border-b border-black"
          ></div>
        </div>
      `;

      const marker = new AdvancedMarkerElement({
        map: googleMapRef.current!,
        position: {
          lat: place.location.lat,
          lng: place.location.lng,
        },
        content: markerContent,
        title: place.name,
      });

      // AdvancedMarkerElement uses the "gmp-click" DOM event — NOT the
      // legacy "click" Maps event. Using addEventListener here avoids the
      // deprecated addListener warning.
      marker.addEventListener('gmp-click', () => {
        onLoadCallbackRef.current?.(place);
      });

      markersRef.current.push(marker);
    });
  }, [places, mapLoaded]);

  useEffect(() => {
    if (!googleMapRef.current || !selectedPlace?.location) {
      return;
    }
    const lat = selectedPlace.location.lat;
    const lng = selectedPlace.location.lng;
    if (lat === null || lat === undefined || lng === null || lng === undefined) {
      return;
    }
    googleMapRef.current.panTo({ lat, lng });
  }, [selectedPlace]);

  if (mapError) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900 rounded-3xl">
        <div className="text-center p-6 max-w-md">
          <p className="text-red-400 mb-2 font-mono text-sm">
            ⚠️ Google Maps Error
          </p>
          <p className="text-slate-300 text-xs break-words">
            {mapError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-3xl overflow-hidden"
      style={{ minHeight: '550px' }}
    />
  );
};