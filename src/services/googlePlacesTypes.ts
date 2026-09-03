import { CategoryType, MoodType } from '../types';

/** Normalized transport shape for the modern Google Places API. */
export interface GooglePlacePhoto {
  photo_reference?: string;
  height: number;
  width: number;
  html_attributions: string[];
  author_attributions?: Array<{ displayName: string; uri?: string; photoUri?: string }>;
}

export interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: { location: { lat: number; lng: number } };
  types?: string[];
  primary_type?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: GooglePlacePhoto[];
  opening_hours?: { open_now?: boolean; weekday_text?: string[] };
  formatted_phone_number?: string;
  website?: string;
  url?: string;
  business_status?: string;
  vicinity?: string;
}

export interface GooglePlacesResponse {
  results: GooglePlaceResult[];
  status: string;
  next_page_token?: string;
  error_message?: string;
}

// Kept only for legacy imports. Canonical mappings now live in categoryTaxonomy.ts.
const GOOGLE_TYPE_TO_CATEGORY: Record<string, CategoryType> = {
  restaurant: 'food-drink', cafe: 'food-drink', bar: 'nightlife', night_club: 'nightlife',
  museum: 'arts-culture', art_gallery: 'arts-culture', park: 'outdoors-nature', zoo: 'outdoors-nature',
  aquarium: 'outdoors-nature', amusement_park: 'entertainment', amusement_center: 'arcade-gaming',
  indoor_playground: 'entertainment', video_arcade: 'arcade-gaming', bowling_alley: 'arcade-gaming',
  movie_theater: 'entertainment', shopping_mall: 'shopping-vintage', store: 'shopping-vintage',
  gym: 'outdoors-nature', spa: 'chill-spots', campground: 'outdoors-nature', tourist_attraction: 'hidden-gems'
};

const GOOGLE_TYPE_TO_MOOD: Record<string, MoodType> = {
  restaurant: 'hungry', cafe: 'chill', bar: 'party', night_club: 'party', museum: 'curious',
  art_gallery: 'creative', park: 'outdoor', zoo: 'explore', aquarium: 'curious', amusement_park: 'energetic',
  amusement_center: 'gaming', indoor_playground: 'energetic', video_arcade: 'gaming', bowling_alley: 'gaming',
  movie_theater: 'chill', shopping_mall: 'explore', store: 'explore', gym: 'energetic', spa: 'lazy',
  campground: 'outdoor', tourist_attraction: 'explore'
};

export { GOOGLE_TYPE_TO_CATEGORY, GOOGLE_TYPE_TO_MOOD };
