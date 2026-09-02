import { isBackendConfigured } from './env';

/**
 * Which data backend the application is running on.
 *
 *  - 'supabase': VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are configured
 *                AND VITE_DEMO_MODE is not enabled. Real accounts write to
 *                PostgreSQL; demo users stay local.
 *  - 'local':    VITE_DEMO_MODE=true, or no backend configured. The app boots
 *                on bundled demo data and localStorage persistence
 *                (development fallback — Phase 10).
 */
export type DataMode = 'supabase' | 'local';

export const dataMode: DataMode = isBackendConfigured ? 'supabase' : 'local';

/**
 * localStorage keys owned by the LOCAL demo backend.
 * In 'supabase' mode these keys are only used by demo-mode sessions.
 */
export const LOCAL_STORAGE_KEYS = {
  session: 'vybe_session',
  profiles: 'vybe_profiles',
  places: 'vybe_places',
  collections: 'vybe_collections',
  plans: 'vybe_plans',
  theme: 'vybe_theme'
} as const;
