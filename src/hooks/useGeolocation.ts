import { useState, useEffect, useCallback } from 'react';

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export type GeoError = 'DENIED' | 'UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED';

interface GeoState {
  location: GeoLocation | null;
  error: GeoError | null;
  loading: boolean;
  permissionState: PermissionState | null;
}

/**
 * Browser geolocation hook.
 *
 * - Requests location only on explicit user action (via requestLocation).
 * - Does not poll or track continuously.
 * - Gracefully handles denial, timeout, and unsupported browsers.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    location: null,
    error: null,
    loading: false,
    permissionState: null,
  });

  // Check if geolocation is supported
  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  // Query permission state (where supported)
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
      setState(prev => ({ ...prev, error: 'UNSUPPORTED' }));
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
        });
      },
      err => {
        let error: GeoError = 'UNAVAILABLE';
        if (err.code === err.PERMISSION_DENIED) error = 'DENIED';
        else if (err.code === err.POSITION_UNAVAILABLE) error = 'UNAVAILABLE';
        else if (err.code === err.TIMEOUT) error = 'TIMEOUT';

        setState({
          location: null,
          error,
          loading: false,
          permissionState: err.code === err.PERMISSION_DENIED ? 'denied' : null,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000, // 5 minutes
      }
    );
  }, [isSupported]);

  const clearLocation = useCallback(() => {
    setState(prev => ({ ...prev, location: null, error: null }));
  }, []);

  return {
    ...state,
    isSupported,
    requestLocation,
    clearLocation,
  };
}

/**
 * Calculate distance in km between two coordinates using the Haversine formula.
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
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
