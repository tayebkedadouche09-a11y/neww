/**
 * Google Maps JavaScript API — Singleton async loader.
 *
 * Uses Google's official dynamic library import pattern:
 *   1. Load the API script with loading=async.
 *   2. Wait for google.maps.importLibrary to be provided by the API.
 *   3. importLibrary("maps") returns the Map class.
 *   4. importLibrary("marker") returns AdvancedMarkerElement.
 *
 * This loader is:
 *  - Singleton: the API script is injected at most once.
 *  - React StrictMode safe: concurrent callers share the same promise.
 *  - Vite HMR safe: duplicate mount/unmount cycles don't re-inject the script.
 */

import { googleMapsConfig } from './env';

const SCRIPT_SELECTOR = 'script[data-google-maps="true"]';

declare global {
  interface Window {
    google?: typeof google;
    __googleMapsLoaderPromise?: Promise<{
      Map: typeof google.maps.Map;
      AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
    }>;
  }
}

/** Returns true when both the maps and marker libraries are available. */
export function isGoogleMapsLoaded(): boolean {
  return Boolean(
    window.google?.maps &&
      (window.google.maps as any).__librariesLoaded
  );
}

/** Builds the script URL. Returns both the real URL and a redacted version. */
function buildScriptUrl(): { url: string; redactedUrl: string } {
  const apiKey = googleMapsConfig.apiKey || '';
  const url =
    `https://maps.googleapis.com/maps/api/js` +
    `?key=${encodeURIComponent(apiKey)}` +
    `&loading=async`;
  const redactedUrl =
    `https://maps.googleapis.com/maps/api/js` +
    `?key=REDACTED` +
    `&loading=async`;
  return { url, redactedUrl };
}

/**
 * Waits for google.maps.importLibrary to be available.
 * The API sets this up during its asynchronous initialization.
 */
function waitForImportLibrary(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof (window.google?.maps as any)?.importLibrary === 'function') {
      resolve();
      return;
    }

    const start = Date.now();
    const interval = setInterval(() => {
      if (typeof (window.google?.maps as any)?.importLibrary === 'function') {
        clearInterval(interval);
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(
          new Error(
            `Timed out waiting for google.maps.importLibrary after ${timeoutMs}ms`
          )
        );
      }
    }, 50);
  });
}

/**
 * Resolves once the Maps JavaScript API and both the "maps" and "marker"
 * libraries are available. Reuses an in-flight or completed load when one
 * exists.
 */
export function loadGoogleMaps(): Promise<{
  Map: typeof google.maps.Map;
  AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
}> {
  if (isGoogleMapsLoaded()) {
    return Promise.resolve({
      Map: window.google!.maps.Map,
      AdvancedMarkerElement: (window.google!.maps as any).marker
        .AdvancedMarkerElement,
    });
  }

  if (window.__googleMapsLoaderPromise) {
    return window.__googleMapsLoaderPromise;
  }

  window.__googleMapsLoaderPromise = new Promise((resolve, reject) => {
    if (isGoogleMapsLoaded()) {
      resolve({
        Map: window.google!.maps.Map,
        AdvancedMarkerElement: (window.google!.maps as any).marker
          .AdvancedMarkerElement,
      });
      return;
    }

    const existing = document.querySelector(SCRIPT_SELECTOR) as
      | HTMLScriptElement
      | null;

    const finalize = async () => {
      try {
        console.log('[GoogleMapsLoader] Waiting for importLibrary...');
        await waitForImportLibrary(15000);

        console.log('[GoogleMapsLoader] importLibrary("maps") started');
        const mapsLib = (await window.google!.maps.importLibrary(
          'maps'
        )) as google.maps.MapsLibrary;
        console.log('[GoogleMapsLoader] importLibrary("maps") resolved');

        console.log('[GoogleMapsLoader] importLibrary("marker") started');
        const markerLib = (await window.google!.maps.importLibrary(
          'marker'
        )) as google.maps.MarkerLibrary;
        console.log('[GoogleMapsLoader] importLibrary("marker") resolved');

        (window.google!.maps as any).__librariesLoaded = true;

        resolve({
          Map: mapsLib.Map,
          AdvancedMarkerElement: markerLib.AdvancedMarkerElement,
        });
      } catch (err) {
        window.__googleMapsLoaderPromise = undefined;
        reject(err);
      }
    };

    if (existing) {
      const onload = () => {
        finalize().catch((err) => {
          console.error('[GoogleMapsLoader] Error finalizing existing script:', err);
        });
      };
      const onerror = () => {
        window.__googleMapsLoaderPromise = undefined;
        reject(new Error('Failed to load Google Maps script from existing tag'));
      };

      existing.addEventListener('load', onload, { once: true });
      existing.addEventListener('error', onerror, { once: true });
      return;
    }

    if (!googleMapsConfig.apiKey) {
      reject(new Error('Google Maps API key is not configured'));
      return;
    }

    const { redactedUrl } = buildScriptUrl();
    console.log('[GoogleMapsLoader] Loading Google Maps from:', redactedUrl);

    const script = document.createElement('script');
    script.dataset.googleMaps = 'true';
    const { url } = buildScriptUrl();
    script.src = url;
    script.async = true;

    const timeoutMs = 30000;
    const timeoutId = setTimeout(() => {
      window.__googleMapsLoaderPromise = undefined;
      reject(
        new Error(
          `Google Maps script load timed out after ${timeoutMs}ms. ` +
            'Check network connectivity and firewall/proxy settings.'
        )
      );
    }, timeoutMs);

    script.addEventListener('load', () => {
      clearTimeout(timeoutId);
      console.log('[GoogleMapsLoader] Script loaded, importing libraries...');
      finalize().catch((err) => {
        console.error('[GoogleMapsLoader] Library import error:', err);
      });
    }, { once: true });

    script.addEventListener('error', () => {
      clearTimeout(timeoutId);
      window.__googleMapsLoaderPromise = undefined;

      let errorMessage = 'Failed to load Google Maps script. ';
      if (!navigator.onLine) {
        errorMessage += 'Browser is offline. ';
      } else {
        errorMessage +=
          'Possible causes: network issue, firewall/proxy blocking maps.googleapis.com, ' +
          'invalid API key, or API key restrictions. ';
      }
      errorMessage += `URL: ${redactedUrl}`;

      reject(new Error(errorMessage));
    }, { once: true });

    document.head.appendChild(script);
  });

  return window.__googleMapsLoaderPromise;
}
