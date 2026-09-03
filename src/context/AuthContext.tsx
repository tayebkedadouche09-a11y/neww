import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { supabase, isBackendConfigured } from '../lib/supabase';
import { dataMode } from '../lib/dataMode';
import { authService, AuthResult } from '../services/authService';
import { profileService } from '../services/profileService';
import { likesService } from '../services/likesService';
import { savedPlacesService } from '../services/savedPlacesService';

export type SessionMode = 'none' | 'auth';
interface AuthSession { userId: string | null; mode: SessionMode; }
const ANONYMOUS_SESSION: AuthSession = { userId: null, mode: 'none' };

interface AuthContextType {
  currentUser: UserProfile | null;
  session: AuthSession;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDemo: boolean;
  isDemoMode: boolean;
  sessionMode: SessionMode;
  appDataMode: typeof dataMode;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, username: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<AuthResult>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  toggleLikePlace: (placeId: string) => void;
  toggleSavePlace: (placeId: string) => void;
  isPlaceLiked: (placeId: string) => boolean;
  isPlaceSaved: (placeId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession>(ANONYMOUS_SESSION);
  const [remoteProfile, setRemoteProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(isBackendConfigured);

  const hydrateRealUser = useCallback(async (userId: string, email: string, meta?: { displayName?: string; username?: string }) => {
    try {
      const profile = await profileService.ensureProfile(userId, email, meta);
      const [savedIds, likedIds, favoriteMoods] = await Promise.all([
        savedPlacesService.listSavedPlaceIds(userId).catch(() => [] as string[]),
        likesService.listLikedPlaceIds(userId).catch(() => [] as string[]),
        profileService.getFavoriteMoods(userId).catch(() => [])
      ]);
      setRemoteProfile({ ...profile, email, savedPlaceIds: savedIds, likedPlaceIds: likedIds, favoriteMoods: favoriteMoods.length ? favoriteMoods : profile.favoriteMoods });
      setSession({ userId, mode: 'auth' });
    } catch (error) {
      console.error('[VYBE auth] profile hydration failed', error);
      setRemoteProfile(null);
      setSession(ANONYMOUS_SESSION);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isBackendConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }
    (async () => {
      try {
        const s = await authService.getSession();
        if (cancelled) return;
        if (s?.user) {
          const meta = s.user.user_metadata as { display_name?: string; username?: string } | undefined;
          await hydrateRealUser(s.user.id, s.user.email ?? '', { displayName: meta?.display_name, username: meta?.username });
        } else {
          setRemoteProfile(null);
          setSession(ANONYMOUS_SESSION);
        }
      } catch (error) {
        console.error('[VYBE auth] session restore failed', error);
        if (!cancelled) setSession(ANONYMOUS_SESSION);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    const unsubscribe = authService.onAuthStateChange((event, signedIn) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT') {
        setRemoteProfile(null);
        setSession(ANONYMOUS_SESSION);
      } else if (signedIn) {
        supabase!.auth.getUser().then(({ data }) => {
          if (!cancelled && data.user) {
            const meta = data.user.user_metadata as { display_name?: string; username?: string } | undefined;
            void hydrateRealUser(data.user.id, data.user.email ?? '', { displayName: meta?.display_name, username: meta?.username });
          }
        }).catch(error => console.error('[VYBE auth] getUser failed', error));
      }
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [hydrateRealUser]);

  const currentUser = useMemo(() => session.mode === 'auth' ? remoteProfile : null, [session.mode, remoteProfile]);
  const realAuthUser = session.mode === 'auth' ? currentUser : null;

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!isBackendConfigured || !supabase) return { ok: false, error: 'VYBE backend is not configured. Configure Supabase before signing in.' };
    const result = await authService.signIn(email, password);
    if (result.ok) {
      const { data } = await supabase.auth.getUser();
      if (data.user) await hydrateRealUser(data.user.id, data.user.email ?? '');
    }
    return result;
  }, [hydrateRealUser]);

  const signUp = useCallback(async (name: string, username: string, email: string, password: string): Promise<AuthResult> => {
    if (!isBackendConfigured || !supabase) return { ok: false, error: 'VYBE backend is not configured. Configure Supabase before creating an account.' };
    const result = await authService.signUp(name, username, email, password);
    if (result.ok && !result.needsEmailConfirmation) {
      const { data } = await supabase.auth.getUser();
      if (data.user) await hydrateRealUser(data.user.id, data.user.email ?? '', { displayName: name, username });
    }
    return result;
  }, [hydrateRealUser]);

  const signOut = useCallback(async () => {
    if (isBackendConfigured && supabase) {
      try { await authService.signOut(); } catch (error) { console.error('[VYBE auth] sign out failed', error); }
    }
    setRemoteProfile(null);
    setSession(ANONYMOUS_SESSION);
  }, []);

  const logout = () => { void signOut(); };
  const resetPassword = useCallback(async (email: string) => {
    if (!isBackendConfigured) return { ok: false, error: 'VYBE backend is not configured.' };
    return authService.resetPassword(email);
  }, []);

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!realAuthUser) return;
    void profileService.updateProfile(realAuthUser.id, updates)
      .then(() => setRemoteProfile(prev => prev ? { ...prev, ...updates } : prev))
      .catch(error => console.error('[VYBE auth] profile update failed', error));
  };

  const toggleLikePlace = (placeId: string) => {
    if (!realAuthUser) return;
    const previous = realAuthUser.likedPlaceIds || [];
    const wasLiked = previous.includes(placeId);
    const nextIds = wasLiked ? previous.filter(id => id !== placeId) : [...previous, placeId];
    setRemoteProfile(prev => prev ? { ...prev, likedPlaceIds: nextIds } : prev);
    void likesService.setLiked(realAuthUser.id, placeId, !wasLiked).catch(error => {
      console.error('[VYBE auth] like sync failed', error);
      setRemoteProfile(prev => prev ? { ...prev, likedPlaceIds: previous } : prev);
    });
  };

  const toggleSavePlace = (placeId: string) => {
    if (!realAuthUser) return;
    const previous = realAuthUser.savedPlaceIds || [];
    const wasSaved = previous.includes(placeId);
    const nextIds = wasSaved ? previous.filter(id => id !== placeId) : [...previous, placeId];
    setRemoteProfile(prev => prev ? { ...prev, savedPlaceIds: nextIds } : prev);
    void savedPlacesService.setSaved(realAuthUser.id, placeId, !wasSaved).catch(error => {
      console.error('[VYBE auth] save sync failed', error);
      setRemoteProfile(prev => prev ? { ...prev, savedPlaceIds: previous } : prev);
    });
  };

  const isPlaceLiked = (placeId: string) => Boolean(currentUser?.likedPlaceIds?.includes(placeId));
  const isPlaceSaved = (placeId: string) => Boolean(currentUser?.savedPlaceIds?.includes(placeId));

  return (
    <AuthContext.Provider value={{
      currentUser,
      session,
      loading: authLoading,
      isAuthenticated: session.mode === 'auth' && !!currentUser,
      isAdmin: currentUser?.isAdmin === true,
      isDemo: false,
      isDemoMode: false,
      sessionMode: session.mode,
      appDataMode: dataMode,
      signIn,
      signUp,
      signOut,
      logout,
      resetPassword,
      updateProfile,
      toggleLikePlace,
      toggleSavePlace,
      isPlaceLiked,
      isPlaceSaved,
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
