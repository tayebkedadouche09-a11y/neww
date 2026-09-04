/**
 * savedPlacesService — per-user "My VYBES" bookmarks.
 * RLS: strictly per-user rows (unique (user_id, place_id)).
 */
import { supabase } from '../lib/supabase';
import { newUuid } from './mappers';
import { ensureGooglePlaceStored } from './placesService';

const assertBackend = () => {
  if (!supabase) throw new Error('VYBE backend is not configured');
  return supabase;
};

export const savedPlacesService = {
  async setSaved(userId: string, placeId: string, saved: boolean): Promise<void> {
    const db = assertBackend();
    if (saved) {
      await ensureGooglePlaceStored(placeId);
      const { error } = await db.from('saved_places').upsert(
        { id: newUuid(), user_id: userId, place_id: placeId },
        { ignoreDuplicates: true, onConflict: 'user_id,place_id' }
      );
      if (error) {
        const errorStatus = (error as typeof error & { status?: number }).status;
        if (error.code === '23505' || errorStatus === 409) {
          const { data: existing, error: lookupError } = await db
            .from('saved_places')
            .select('id')
            .eq('user_id', userId)
            .eq('place_id', placeId)
            .maybeSingle();
          if (!lookupError && existing?.id) return;
        }
        throw error;
      }
    } else {
      const { error } = await db.from('saved_places').delete().match({ user_id: userId, place_id: placeId });
      if (error) throw error;
    }
  },

  async listSavedPlaceIds(userId: string): Promise<string[]> {
    const db = assertBackend();
    const { data, error } = await db.from('saved_places').select('place_id').eq('user_id', userId);
    if (error) throw error;
    return (data as Array<{ place_id: string }>).map(r => r.place_id);
  }
};
