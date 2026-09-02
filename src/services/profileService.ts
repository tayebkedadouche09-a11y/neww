/**
 * profileService — profiles + user_preferences.
 * RLS: public read; self write (role escalation blocked at the DB level).
 */
import { supabase } from '../lib/supabase';
import { UserProfile, MoodType } from '../types';

const assertBackend = () => {
  if (!supabase) throw new Error('VYBE backend is not configured');
  return supabase;
};

interface DbProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  vibe_streak_days: number | null;
  role: string;
}

export function rowToUserProfile(row: DbProfileRow, email: string): UserProfile {
  return {
    id: row.id,
    name: row.display_name,
    username: row.username,
    email,
    avatar: row.avatar_url ?? 'https://api.dicebear.com/7.x/bottts/svg?seed=' + row.username,
    bio: row.bio ?? '',
    location: row.location ?? '',
    vibeStreakDays: row.vibe_streak_days ?? 0,
    favoriteMoods: [],
    savedPlaceIds: [],
    likedPlaceIds: [],
    followingUserIds: [],
    followersCount: 0,
    isAdmin: row.role === 'admin'
  };
}

export const profileService = {
  /** Fetch the profile row; returns null when it does not exist yet. */
  async getProfile(userId: string, email: string): Promise<UserProfile | null> {
    const db = assertBackend();
    const { data, error } = await db.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data ? rowToUserProfile(data as DbProfileRow, email) : null;
  },

  /**
   * Fallback profile creation — normally the handle_new_user() trigger already
   * inserted the row on signup; this covers projects where the trigger is absent.
   */
  async ensureProfile(userId: string, email: string, meta?: { displayName?: string; username?: string }): Promise<UserProfile> {
    const db = assertBackend();
    const existing = await this.getProfile(userId, email);
    if (existing) return existing;

    const fallbackName = meta?.displayName || email.split('@')[0];
    const fallbackUsername = (meta?.username || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9_]/g, '');
    const { error } = await db.from('profiles').insert({
      id: userId,
      username: `${fallbackUsername}_${userId.replace(/-/g, '').slice(0, 6)}`,
      display_name: fallbackName,
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${fallbackUsername || userId}`
    });
    if (error) throw error;
    const created = await this.getProfile(userId, email);
    if (!created) throw new Error('Profile creation failed');
    return created;
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const db = assertBackend();
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.display_name = updates.name;
    if (updates.username !== undefined) patch.username = updates.username;
    if (updates.avatar !== undefined) patch.avatar_url = updates.avatar;
    if (updates.bio !== undefined) patch.bio = updates.bio;
    if (updates.location !== undefined) patch.location = updates.location;
    if (Object.keys(patch).length > 0) {
      const { error } = await db.from('profiles').update(patch).eq('id', userId);
      if (error) throw error;
    }
    if (updates.favoriteMoods !== undefined) {
      const { error } = await db.from('user_preferences').upsert(
        { user_id: userId, favorite_moods: updates.favoriteMoods },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
    }
  },

  async getFavoriteMoods(userId: string): Promise<MoodType[]> {
    const db = assertBackend();
    const { data, error } = await db
      .from('user_preferences')
      .select('favorite_moods')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return ((data as { favorite_moods: string[] } | null)?.favorite_moods ?? []) as MoodType[];
  }
};
