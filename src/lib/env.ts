/**
 * Central, typed access to Vite-exposed environment variables.
 *
 * SECURITY: only VITE_* variables ever reach the browser bundle. The Supabase
 * service-role key must NEVER be placed here — the anon key is safe because all
 * authorization is enforced server-side by Row Level Security.
 */

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
const siteUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || window.location.origin;
const googleMapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? '';
const googleMapsMapId = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined)?.trim() ?? '';

/** VYBE is a real-data product: Supabase must be configured for the app to run. */
export const isBackendConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** True when a Google Maps API key is configured. */
export const isGoogleMapsConfigured = Boolean(googleMapsApiKey);

/** The URL users are redirected to after password reset / OAuth. */
export const getSiteUrl = () => siteUrl;

/** Raw values, used only by the Supabase client factory. */
export const env = { supabaseUrl, supabaseAnonKey };

/** Google Maps configuration. */
export const googleMapsConfig = { apiKey: googleMapsApiKey, mapId: googleMapsMapId };
