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

function emptyState(): GamificationState {
  return { xp: 0, visitedPlaceIds: [], checkedInAt: {}, unlockedBadges: [] };
}

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
  } catch {
    return emptyState();
  }
}

function saveState(userId: string, state: GamificationState) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(storageKey(userId), JSON.stringify(state)); } catch { /* local storage can be unavailable */ }
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

  const next: GamificationState = {
    ...state,
    xp: state.xp + 50,
    visitedPlaceIds: [...state.visitedPlaceIds, place.id],
    checkedInAt: { ...state.checkedInAt, [place.id]: new Date().toISOString() },
  };
  const family = categoryFamily(place);
  const familyCount = next.visitedPlaceIds.filter(id => state.checkedInAt[id] || id === place.id).length;
  const newlyUnlocked = BADGES.filter(b => {
    if (next.unlockedBadges.includes(b.id)) return false;
    if (b.id === 'first-discovery') return next.visitedPlaceIds.length >= b.threshold;
    if (b.id === 'coffee-hunter' || b.id === 'food-explorer' || b.id === 'nature-lover' || b.id === 'culture-seeker' || b.id === 'night-explorer') {
      if (family === 'other') return false;
      const required = b.id.replace('-hunter', '').replace('-explorer', '').replace('-lover', '').replace('-seeker', '').replace('night-', 'night-');
      if (b.id === 'coffee-hunter') return family === 'coffee' && familyCount >= b.threshold;
      if (b.id === 'food-explorer') return family === 'food' && familyCount >= b.threshold;
      if (b.id === 'nature-lover') return family === 'nature' && familyCount >= b.threshold;
      if (b.id === 'culture-seeker') return family === 'culture' && familyCount >= b.threshold;
      if (b.id === 'night-explorer') return family === 'nightlife' && familyCount >= b.threshold;
      return required.length > 0 && familyCount >= b.threshold;
    }
    return false;
  });
  next.unlockedBadges = [...next.unlockedBadges, ...newlyUnlocked.map(b => b.id)];
  saveState(userId, next);
  return { ok: true, distanceMeters, xpAwarded: 50, state: next, newlyUnlocked };
}
