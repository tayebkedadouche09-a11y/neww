/**
 * DB row ↔ UI model mappers.
 * The UI consumes rich client types (src/types). Services translate to/from
 * snake_case PostgreSQL rows here — nowhere else.
 */
import { Collection, Place, PlaceOpeningHours, PlaceReview, PlanItem, VybePlan, MoodType, CategoryType, PriceLevel, CompanionType, ProviderType } from '../types';

const DEFAULT_FEATURES: Place['features'] = {
  isFree: false, isOutdoor: false, isIndoor: true, hasFood: false, hasAlcohol: false,
  isLateNight: false, isSecretGem: false, isPetFriendly: false, isWifiFriendly: false,
  isPhotoSpot: false, isAccessible: false
};

const DEFAULT_HOURS: PlaceOpeningHours = {
  monday: 'Closed', tuesday: 'Closed', wednesday: 'Closed', thursday: 'Closed',
  friday: 'Closed', saturday: 'Closed', sunday: 'Closed', isOpenNow: false
};

/** Client-generated UUID used by Supabase UUID primary keys and text interaction rows. */
export const newUuid = (): string => {
  const webCrypto = globalThis.crypto;
  if (webCrypto?.randomUUID) return webCrypto.randomUUID();
  if (webCrypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return [...bytes].map((byte, index) => {
      const hex = byte.toString(16).padStart(2, '0');
      return [4, 6, 8, 10].includes(index) ? `-${hex}` : hex;
    }).join('');
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const r = Math.floor(Math.random() * 16);
    const v = char === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export interface DbPlaceRow {
  id: string;
  external_place_id: string | null;
  provider: string | null;
  name: string;
  tagline: string | null;
  description: string | null;
  category: string;
  primary_mood: string;
  secondary_moods: string[] | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  price_level: string | null;
  approx_cost_usd: number | null;
  rating: number | string | null;
  review_count: number | null;
  base_vybe_score: number | null;
  photos: string[] | null;
  tags: string[] | null;
  estimated_duration: string | null;
  opening_hours: Partial<PlaceOpeningHours> | null;
  features: Partial<Place['features']> | null;
  suitable_for: string[] | null;
  website: string | null;
  phone: string | null;
  instagram: string | null;
  featured: boolean | null;
  trending: boolean | null;
  created_at: string;
}

export function rowToPlace(row: DbPlaceRow): Place {
  return {
    id: row.id,
    provider: (row.provider as ProviderType) ?? 'vybe',
    providerPlaceId: row.external_place_id ?? undefined,
    name: row.name,
    tagline: row.tagline ?? '',
    description: row.description ?? '',
    category: row.category as CategoryType,
    primaryMood: row.primary_mood as MoodType,
    secondaryMoods: (row.secondary_moods ?? []) as MoodType[],
    location: {
      address: row.address ?? '',
      neighborhood: row.neighborhood ?? '',
      city: row.city ?? '',
      lat: row.latitude ?? 0,
      lng: row.longitude ?? 0
    },
    priceLevel: (row.price_level ?? '$$') as PriceLevel,
    approxCostUsd: row.approx_cost_usd ?? 0,
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? 0,
    baseVybeScore: row.base_vybe_score ?? 75,
    images: row.photos ?? [],
    tags: row.tags ?? [],
    estimatedDuration: row.estimated_duration ?? '1h - 2h',
    openingHours: { ...DEFAULT_HOURS, ...(row.opening_hours ?? {}) },
    features: { ...DEFAULT_FEATURES, ...(row.features ?? {}) },
    suitableFor: (row.suitable_for ?? []) as CompanionType[],
    website: row.website ?? undefined,
    phone: row.phone ?? undefined,
    instagram: row.instagram ?? undefined,
    isFeatured: row.featured ?? false,
    isTrending: row.trending ?? false,
    reviews: []
  };
}

export interface DbCollectionRow {
  id: string; user_id: string; name: string; description: string | null;
  emoji: string; color: string; is_public: boolean; created_at: string; updated_at: string;
}

export interface DbCollectionItemRow { id: string; collection_id: string; place_id: string; }

export function rowToCollection(row: DbCollectionRow, items: DbCollectionItemRow[]): Collection {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? '',
    emoji: row.emoji,
    color: row.color,
    isPublic: row.is_public,
    placeIds: items.map(i => i.place_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export interface DbPlanRow {
  id: string; user_id: string; title: string; date: string | null; mood: string | null;
  budget: number | string | null; cover_image: string | null; is_public: boolean; created_at: string;
}

export interface DbPlanItemRow {
  id: string; plan_id: string; place_id: string;
  start_time: string | null; duration: number | null; notes: string | null; sort_order: number | null;
}

export function rowToPlan(row: DbPlanRow, items: DbPlanItemRow[]): VybePlan {
  const planItems: PlanItem[] = (items ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(i => ({
      id: i.id,
      placeId: i.place_id,
      startTime: i.start_time ?? '20:00',
      durationMinutes: i.duration ?? 90,
      customNote: i.notes ?? undefined,
      order: i.sort_order ?? 0
    }));
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    date: row.date ?? 'Upcoming Outing',
    coverImage: row.cover_image ?? undefined,
    mood: (row.mood ?? 'chill') as MoodType,
    targetBudgetUsd: Number(row.budget ?? 50),
    items: planItems,
    isPublic: row.is_public,
    createdAt: row.created_at
  };
}

export interface DbReviewRow {
  id: string;
  user_id: string;
  place_id: string;
  rating: number;
  vibe_intensity: number;
  mood_tags: string[] | null;
  comment: string;
  created_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
}

export function rowToReview(row: DbReviewRow): PlaceReview {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.profiles?.display_name ?? 'VYBE Explorer',
    userAvatar: row.profiles?.avatar_url ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
    rating: row.rating,
    vibeRating: row.vibe_intensity,
    moodTags: (row.mood_tags ?? []) as MoodType[],
    comment: row.comment,
    createdAt: timeAgo(row.created_at),
    likesCount: 0
  };
}
