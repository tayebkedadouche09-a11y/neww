import { useState, useEffect, useCallback, useRef } from 'react';
import { haversineDistanceKm } from '../lib/distance';
import { fetchGeoFallback, type GeoFallbackResult } from '../services/geoFallbackService';

export { haversineDistanceKm };

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export type GeoError = 'DENIED' | 'UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED';

export type LocationSource = 'browser' | 'vercel-edge' | 'country-city-default' | 'product-default' | null;

interface GeoState {
  location: GeoLocation | null;
  error: GeoError | null;
  loading: boolean;
  permissionState: PermissionState | null;
  /** Where the current coordinates came from (browser GPS vs IP/edge fallback). */
  locationSource: LocationSource;
  /** Human label when using approximate fallback (e.g. "Algiers"). */
  locationLabel: string | null;
}

/**
 * Browser geolocation hook with Vercel edge IP fallback.
 *
 * Priority:
 * 1. Browser Geolocation API (precise, requires permission)
 * 2. GET /api/geo-fallback (Vercel x-vercel-ip-* headers + Algeria city defaults)
 *
 * Fallback never leaves the app with zero discovery coordinates.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    location: null,
    error: null,
    loading: false,
    permissionState: null,
    locationSource: null,
    locationLabel: null,
  });
  const fallbackInFlight = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  useEffect(() => {
    if (!isSupported) {
      setState(prev => ({ ...prev, error: 'UNSUPPORTED' }));
      return;
    }

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then(result => {
          setState(prev => ({ ...prev, permissionState: result.state }));
          result.onchange = () => {
            setState(prev => ({ ...prev, permissionState: result.state }));
          };
        })
        .catch(() => {
          // permissions.query may not be supported for geolocation in all browsers
        });
    }
  }, [isSupported]);

  const applyFallback = useCallback(async (browserError: GeoError | null) => {
    if (fallbackInFlight.current) return;
    fallbackInFlight.current = true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const fallback: GeoFallbackResult | null = await fetchGeoFallback(controller.signal);
      if (fallback) {
        setState({
          location: {
            lat: fallback.lat,
            lng: fallback.lng,
            accuracy: fallback.accuracy,
            timestamp: fallback.timestamp,
          },
          // Keep the browser error visible so UI can still prompt to allow precise location.
          error: browserError,
          loading: false,
          permissionState: browserError === 'DENIED' ? 'denied' : null,
          locationSource: fallback.source,
          locationLabel: fallback.label ?? fallback.city ?? null,
        });
        return;
      }
    } finally {
      fallbackInFlight.current = false;
    }

    setState(prev => ({
      ...prev,
      location: null,
      error: browserError ?? 'UNAVAILABLE',
      loading: false,
      locationSource: null,
      locationLabel: null,
    }));
  }, []);

  const requestLocation = useCallback(() => {
    if (!isSupported) {
      void applyFallback('UNSUPPORTED');
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      position => {
        setState({
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          },
          error: null,
          loading: false,
          permissionState: 'granted',
          locationSource: 'browser',
          locationLabel: null,
        });
      },
      err => {
        let error: GeoError = 'UNAVAILABLE';
        if (err.code === err.PERMISSION_DENIED) error = 'DENIED';
        else if (err.code === err.POSITION_UNAVAILABLE) error = 'UNAVAILABLE';
        else if (err.code === err.TIMEOUT) error = 'TIMEOUT';
        void applyFallback(error);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      }
    );
  }, [isSupported, applyFallback]);

  const clearLocation = useCallback(() => {
    abortRef.current?.abort();
    setState(prev => ({
      ...prev,
      location: null,
      error: null,
      locationSource: null,
      locationLabel: null,
    }));
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    ...state,
    isSupported,
    requestLocation,
    clearLocation,
  };
}

/**
 * Format distance for display.
 */
export function formatDistance(km: number): string {
  if (km < 0.1) return '📍 < 100 m';
  if (km < 1) return `📍 ${Math.round(km * 1000)} m`;
  if (km < 10) return `📍 ${km.toFixed(1)} km away`;
  return `📍 ${Math.round(km)} km away`;
}
