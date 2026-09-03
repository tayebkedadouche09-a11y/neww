/**
 * collectionsService — collections + their items ("My VYBES").
 * RLS: owner writes; world can read public collections.
 */
import { supabase } from '../lib/supabase';
import { Collection } from '../types';
import { DbCollectionItemRow, DbCollectionRow, rowToCollection } from './mappers';

const assertBackend = () => {
  if (!supabase) throw new Error('VYBE backend is not configured');
  return supabase;
};

export const collectionsService = {
  async list(userId: string): Promise<Collection[]> {
    const db = assertBackend();
    const { data, error } = await db
      .from('collections')
      .select('*, collection_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as unknown as Array<DbCollectionRow & { collection_items: DbCollectionItemRow[] | null }>)
      .map(row => rowToCollection(row, row.collection_items ?? []));
  },

  async getPublic(collectionId: string): Promise<Collection | null> {
    const db = assertBackend();
    const { data, error } = await db
      .from('collections')
      .select('*, collection_items(*)')
      .eq('id', collectionId)
      .eq('is_public', true)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as unknown as DbCollectionRow & { collection_items: DbCollectionItemRow[] | null };
    return rowToCollection(row, row.collection_items ?? []);
  },

  async create(col: Collection): Promise<void> {
    const db = assertBackend();
    const { error } = await db.from('collections').insert({
      id: col.id,
      user_id: col.userId,
      name: col.name,
      description: col.description,
      emoji: col.emoji,
      color: col.color,
      is_public: col.isPublic
    });
    if (error) throw error;
  },

  async update(collectionId: string, updates: { name?: string; description?: string; isPublic?: boolean }): Promise<void> {
    const db = assertBackend();
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.isPublic !== undefined) patch.is_public = updates.isPublic;
    const { error } = await db.from('collections').update(patch).eq('id', collectionId);
    if (error) throw error;
  },

  async addPlace(collectionId: string, placeId: string): Promise<void> {
    const db = assertBackend();
    const { error } = await db
      .from('collection_items')
      .upsert(
        { collection_id: collectionId, place_id: placeId },
        { ignoreDuplicates: true, onConflict: 'collection_id,place_id' }
      );
    if (error) throw error;
  },

  async removePlace(collectionId: string, placeId: string): Promise<void> {
    const db = assertBackend();
    const { error } = await db
      .from('collection_items')
      .delete()
      .match({ collection_id: collectionId, place_id: placeId });
    if (error) throw error;
  },

  async remove(collectionId: string): Promise<void> {
    const db = assertBackend();
    const { error } = await db.from('collections').delete().eq('id', collectionId);
    if (error) throw error;
  }
};
