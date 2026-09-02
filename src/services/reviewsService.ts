/**
 * reviewsService — community vibe reviews.
 * RLS: world read; author writes own rows.
 */
import { supabase } from '../lib/supabase';
import { PlaceReview } from '../types';
import { DbReviewRow, newUuid, rowToReview } from './mappers';

const assertBackend = () => {
  if (!supabase) throw new Error('VYBE backend is not configured');
  return supabase;
};

export interface NewReviewInput {
  placeId: string;
  userId: string;
  rating: number;
  vibeRating: number;
  moodTags: string[];
  comment: string;
  id?: string;
}

export const reviewsService = {
  async create(input: NewReviewInput): Promise<void> {
    const db = assertBackend();
    const { error } = await db.from('reviews').insert({
      id: input.id || newUuid(),
      user_id: input.userId,
      place_id: input.placeId,
      rating: input.rating,
      vibe_intensity: input.vibeRating,
      mood_tags: input.moodTags,
      comment: input.comment
    });
    if (error) throw error;
  },

  async listByPlace(placeId: string): Promise<PlaceReview[]> {
    const db = assertBackend();
    const { data, error } = await db
      .from('reviews')
      .select('*, profiles(display_name, avatar_url)')
      .eq('place_id', placeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as unknown as DbReviewRow[]).map(rowToReview);
  },

  async remove(reviewId: string): Promise<void> {
    const db = assertBackend();
    const { error } = await db.from('reviews').delete().eq('id', reviewId);
    if (error) throw error;
  }
};
