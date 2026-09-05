export interface VybeLocationPreset {
  id: string;
  label: string;
  country: string;
  lat: number;
  lng: number;
  zoom?: number;
}

export const VYBE_LOCATION_PRESETS: VybeLocationPreset[] = [
  { id: 'algiers', label: 'Algiers', country: 'Algeria', lat: 36.7538, lng: 3.0588, zoom: 12 },
  { id: 'oran', label: 'Oran', country: 'Algeria', lat: 35.6971, lng: -0.6308, zoom: 12 },
  { id: 'constantine', label: 'Constantine', country: 'Algeria', lat: 36.365, lng: 6.6147, zoom: 12 },
  { id: 'annaba', label: 'Annaba', country: 'Algeria', lat: 36.9, lng: 7.7667, zoom: 12 },
  { id: 'blida', label: 'Blida', country: 'Algeria', lat: 36.4701, lng: 2.8277, zoom: 12 },
];

export const DEFAULT_VYBE_LOCATION = VYBE_LOCATION_PRESETS[0];

export function getVybeLocationPreset(id: string | null | undefined) {
  if (!id) return null;
  return VYBE_LOCATION_PRESETS.find((location) => location.id === id) ?? null;
}
