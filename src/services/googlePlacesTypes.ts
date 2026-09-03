import { CategoryType, MoodType } from '../types';

/**
 * Normalized shape produced from the modern Google Maps JavaScript Places library.
 * Photo URIs and their attributions are ephemeral and must never be persisted.
 */
export interface GooglePlacePhoto {
  photo_reference?: string;
  height: number;
  width: number;
  html_attributions: string[];
  author_attributions?: Array<{
    displayName: string;
    uri?: string;
    photoUri?: string;
  }>;
}

export interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: GooglePlacePhoto[];
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
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

// Legacy mapping retained only for code that imports these helpers; Google
// discovery itself uses the current Maps JavaScript Place API.
const GOOGLE_TYPE_TO_CATEGORY: Record<string, CategoryType> = {
  restaurant: 'food-drink', cafe: 'food-drink', bar: 'nightlife', night_club: 'nightlife', meal_takeaway: 'food-drink', meal_delivery: 'food-drink', bakery: 'food-drink',
  museum: 'arts-culture', art_gallery: 'arts-culture', park: 'outdoors-nature', zoo: 'outdoors-nature', aquarium: 'outdoors-nature', amusement_park: 'entertainment', bowling_alley: 'entertainment', movie_theater: 'entertainment', casino: 'entertainment', shopping_mall: 'shopping-vintage', store: 'shopping-vintage', clothing_store: 'shopping-vintage', book_store: 'shopping-vintage', gym: 'outdoors-nature', spa: 'chill-spots', campground: 'outdoors-nature', tourist_attraction: 'hidden-gems', point_of_interest: 'hidden-gems', establishment: 'hidden-gems'
};

const GOOGLE_TYPE_TO_MOOD: Record<string, MoodType> = {
  restaurant: 'hungry', cafe: 'chill', bar: 'party', night_club: 'party', bakery: 'hungry', museum: 'curious', art_gallery: 'creative', library: 'lazy', park: 'outdoor', zoo: 'explore', aquarium: 'curious', amusement_park: 'energetic', bowling_alley: 'gaming', movie_theater: 'chill', casino: 'party', shopping_mall: 'explore', store: 'explore', clothing_store: 'explore', book_store: 'curious', gym: 'energetic', spa: 'lazy', campground: 'outdoor', tourist_attraction: 'explore'
};
