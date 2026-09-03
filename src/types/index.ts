export type MoodType = 
  | 'energetic' 
  | 'chill' 
  | 'romantic' 
  | 'creative' 
  | 'party' 
  | 'curious' 
  | 'hungry' 
  | 'outdoor' 
  | 'gaming' 
  | 'music' 
  | 'explore' 
  | 'lazy';

export interface MoodItem {
  id: MoodType;
  label: string;
  emoji: string;
  tagline: string;
  accentColor: string; // hex
  secondaryColor: string;
  bgGlow: string;
  description: string;
}

export type PriceLevel = 'free' | '$' | '$$' | '$$$' | '$$$$';

export type TimeDuration = '15min' | '30min' | '1h' | '2h' | '3h+' | 'all-day';

export type CompanionType = 'solo' | 'friends' | 'couple' | 'family' | 'group';

export type CategoryType = 
  | 'food-drink' 
  | 'nightlife' 
  | 'arts-culture' 
  | 'outdoors-nature' 
  | 'entertainment' 
  | 'arcade-gaming' 
  | 'hidden-gems' 
  | 'chill-spots' 
  | 'shopping-vintage';

export interface PlaceReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number; // 1-5
  vibeRating: number; // percentage 0-100
  moodTags: MoodType[];
  comment: string;
  createdAt: string;
  images?: string[];
  likesCount: number;
}

export interface PlaceOpeningHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  isOpenNow?: boolean;
}

export interface PlacePhotoAttribution {
  displayName: string;
  uri?: string;
}

export type ProviderType = 'vybe' | 'google';

export interface Place {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: CategoryType;
  primaryMood: MoodType;
  secondaryMoods: MoodType[];
  location: {
    address: string;
    neighborhood: string;
    city: string;
    lat: number;
    lng: number;
  };
  distanceKm?: number; // dynamic or default
  priceLevel: PriceLevel;
  approxCostUsd: number;
  rating: number; // e.g. 4.8
  reviewCount: number;
  baseVybeScore: number; // 85-99
  images: string[];
  /** Fresh, in-memory Google photo attribution metadata. Never persisted. */
  photoAttributions?: PlacePhotoAttribution[];
  tags: string[];
  estimatedDuration: string; // e.g. "1.5h - 2h"
  openingHours: PlaceOpeningHours;
  features: {
    isFree: boolean;
    isOutdoor: boolean;
    isIndoor: boolean;
    hasFood: boolean;
    hasAlcohol: boolean;
    isLateNight: boolean;
    isSecretGem: boolean;
    isPetFriendly: boolean;
    isWifiFriendly: boolean;
    isPhotoSpot: boolean;
    isAccessible: boolean;
  };
  suitableFor: CompanionType[];
  website?: string;
  phone?: string;
  instagram?: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  reviews: PlaceReview[];
  provider?: ProviderType;
  providerPlaceId?: string;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  isPublic: boolean;
  placeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PlanItem {
  id: string;
  placeId: string;
  startTime: string; // e.g. "19:00"
  durationMinutes: number;
  customNote?: string;
  order: number;
}

export interface VybePlan {
  id: string;
  userId: string;
  title: string;
  date: string;
  coverImage?: string;
  mood: MoodType;
  targetBudgetUsd: number;
  items: PlanItem[];
  isPublic: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  location: string;
  vibeStreakDays: number;
  favoriteMoods: MoodType[];
  savedPlaceIds: string[];
  likedPlaceIds: string[];
  followingUserIds: string[];
  followersCount: number;
  isAdmin?: boolean;
}

export interface FilterState {
  searchQuery: string;
  moods: MoodType[];
  categories: CategoryType[];
  priceLevels: PriceLevel[];
  maxBudget?: number;
  maxDistanceKm?: number;
  duration?: TimeDuration;
  companion?: CompanionType;
  onlyOpenNow: boolean;
  onlyFree: boolean;
  onlyHiddenGems: boolean;
  onlyLateNight: boolean;
  sortBy: 'vybe-score' | 'rating' | 'distance' | 'price-asc' | 'trending';
}
