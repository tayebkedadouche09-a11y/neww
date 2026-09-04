import { Place } from '../types';

export interface GamificationBadge {
  id: string;
  title: string;
  emoji: string;
  description: string;
  threshold: number;
}

export interface GamificationState {
  xp: number;
  visitedPlaceIds: string[];
  checkedInAt: Record<string, string>;
  unlockedBadges: string[];
}

const BADGES: GamificationBadge[] = [
  { id: 'first-discovery', title: 'First Discovery', emoji: '🌟', description: 'Check in to your first real place.', threshold: 1 },
  { id: 'coffee-hunter', title: 'Coffee Hunter', emoji: '☕', description: 'Check in to 5 cafés or coffee spots.', threshold: 5 },
  { id: 'food-explorer', title: 'Food Explorer', emoji: '🍔', description: 'Check in to 5 food spots.', threshold: 5 },
  { id: 'nature-lover', title: 'Nature Lover', emoji: '🌲', description: 'Check in to 3 outdoor spots.', threshold: 3 },
  { id: 'culture-seeker', title: 'Culture Seeker', emoji: '🏛️', description: 'Check in to 3 culture spots.', threshold: 3 },
  { id: 'night-explorer', title: 'Night Explorer', emoji: '🌙', description: 'Check in to 3 nightlife spots.', threshold: 3 },
];

function storageKey(userId: string) { return `vybe:gamification:${userId}`; }
function emptyState(): GamificationState { return { xp: 0, visitedPlaceIds: [], checkedInAt: {}, unlockedBadges: [] }; }

export function getGamificationState(userId?: string | null): GamificationState {
  if (!userId || typeof window === 'undefined') return emptyState();
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<GamificationState>;
    return {
      xp: typeof parsed.xp === 'number' ? Math.max(0, parsed.xp) : 0,
      visitedPlaceIds: Array.isArray(parsed.visitedPlaceIds) ? parsed.visitedPlaceIds.filter(Boolean) : [],
      checkedInAt: parsed.checkedInAt && typeof parsed.checkedInAt === 'object' ? parsed.checkedInAt : {},
      unlockedBadges: Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges.filter(Boolean) : [],
    };
  } catch { return emptyState(); }
}

function saveState(userId: string, state: GamificationState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('vybe:gamification-updated'));
  } catch { /* local storage can be unavailable */ }
}

export function calculateDistanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const earthRadiusKm = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function categoryFamily(place: Place): 'coffee' | 'food' | 'nature' | 'culture' | 'nightlife' | 'other' {
  const canonical = place.canonicalCategory;
  if (canonical === 'cafe') return 'coffee';
  if (canonical === 'restaurant') return 'food';
  if (canonical === 'park' || canonical === 'outdoors') return 'nature';
  if (canonical === 'arts-culture' || canonical === 'library' || canonical === 'worship' || canonical === 'tourist') return 'culture';
  if (canonical === 'nightlife') return 'nightlife';
  const text = `${place.name} ${place.tags.join(' ')}`.toLowerCase();
  if (/cafe|coffee|café|قهوة|مقهى/.test(text)) return 'coffee';
  if (/restaurant|food|pizza|burger|tacos|مطعم|مخبزة/.test(text)) return 'food';
  if (/park|garden|beach|plage|nature|hiking|حديقة/.test(text)) return 'nature';
  if (/museum|gallery|library|mosque|church|culture|متحف|مكتبة|مسجد/.test(text)) return 'culture';
  if (/bar|club|nightlife|karaoke|lounge/.test(text)) return 'nightlife';
  return 'other';
}

function familyOfBadge(badgeId: string): ReturnType<typeof categoryFamily> | null {
  if (badgeId === 'coffee-hunter') return 'coffee';
  if (badgeId === 'food-explorer') return 'food';
  if (badgeId === 'nature-lover') return 'nature';
  if (badgeId === 'culture-seeker') return 'culture';
  if (badgeId === 'night-explorer') return 'nightlife';
  return null;
}

export function levelFromXp(xp: number): number { return Math.max(1, Math.floor(Math.max(0, xp) / 300) + 1); }
export function levelTitle(level: number): string {
  if (level >= 50) return 'Legend';
  if (level >= 20) return 'Local Expert';
  if (level >= 10) return 'Traveler';
  if (level >= 5) return 'Adventurer';
  return 'Explorer';
}
export function badgeDefinitions(): GamificationBadge[] { return BADGES; }

export function checkInPlace(userId: string, place: Place, userLocation: { lat: number; lng: number }, maxDistanceMeters = 500):
  | { ok: true; distanceMeters: number; xpAwarded: number; state: GamificationState; newlyUnlocked: GamificationBadge[] }
  | { ok: false; reason: 'too-far' | 'already-visited' | 'invalid-location'; distanceMeters?: number; state: GamificationState } {
  const state = getGamificationState(userId);
  if (!Number.isFinite(userLocation.lat) || !Number.isFinite(userLocation.lng) || !Number.isFinite(place.location.lat) || !Number.isFinite(place.location.lng)) return { ok: false, reason: 'invalid-location', state };
  if (state.visitedPlaceIds.includes(place.id)) return { ok: false, reason: 'already-visited', state };
  const distanceMeters = Math.round(calculateDistanceKm(userLocation.lat, userLocation.lng, place.location.lat, place.location.lng) * 1000);
  if (distanceMeters > maxDistanceMeters) return { ok: false, reason: 'too-far', distanceMeters, state };

  const visited = [...state.visitedPlaceIds, place.id];
  const checkedInAt = { ...state.checkedInAt, [place.id]: new Date().toISOString() };
  const next: GamificationState = { ...state, xp: state.xp + 50, visitedPlaceIds: visited, checkedInAt };
  const visitedFamilyCounts = new Map<ReturnType<typeof categoryFamily>, number>();
  for (const placeId of visited) {
    if (placeId === place.id) {
      const family = categoryFamily(place);
      visitedFamilyCounts.set(family, (visitedFamilyCounts.get(family) ?? 0) + 1);
      continue;
    }
    // Existing records only contain IDs, so category-specific progress is conservative
    // until those places are reopened and classified by the current discovery model.
  }

  const newlyUnlocked = BADGES.filter(badge => {
    if (next.unlockedBadges.includes(badge.id)) return false;
    if (badge.id === 'first-discovery') return visited.length >= badge.threshold;
    const family = familyOfBadge(badge.id);
    return family !== null && (visitedFamilyCounts.get(family) ?? 0) >= badge.threshold;
  });
  next.unlockedBadges = [...next.unlockedBadges, ...newlyUnlocked.map(badge => badge.id)];
  saveState(userId, next);
  return { ok: true, distanceMeters, xpAwarded: 50, state: next, newlyUnlocked };
}
