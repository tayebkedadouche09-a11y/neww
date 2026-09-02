/**
 * authService — thin, typed wrapper over Supabase Auth.
 * The AuthContext is the single source of truth for auth STATE; this module is
 * the single source of truth for auth NETWORK calls.
 */
import { supabase } from '../lib/supabase';
import { getSiteUrl } from '../lib/env';

const assertBackend = () => {
  if (!supabase) throw new Error('VYBE backend is not configured');
  return supabase;
};

export interface AuthResult {
  ok: boolean;
  error?: string;
  needsEmailConfirmation?: boolean;
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Wrong email or password.';
  if (m.includes('user already registered')) return 'An account with this email already exists.';
  if (m.includes('password should be at least')) return 'Password must be at least 6 characters.';
  if (m.includes('rate limit')) return 'Too many attempts — please wait a moment.';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'That email address looks invalid.';
  return message;
}

export const authService = {
  async getSession() {
    const db = assertBackend();
    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  onAuthStateChange(callback: (event: string, signedIn: boolean) => void) {
    const db = assertBackend();
    const { data } = db.auth.onAuthStateChange(event => {
      const signedIn = event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED';
      callback(event, signedIn);
    });
    return () => data.subscription.unsubscribe();
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const db = assertBackend();
      const { error } = await db.auth.signInWithPassword({ email, password });
      return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true };
    } catch (e) {
      return { ok: false, error: friendlyAuthError(e instanceof Error ? e.message : 'Sign in failed') };
    }
  },

  async signUp(name: string, username: string, email: string, password: string): Promise<AuthResult> {
    try {
      const db = assertBackend();
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name, username },
          emailRedirectTo: getSiteUrl()
        }
      });
      if (error) return { ok: false, error: friendlyAuthError(error.message) };
      return { ok: true, needsEmailConfirmation: !data.session };
    } catch (e) {
      return { ok: false, error: friendlyAuthError(e instanceof Error ? e.message : 'Sign up failed') };
    }
  },

  async signOut(): Promise<void> {
    const db = assertBackend();
    await db.auth.signOut();
  },

  async resetPassword(email: string): Promise<AuthResult> {
    try {
      const db = assertBackend();
      const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: getSiteUrl() });
      return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true };
    } catch (e) {
      return { ok: false, error: friendlyAuthError(e instanceof Error ? e.message : 'Reset failed') };
    }
  }
};
