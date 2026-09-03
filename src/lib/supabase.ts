import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env, isBackendConfigured } from './env';

/**
 * Supabase client singleton. VYBE uses Supabase for real authentication and
 * cloud persistence; missing configuration is a deployment/setup error, not a
 * local or demo data mode.
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
