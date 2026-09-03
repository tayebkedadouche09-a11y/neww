/**
 * likesService — community "like" toggles per place.
 * RLS: strictly per-user rows (unique (user_id, place_id)).
 */
import { supabase } from '../lib/supabase';
import { newUuid } from './mappers';

const assertBackend = () => {
  if (!supabase) throw new Error('VYBE backend is not configured');
  return supabase;
};

export const likesService = {
  async setLiked(userId: string, placeId: string, liked: boolean): Promise<void> {
    const db = assertBackend();
    if (liked) {
      const { error } = await db.from('likes').upsert(
        { id: newUuid(), user_id: userId, place_id: placeId },
        { ignoreDuplicates: true, onConflict: 'user_id,place_id' }
      );
      if (error) throw error;
    } else {
      const { error } = await db.from('likes').delete().match({ user_id: userId, place_id: placeId });
      if (error) throw error;
    }
  },

  async listLikedPlaceIds(userId: string): Promise<string[]> {
    const db = assertBackend();
    const { data, error } = await db.from('likes').select('place_id').eq('user_id', userId);
    if (error) throw error;
    return (data as Array<{ place_id: string }>).map(r => r.place_id);
  }
};
