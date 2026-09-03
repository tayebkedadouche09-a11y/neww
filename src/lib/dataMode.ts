import { isBackendConfigured } from './env';

/** Runtime backend is Supabase. The legacy local literal remains only so old persistence guards can type-check; it is never selected. */
export type DataMode = 'supabase' | 'local';
export const dataMode: DataMode = 'supabase';

/** Storage names retained only for migration compatibility; production data lives in Supabase. */
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
