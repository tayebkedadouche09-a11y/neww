-- VYBE security hardening
-- Google place persistence now happens only through the server-side
-- materialize-google-place endpoint, which verifies the Supabase session and
-- fetches the place directly from Google before writing with server credentials.
-- Disable the legacy client-callable SECURITY DEFINER RPC so authenticated
-- clients cannot fabricate catalog rows or metadata.

revoke all on function public.ensure_google_place(jsonb) from public;
revoke all on function public.ensure_google_place(jsonb) from authenticated;
revoke all on function public.ensure_google_place(jsonb) from anon;
