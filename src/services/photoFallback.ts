import type { Place, VybeCategory } from '../types';

/**
 * High-quality fallback photos so Explore cards never look empty.
 * Used when Google Places Photos are unavailable (search returns 0 photos,
 * or GetPlace quota is exhausted).
 *
 * Images are from Unsplash (hotlink-friendly source URLs).
 */
const BY_CATEGORY: Record<string, string[]> = {
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=750&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=750&fit=crop&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=750&fit=crop&q=80',
  ],
  cafe: [
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&h=750&fit=crop&q=80',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&h=750&fit=crop&q=80',
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1200&h=750&fit=crop&q=80',
  ],
  park: [
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=750&fit=crop&q=80',
    'https://images.unsplash.com/photo-1501785888041-af3bb730f19c?w=1200&h=750&fit=crop&q=80',
  ],
  outdoors: [
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=750&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&h=750&fit=crop&q=80',
  ],
  tourist: [
    'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1200&h=750&fit=crop&q=80',
    'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1200&h=750&fit=crop&q=80',
  ],
  'arts-culture': [
    'https://images.unsplash.com/photo-1566127444979-b20d8d07b2f0?w=1200&h=750&fit=crop&q=80',
    'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=1200&h=750&fit=crop&q=80',
  ],
  museum: [
    'https://images.unsplash.com/photo-1566127444979-b20d8d07b2f0?w=1200&h=750&fit=crop&q=80',
  ],
  nightlife: [
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&h=750&fit=crop&q=80',
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1200&h=750&fit=crop&q=80',
  ],
  hotel: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=750&fit=crop&q=80',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&h=750&fit=crop&q=80',
  ],
  gym: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=750&fit=crop&q=80',
  ],
  shopping: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=750&fit=crop&q=80',
  ],
  cinema: [
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&h=750&fit=crop&q=80',
  ],
  library: [
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1200&h=750&fit=crop&q=80',
  ],
  worship: [
    'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=1200&h=750&fit=crop&q=80',
  ],
  games: [
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&h=750&fit=crop&q=80',
  ],
  entertainment: [
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=750&fit=crop&q=80',
  ],
  wellness: [
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&h=750&fit=crop&q=80',
  ],
  'family-kids': [
    'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=1200&h=750&fit=crop&q=80',
  ],
};

const DEFAULT_PHOTOS = [
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=750&fit=crop&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&h=750&fit=crop&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&h=750&fit=crop&q=80',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getCategoryFallbackPhoto(
  category?: VybeCategory | string | null,
  seed?: string
): string {
  const key = (category || '').toLowerCase();
  const pool = BY_CATEGORY[key] || DEFAULT_PHOTOS;
  const idx = seed ? hashString(seed) % pool.length : 0;
  return pool[idx];
}

/** Prefer real Google images; otherwise a stable category photo. */
export function resolvePlaceImages(place: Place): string[] {
  const real = (place.images || []).filter(u => typeof u === 'string' && u.trim().length > 8);
  if (real.length) return real;
  return [getCategoryFallbackPhoto(place.canonicalCategory || place.category, place.id || place.name)];
}
