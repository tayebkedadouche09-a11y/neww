-- ============================================================================
-- VYBE — 0005: Support Google Place IDs as primary identifiers
-- ----------------------------------------------------------------------------
-- Google Place IDs are opaque TEXT strings (e.g. "ChIJd8BlQ2BZwokR5t5g8f5wH5Y").
-- The places table previously used a UUID primary key with a separate
-- external_place_id for the Google ID. To allow Google Place IDs to serve as
-- the primary place identifier everywhere (join tables, lookups, user
-- bookmarks, plan items, reviews, likes), the primary key and all FK
-- place_id columns are converted from UUID to TEXT.
--
-- Existing UUID data is safely cast to text, so rows created via the seed
-- file (which already uses text values like 'place-1') remain valid.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- places.id : UUID → TEXT  +  add provider column
-- ----------------------------------------------------------------------------
alter table public.places drop constraint if exists places_pkey;
alter table public.places alter column id type text using id::text;
alter table public.places alter column id drop default;
alter table public.places add primary key (id);

-- Add provider column for data provenance tracking ('vybe' vs 'google').
-- Wrapped in DO because IF/THEN is PL/pgSQL, not top-level SQL.
do $$
begin
  if not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.places'::regclass
      and attname = 'provider'
      and not attisdropped
  ) then
    alter table public.places
      add column provider text not null default 'vybe'
      check (provider in ('vybe', 'google'));
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- collection_items.place_id : UUID → TEXT
-- ----------------------------------------------------------------------------
alter table public.collection_items drop constraint if exists collection_items_place_id_fkey;
alter table public.collection_items alter column place_id type text using place_id::text;
alter table public.collection_items add constraint collection_items_place_id_fkey
  foreign key (place_id) references public.places (id) on delete cascade;

-- ----------------------------------------------------------------------------
-- saved_places.place_id : UUID → TEXT
-- ----------------------------------------------------------------------------
alter table public.saved_places drop constraint if exists saved_places_place_id_fkey;
alter table public.saved_places alter column place_id type text using place_id::text;
alter table public.saved_places add constraint saved_places_place_id_fkey
  foreign key (place_id) references public.places (id) on delete cascade;

-- ----------------------------------------------------------------------------
-- plan_items.place_id : UUID → TEXT
-- ----------------------------------------------------------------------------
alter table public.plan_items drop constraint if exists plan_items_place_id_fkey;
alter table public.plan_items alter column place_id type text using place_id::text;
alter table public.plan_items add constraint plan_items_place_id_fkey
  foreign key (place_id) references public.places (id) on delete cascade;

-- ----------------------------------------------------------------------------
-- reviews.place_id : UUID → TEXT
-- ----------------------------------------------------------------------------
alter table public.reviews drop constraint if exists reviews_place_id_fkey;
alter table public.reviews alter column place_id type text using place_id::text;
alter table public.reviews add constraint reviews_place_id_fkey
  foreign key (place_id) references public.places (id) on delete cascade;

-- ----------------------------------------------------------------------------
-- likes.place_id : UUID → TEXT
-- ----------------------------------------------------------------------------
alter table public.likes drop constraint if exists likes_place_id_fkey;
alter table public.likes alter column place_id type text using place_id::text;
alter table public.likes add constraint likes_place_id_fkey
  foreign key (place_id) references public.places (id) on delete cascade;
