import { useState, useEffect, useCallback } from 'react';
import { haversineDistanceKm } from '../lib/distance';
import { DEFAULT_VYBE_LOCATION } from '../data/locationPresets';

export { haversineDistanceKm };

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export type GeoError = 'DENIED' | 'UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED';
export type GeoLocationSource = 'device' | 'fallback';

interface GeoState {
  location: GeoLocation | null;
  error: GeoError | null;
  loading: boolean;
  permissionState: PermissionState | null;
  source: GeoLocationSource | null;
}

const FALLBACK_LOCATION: GeoLocation = {
  lat: DEFAULT_VYBE_LOCATION.lat,
  lng: DEFAULT_VYBE_LOCATION.lng,
  // A fallback city is intentionally not represented as device accuracy.
  accuracy: 25_000,
  timestamp: Date.now(),
};

/**
 * Browser geolocation hook with a production-safe city fallback.
 *
 * - Requests device location when the app asks for it.
 * - Uses the user's device coordinates when permission is granted.
 * - Never leaves discovery without a usable location: denied/unavailable/
 *   timeout/unsupported browsers fall back to the default VYBE city.
 * - Does not poll or track continuously.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    location: null,
    error: null,
    loading: false,
    permissionState: null,
    source: null,
  });

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

  const requestLocation = useCallback(() => {
    if (!isSupported) {
      setState({
        location: FALLBACK_LOCATION,
        error: 'UNSUPPORTED',
        loading: false,
        permissionState: null,
        source: 'fallback',
      });
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
          source: 'device',
        });
      },
      err => {
        let error: GeoError = 'UNAVAILABLE';
        if (err.code === err.PERMISSION_DENIED) error = 'DENIED';
        else if (err.code === err.POSITION_UNAVAILABLE) error = 'UNAVAILABLE';
        else if (err.code === err.TIMEOUT) error = 'TIMEOUT';

        setState({
          location: FALLBACK_LOCATION,
          error,
          loading: false,
          permissionState: err.code === err.PERMISSION_DENIED ? 'denied' : null,
          source: 'fallback',
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      }
    );
  }, [isSupported]);

  const clearLocation = useCallback(() => {
    setState(prev => ({ ...prev, location: null, error: null, source: null }));
  }, []);

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
