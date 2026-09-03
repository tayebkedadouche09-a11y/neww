import { isBackendConfigured } from './env';

/** VYBE uses the real Supabase backend. There is no local/demo data mode. */
export type DataMode = 'supabase';
export const dataMode: DataMode = 'supabase';

/** Legacy storage namespace retained only for theme/session migration safety. */
export const LOCAL_STORAGE_KEYS = {
  session: 'vybe_session',
  profiles: 'vybe_profiles',
  places: 'vybe_places',
  collections: 'vybe_collections',
  plans: 'vybe_plans',
  theme: 'vybe_theme'
} as const;

if (!isBackendConfigured) {
  console.warn('[VYBE] Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before production use.');
}
