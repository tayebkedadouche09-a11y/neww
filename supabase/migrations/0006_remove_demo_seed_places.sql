-- ============================================================================
-- VYBE — 0006: Remove fictional demo seed places from the catalog
-- ----------------------------------------------------------------------------
-- The 27 rows inserted by the old supabase/seed.sql (generated from
-- src/data/initialPlaces.ts) are FICTIONAL demo data ("Metropolis"). They must
-- never exist in a shared/production places catalog: the production discovery
-- flow serves Google Places results, and the Supabase catalog is reserved for
-- verified/real places only.
--
-- Identification is precise: the seed set external_place_id to the demo id
-- ('place-1' … 'place-27'). Real Google Place IDs are opaque strings
-- ('ChIJ…') and admin-created rows have external_place_id NULL, so the
-- 'place-%' pattern can only match the demo seed rows.
--
-- Dependent rows (reviews, likes, saved_places, collection_items, plan_items)
-- are removed automatically by their ON DELETE CASCADE foreign keys.
--
-- Idempotent: safe to re-run. Run 0005 first if it has not been applied yet
-- (the app inserts a provider column that 0005 adds).
-- ============================================================================

do $$
declare
  demo_count integer;
begin
  select count(*) into demo_count from public.places where external_place_id like 'place-%';
  raise notice '0006: deleting % demo seed place(s)', demo_count;
end $$;

delete from public.places
where external_place_id like 'place-%';

-- Verification (should report 0):
do $$
declare
  remaining integer;
begin
  select count(*) into remaining from public.places where external_place_id like 'place-%';
  raise notice '0006: % demo seed place(s) remain', remaining;
end $$;
