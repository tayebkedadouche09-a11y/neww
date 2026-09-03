/**
 * Google Maps JavaScript API — Singleton async loader.
 *
 * Loads the Maps JavaScript API once, then imports the maps and marker
 * libraries through Google's modern importLibrary API.
 */

import { googleMapsConfig } from './env';

const SCRIPT_SELECTOR = 'script[data-google-maps="true"]';
const IMPORT_LIBRARY_TIMEOUT_MS = 15000;
const SCRIPT_TIMEOUT_MS = 30000;

declare global {
  interface Window {
    google?: typeof google;
    gm_authFailure?: () => void;
    __googleMapsLoaderPromise?: Promise<{
      Map: typeof google.maps.Map;
      AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
    }>;
  }
}

export function isGoogleMapsLoaded(): boolean {
  return Boolean(window.google?.maps && (window.google.maps as any).__librariesLoaded);
}

function buildScriptUrl(): { url: string; redactedUrl: string } {
  const apiKey = googleMapsConfig.apiKey || '';
  const url = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;
  const redactedUrl = 'https://maps.googleapis.com/maps/api/js?key=REDACTED&loading=async';
  return { url, redactedUrl };
}

function waitForImportLibrary(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof (window.google?.maps as any)?.importLibrary === 'function') { resolve(); return; }
    const start = Date.now();
    const interval = window.setInterval(() => {
      if (typeof (window.google?.maps as any)?.importLibrary === 'function') {
        window.clearInterval(interval); resolve(); return;
      }
      if (Date.now() - start >= timeoutMs) {
        window.clearInterval(interval);
        reject(new Error(`Timed out waiting for google.maps.importLibrary after ${timeoutMs}ms`));
      }
    }, 50);
  });
}

async function finalize(): Promise<{ Map: typeof google.maps.Map; AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement }> {
  console.log('[GoogleMapsLoader] Waiting for importLibrary...');
  await waitForImportLibrary(IMPORT_LIBRARY_TIMEOUT_MS);
  console.log('[GoogleMapsLoader] importLibrary("maps") started');
  const mapsLib = (await window.google!.maps.importLibrary('maps')) as google.maps.MapsLibrary;
  console.log('[GoogleMapsLoader] importLibrary("maps") resolved');
  console.log('[GoogleMapsLoader] importLibrary("marker") started');
  const markerLib = (await window.google!.maps.importLibrary('marker')) as google.maps.MarkerLibrary;
  console.log('[GoogleMapsLoader] importLibrary("marker") resolved');
  (window.google!.maps as any).__librariesLoaded = true;
  return { Map: mapsLib.Map, AdvancedMarkerElement: markerLib.AdvancedMarkerElement };
}

export function loadGoogleMaps(): Promise<{ Map: typeof google.maps.Map; AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement }> {
  if (isGoogleMapsLoaded()) return Promise.resolve({ Map: window.google!.maps.Map, AdvancedMarkerElement: (window.google!.maps as any).marker.AdvancedMarkerElement });
  if (window.__googleMapsLoaderPromise) return window.__googleMapsLoaderPromise;

  window.__googleMapsLoaderPromise = new Promise((resolve, reject) => {
    if (!googleMapsConfig.apiKey) {
      reject(new Error('Google Maps API key is not configured. Set VITE_GOOGLE_MAPS_API_KEY in the deployment environment.'));
      return;
    }

    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      window.__googleMapsLoaderPromise = undefined;
      previousAuthFailure?.();
      reject(new Error('Google Maps authentication failed. Falling back to the alternative map provider.'));
    };

    const existing = document.querySelector(SCRIPT_SELECTOR) as HTMLScriptElement | null;
    const runFinalize = () => finalize().then(resolve).catch(error => { window.__googleMapsLoaderPromise = undefined; reject(error); });

    if (existing) {
      if (typeof (window.google?.maps as any)?.importLibrary === 'function') { runFinalize(); return; }
      const onload = () => runFinalize();
      const onerror = () => { window.__googleMapsLoaderPromise = undefined; reject(new Error('Failed to load the existing Google Maps script.')); };
      existing.addEventListener('load', onload, { once: true });
      existing.addEventListener('error', onerror, { once: true });
      window.setTimeout(() => {
        existing.removeEventListener('load', onload); existing.removeEventListener('error', onerror);
        if (window.__googleMapsLoaderPromise) { window.__googleMapsLoaderPromise = undefined; reject(new Error(`Existing Google Maps script did not initialize within ${SCRIPT_TIMEOUT_MS}ms.`)); }
      }, SCRIPT_TIMEOUT_MS);
      return;
    }

    const { url, redactedUrl } = buildScriptUrl();
    console.log('[GoogleMapsLoader] Loading Google Maps from:', redactedUrl);
    const script = document.createElement('script');
    script.dataset.googleMaps = 'true'; script.src = url; script.async = true;
    const timeoutId = window.setTimeout(() => { window.__googleMapsLoaderPromise = undefined; script.remove(); reject(new Error(`Google Maps script load timed out after ${SCRIPT_TIMEOUT_MS}ms. Check API key, network connectivity, and restrictions.`)); }, SCRIPT_TIMEOUT_MS);
    script.addEventListener('load', () => { window.clearTimeout(timeoutId); console.log('[GoogleMapsLoader] Script loaded, importing libraries...'); runFinalize(); }, { once: true });
    script.addEventListener('error', () => {
      window.clearTimeout(timeoutId); window.__googleMapsLoaderPromise = undefined;
      reject(new Error(`Failed to load Google Maps script. Check API key restrictions, Maps JavaScript API, network, or firewall. URL: ${redactedUrl}`));
    }, { once: true });
    document.head.appendChild(script);
  });
  return window.__googleMapsLoaderPromise;
}
