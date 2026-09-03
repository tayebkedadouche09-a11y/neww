import type { Place } from './engine';

type GooglePhoto = {
  url: string;
  author?: string;
  authorUrl?: string;
  mapsUrl?: string;
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  location?: { lat?: () => number; lng?: () => number; lat?: number; lng?: number };
  photos?: Array<{
    getURI: (options?: { maxWidth?: number; maxHeight?: number }) => string;
    authorAttributions?: Array<{ displayName?: string; uri?: string }>;
    googleMapsURI?: string;
  }>;
  googleMapsURI?: string;
};

type PlacesLibrary = {
  Place?: {
    searchByText: (request: Record<string, unknown>) => Promise<{ places?: GooglePlace[] }>;
  };
};

type GoogleWindow = Window & {
  google?: {
    maps?: {
      importLibrary?: (name: string) => Promise<unknown>;
    };
  };
};

let placesPromise: Promise<PlacesLibrary | null> | null = null;

const apiKey = () => String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

function getNumber(value: number | (() => number) | undefined): number | undefined {
  return typeof value === 'function' ? value() : value;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function similarity(a: string, b: string): number {
  const left = normalize(a).split(' ').filter(Boolean);
  const right = new Set(normalize(b).split(' ').filter(Boolean));
  if (!left.length) return 0;
  return left.filter((token) => right.has(token)).length / left.length;
}

async function loadPlacesLibrary(): Promise<PlacesLibrary | null> {
  if (!apiKey()) return null;
  if (placesPromise) return placesPromise;

  placesPromise = (async () => {
    const win = window as GoogleWindow;
    if (!win.google?.maps?.importLibrary) {
      const existing = document.querySelector<HTMLScriptElement>('script[data-vybe-google-places]');
      if (!existing) {
        const script = document.createElement('script');
        script.async = true;
        script.defer = true;
        script.dataset.vybeGooglePlaces = '1';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey())}&loading=async`;
        document.head.appendChild(script);
        await new Promise<void>((resolve, reject) => {
          script.addEventListener('load', () => resolve(), { once: true });
          script.addEventListener('error', () => reject(new Error('Google Places failed to load')), { once: true });
        });
      } else if (!win.google?.maps?.importLibrary) {
        await new Promise<void>((resolve, reject) => {
          const onLoad = () => resolve();
          const onError = () => reject(new Error('Google Places failed to load'));
          existing.addEventListener('load', onLoad, { once: true });
          existing.addEventListener('error', onError, { once: true });
        });
      }
    }

    const importLibrary = (window as GoogleWindow).google?.maps?.importLibrary;
    if (!importLibrary) return null;
    return (await importLibrary('places')) as PlacesLibrary;
  })().catch(() => null);

  return placesPromise;
}

export function googlePhotosEnabled(): boolean {
  return Boolean(apiKey());
}

export async function findGooglePhoto(place: Place): Promise<GooglePhoto | null> {
  const library = await loadPlacesLibrary();
  const SearchPlace = library?.Place;
  if (!SearchPlace) return null;

  try {
    const { places = [] } = await SearchPlace.searchByText({
      textQuery: `${place.name}, ${place.address}, Algérie`,
      fields: ['id', 'displayName', 'location', 'photos', 'googleMapsURI'],
      locationBias: { center: { lat: place.lat, lng: place.lng }, radius: 900 },
      maxResultCount: 3,
      language: 'fr',
      region: 'dz',
    });

    const scored = places
      .map((candidate) => {
        const lat = getNumber(candidate.location?.lat);
        const lng = getNumber(candidate.location?.lng);
        const distance = Number.isFinite(lat) && Number.isFinite(lng)
          ? Math.sqrt((Number(lat) - place.lat) ** 2 + (Number(lng) - place.lng) ** 2)
          : 99;
        const nameScore = similarity(place.name, candidate.displayName?.text || '');
        return { candidate, score: nameScore * 5 - Math.min(distance * 100, 5) };
      })
      .sort((a, b) => b.score - a.score);

    const match = scored[0]?.candidate;
    const photo = match?.photos?.[0];
    if (!match || !photo) return null;

    const attribution = photo.authorAttributions?.[0];
    return {
      url: photo.getURI({ maxWidth: 900, maxHeight: 620 }),
      author: attribution?.displayName,
      authorUrl: attribution?.uri,
      mapsUrl: photo.googleMapsURI || match.googleMapsURI,
    };
  } catch {
    return null;
  }
}
