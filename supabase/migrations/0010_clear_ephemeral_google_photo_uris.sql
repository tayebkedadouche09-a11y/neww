-- ============================================================================
-- VYBE — 0010: Remove legacy ephemeral Google photo URIs
-- ----------------------------------------------------------------------------
-- Google Place photo URIs are ephemeral. Existing Google rows may have been
-- materialized before runtime persistence was hardened, so clear those legacy
-- values once and keep photo retrieval entirely runtime/fresh thereafter.
-- ============================================================================

update public.places
set photos = '[]'::jsonb
where provider = 'google'
  and photos is distinct from '[]'::jsonb;

-- Defense in depth: the client-side materialization helper is not a photo
-- storage API. This migration intentionally leaves only the stable place ID
-- and trusted metadata in the catalog.
