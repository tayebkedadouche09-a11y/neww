import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env, isBackendConfigured } from './env';

/**
 * Supabase client singleton.
 *
 * When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not configured the app
 * runs in LOCAL DEMO MODE (see src/lib/dataMode.ts) and this stays null.
 * All service-layer code must check `isBackendConfigured()` before use.
 */
let client: SupabaseClient | null = null;

if (isBackendConfigured) {
  client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

export const supabase = client;

export { isBackendConfigured };
