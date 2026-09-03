import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { UserProfile } from '../types';
import { supabase, isBackendConfigured } from '../lib/supabase';
import { dataMode, LOCAL_STORAGE_KEYS } from '../lib/dataMode';
import { authService, AuthResult } from '../services/authService';
import { profileService } from '../services/profileService';
import { likesService } from '../services/likesService';
import { savedPlacesService } from '../services/savedPlacesService';

export const DEMO_PROFILES: UserProfile[] = [
  {
    id: 'u-1', name: 'Kai Morgan', username: 'kaivybes', email: 'kai@vybe.app',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    bio: 'Finding the coolest rooftops, underground arcades and matcha spots across the city ⚡', location: 'Metropolis Core',
    vibeStreakDays: 14, favoriteMoods: ['chill', 'gaming', 'creative'], savedPlaceIds: ['place-1', 'place-2', 'place-3', 'place-12'],
    likedPlaceIds: ['place-1', 'place-5', 'place-8'], followingUserIds: ['u-2', 'u-4'], followersCount: 148, isAdmin: true
  },
  {
    id: 'u-2', name: 'Zoe Vance', username: 'zoe_adventures', email: 'zoe@vybe.app',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    bio: 'Photographer & rooftop chaser. Never saying no to a late night taco run 🌮', location: 'East River Arts',
    vibeStreakDays: 9, favoriteMoods: ['explore', 'romantic', 'party'], savedPlaceIds: ['place-1', 'place-4', 'place-18'],
    likedPlaceIds: ['place-1', 'place-4'], followingUserIds: ['u-1'], followersCount: 320, isAdmin: false
  },
  {
    id: 'u-3', name: 'Leo Chen', username: 'leochen_beats', email: 'leo@vybe.app',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    bio: 'Vinyl collector, techno enthusiast and bouldering addict 🧗', location: 'Industrial Canal',
    vibeStreakDays: 21, favoriteMoods: ['music', 'energetic', 'outdoor'], savedPlaceIds: ['place-13', 'place-14', 'place-5'],
    likedPlaceIds: ['place-13', 'place-14'], followingUserIds: ['u-1', 'u-2'], followersCount: 205, isAdmin: false
  }
];

export type SessionMode = 'none' | 'demo' | 'auth';
interface AuthSession { userId: string | null; mode: SessionMode; }
const ANONYMOUS_SESSION: AuthSession = { userId: null, mode: 'none' };
const SESSION_STORAGE_KEY = LOCAL_STORAGE_KEYS.session;

function loadInitialSession(): AuthSession {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AuthSession;
      if (parsed && typeof parsed === 'object' && typeof parsed.userId === 'string' && (parsed.mode === 'demo' || parsed.mode === 'auth')) {
        if (parsed.mode === 'auth' && isBackendConfigured) return ANONYMOUS_SESSION;
        return parsed;
      }
    } catch (e) { console.error('Failed to parse saved session', e); }
  }
  return ANONYMOUS_SESSION;
}

interface AuthContextType {
  currentUser: UserProfile | null; session: AuthSession; loading: boolean; isAuthenticated: boolean; isDemoMode: boolean; isDemo: boolean; isAdmin: boolean; sessionMode: SessionMode; appDataMode: typeof dataMode; profiles: UserProfile[];
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, username: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>; resetPassword: (email: string) => Promise<AuthResult>;
  login: (email: string, password?: string) => boolean; register: (name: string, username: string, email: string) => boolean; logout: () => void; switchProfile: (profileId: string) => void; updateProfile: (updates: Partial<UserProfile>) => void;
  enterDemoMode: (email?: string) => boolean; toggleLikePlace: (placeId: string) => void; toggleSavePlace: (placeId: string) => void; isPlaceLiked: (placeId: string) => boolean; isPlaceSaved: (placeId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.profiles);
    if (saved) { try { return JSON.parse(saved); } catch (e) { console.error('Failed to parse saved profiles', e); } }
    return DEMO_PROFILES;
  });
  const [session, setSession] = useState<AuthSession>(loadInitialSession);
  const [remoteProfile, setRemoteProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(isBackendConfigured);

  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEYS.profiles, JSON.stringify(profiles)); }, [profiles]);
  useEffect(() => { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)); }, [session]);

  const hydrateRealUser = useCallback(async (userId: string, email: string, meta?: { displayName?: string; username?: string }) => {
    try {
      const profile = await profileService.ensureProfile(userId, email, meta);
      const [savedIds, likedIds, favMoods] = await Promise.all([
        savedPlacesService.listSavedPlaceIds(userId).catch(() => [] as string[]),
        likesService.listLikedPlaceIds(userId).catch(() => [] as string[]),
        profileService.getFavoriteMoods(userId).catch(() => [])
      ]);
      const full: UserProfile = { ...profile, email, savedPlaceIds: savedIds, likedPlaceIds: likedIds, favoriteMoods: favMoods.length > 0 ? favMoods : profile.favoriteMoods };
      setRemoteProfile(full);
      setSession({ userId, mode: 'auth' });
    } catch (e) { console.error('Failed to load profile from backend', e); }
    finally { setAuthLoading(false); }
  }, []);

  useEffect(() => {
    if (!isBackendConfigured || !supabase) { setAuthLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const s = await authService.getSession();
        if (cancelled) return;
        if (s?.user) {
          const meta = s.user.user_metadata as { display_name?: string; username?: string } | undefined;
          await hydrateRealUser(s.user.id, s.user.email ?? '', { displayName: meta?.display_name, username: meta?.username });
        } else setSession(prev => (prev.mode === 'auth' ? ANONYMOUS_SESSION : prev));
      } catch (e) { console.error('Session restore failed', e); }
      finally { if (!cancelled) setAuthLoading(false); }
    })();
    const unsubscribe = authService.onAuthStateChange((event, signedIn) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT') { setRemoteProfile(null); setSession(ANONYMOUS_SESSION); }
      else if (signedIn) {
        supabase!.auth.getUser().then(({ data }) => {
          if (!cancelled && data.user) {
            const meta = data.user.user_metadata as { display_name?: string; username?: string } | undefined;
            void hydrateRealUser(data.user.id, data.user.email ?? '', { displayName: meta?.display_name, username: meta?.username });
          }
        }).catch(e => console.error('getUser failed', e));
      }
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [hydrateRealUser]);

  const currentUser = useMemo<UserProfile | null>(() => {
    if (session.mode === 'demo') return profiles.find(p => p.id === session.userId) || null;
    if (session.mode === 'auth') return isBackendConfigured ? remoteProfile : profiles.find(p => p.id === session.userId) || null;
    return null;
  }, [session, profiles, remoteProfile]);

  const isDemoMode = session.mode === 'demo';
  const realAuthUser = isBackendConfigured && session.mode === 'auth' ? currentUser : null;
  const persistSession = (nextSession: AuthSession) => setSession(nextSession);

  const login = (email: string, _password?: string) => {
    if (isBackendConfigured) return false;
    if (!email) return false;
    const found = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (found) { persistSession({ userId: found.id, mode: 'auth' }); return true; }
    const newUser: UserProfile = { id: `u-${Date.now()}`, name: email.split('@')[0], username: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_'), email, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', bio: 'New to VYBE and discovering cool spots!', location: 'Metropolis', vibeStreakDays: 1, favoriteMoods: ['chill', 'hungry'], savedPlaceIds: [], likedPlaceIds: [], followingUserIds: [], followersCount: 0, isAdmin: false };
    setProfiles(prev => [newUser, ...prev]); persistSession({ userId: newUser.id, mode: 'auth' }); return true;
  };

  const register = (name: string, username: string, email: string) => {
    if (isBackendConfigured) return false;
    const newUser: UserProfile = { id: `u-${Date.now()}`, name, username: username.toLowerCase().replace(/[^a-z0-9_]/g, ''), email, avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`, bio: 'Excited to find my next vibe!', location: 'Metropolis', vibeStreakDays: 1, favoriteMoods: ['energetic', 'creative'], savedPlaceIds: [], likedPlaceIds: [], followingUserIds: [], followersCount: 0, isAdmin: false };
    setProfiles(prev => [newUser, ...prev]); persistSession({ userId: newUser.id, mode: 'auth' }); return true;
  };

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!isBackendConfigured || !supabase) return login(email) ? { ok: true } : { ok: false, error: 'Account not found — try demo mode.' };
    const res = await authService.signIn(email, password);
    if (res.ok) { const { data } = await supabase.auth.getUser(); if (data.user) await hydrateRealUser(data.user.id, data.user.email ?? ''); }
    return res;
  }, [hydrateRealUser, profiles]);

  const signUp = useCallback(async (name: string, username: string, email: string, password: string): Promise<AuthResult> => {
    if (!isBackendConfigured || !supabase) return register(name, username, email) ? { ok: true } : { ok: false, error: 'Registration failed' };
    const res = await authService.signUp(name, username, email, password);
    if (res.ok && !res.needsEmailConfirmation) { const { data } = await supabase.auth.getUser(); if (data.user) await hydrateRealUser(data.user.id, data.user.email ?? '', { displayName: name, username }); }
    return res;
  }, [hydrateRealUser, profiles]);

  const signOut = useCallback(async () => { if (isBackendConfigured && supabase) { try { await authService.signOut(); } catch (e) { console.error('Sign out failed', e); } } setRemoteProfile(null); setSession(ANONYMOUS_SESSION); }, []);
  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => { if (!isBackendConfigured) return { ok: true }; return authService.resetPassword(email); }, []);
  const logout = () => { void signOut(); };

  const enterDemoMode = (email?: string) => {
    let target: UserProfile | undefined;
    if (email) target = profiles.find(p => p.email.toLowerCase() === email.toLowerCase()); else target = profiles.find(p => p.id === DEMO_PROFILES[0].id) || DEMO_PROFILES[0];
    if (!target) return false; persistSession({ userId: target.id, mode: 'demo' }); return true;
  };

  const switchProfile = (profileId: string) => { const found = profiles.find(p => p.id === profileId); if (found && session.userId && session.mode !== 'auth') persistSession({ userId: found.id, mode: session.mode }); };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    if (session.mode === 'demo' || !isBackendConfigured) setProfiles(prev => prev.map(p => (p.id === currentUser.id ? { ...p, ...updates } : p)));
    if (realAuthUser) {
      void profileService.updateProfile(currentUser.id, updates).catch(e => console.error('Profile update sync failed', e));
      setRemoteProfile(prev => (prev ? { ...prev, ...updates } : prev));
    }
  };

  const toggleLikePlace = (placeId: string) => {
    if (!currentUser) return;
    const previous = currentUser.likedPlaceIds || [];
    const wasLiked = previous.includes(placeId);
    const nextIds = wasLiked ? previous.filter(id => id !== placeId) : [...previous, placeId];
    updateProfile({ likedPlaceIds: nextIds });
    if (realAuthUser) {
      void likesService.setLiked(currentUser.id, placeId, !wasLiked).catch(e => {
        console.error('Like sync failed', e);
        setRemoteProfile(prev => prev ? { ...prev, likedPlaceIds: previous } : prev);
      });
    }
  };

  const toggleSavePlace = (placeId: string) => {
    if (!currentUser) return;
    const previous = currentUser.savedPlaceIds || [];
    const wasSaved = previous.includes(placeId);
    const nextIds = wasSaved ? previous.filter(id => id !== placeId) : [...previous, placeId];
    updateProfile({ savedPlaceIds: nextIds });
    if (realAuthUser) {
      void savedPlacesService.setSaved(currentUser.id, placeId, !wasSaved).catch(e => {
        console.error('Save sync failed', e);
        setRemoteProfile(prev => prev ? { ...prev, savedPlaceIds: previous } : prev);
      });
    }
  };

  const isPlaceLiked = (placeId: string) => currentUser?.likedPlaceIds?.includes(placeId) || false;
  const isPlaceSaved = (placeId: string) => currentUser?.savedPlaceIds?.includes(placeId) || false;

  return (
    <AuthContext.Provider value={{
      currentUser, session, loading: authLoading, isAuthenticated: session.mode === 'auth' && !!currentUser, isDemoMode, isDemo: isDemoMode,
      isAdmin: currentUser?.isAdmin === true, sessionMode: session.mode, appDataMode: dataMode, profiles,
      signIn, signUp, signOut, resetPassword, login, register, logout, switchProfile, updateProfile, enterDemoMode,
      toggleLikePlace, toggleSavePlace, isPlaceLiked, isPlaceSaved
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};