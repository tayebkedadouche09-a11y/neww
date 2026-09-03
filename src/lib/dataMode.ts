import { isBackendConfigured } from './env';

export type DataMode = 'supabase';
export const dataMode: DataMode = 'supabase';

/** Only theme remains browser-local; application data lives in Supabase. */
export const LOCAL_STORAGE_KEYS = {
  theme: 'vybe_theme'
} as const;

if (!isBackendConfigured) {
  console.warn('[VYBE] Supabase configuration is required for production use.');
}
