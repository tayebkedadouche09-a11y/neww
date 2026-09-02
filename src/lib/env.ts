/**
 * Central, typed access to Vite-exposed environment variables.
 *
 * SECURITY: only VITE_* variables ever reach the browser bundle. The Supabase
 * service-role key must NEVER be placed here — the anon key is safe because all
 * authorization is enforced server-side by Row Level Security (see
 * supabase/migrations/0002_rls.sql).
 */

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
const siteUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || window.location.origin;
const googleMapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? '';
const googleMapsMapId = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined)?.trim() ?? '';

/** True when explicitly set to force demo mode (ignores backend even if configured). */
export const isDemoMode = (import.meta.env.VITE_DEMO_MODE as string | undefined)?.trim().toLowerCase() === 'true';

/** True only when BOTH Supabase values are present AND demo mode is not forced. */
export const isBackendConfigured = isDemoMode ? false : Boolean(supabaseUrl && supabaseAnonKey);

/** True when a Google Maps API key is configured. */
export const isGoogleMapsConfigured = Boolean(googleMapsApiKey);

/** The URL users are redirected to after password reset / OAuth. */
export const getSiteUrl = () => siteUrl;

/** Raw values, used only by the Supabase client factory. */
export const env = { supabaseUrl, supabaseAnonKey };

/** Google Maps configuration. */
export const googleMapsConfig = { apiKey: googleMapsApiKey, mapId: googleMapsMapId };
