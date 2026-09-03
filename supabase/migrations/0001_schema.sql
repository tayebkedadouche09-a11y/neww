-- ============================================================================
-- VYBE — 0001: Initial schema (tables)
-- PostgreSQL (Supabase). Foreign keys, uniqueness, checks included.
-- Indexes/triggers/policies: 0002_indexes.sql, 0003_rls.sql.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- PROFILES — 1:1 with auth.users. Role drives admin authorization (see RLS).
-- ----------------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text not null unique,
  display_name     text not null,
  avatar_url       text,
  bio              text,
  location         text,
  vibe_streak_days integer not null default 0,
  role             text not null default 'user' check (role in ('user', 'admin')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- USER_PREFERENCES — discovery personalization (one row per user).
-- ----------------------------------------------------------------------------
create table public.user_preferences (
  user_id             uuid primary key references public.profiles(id) on delete cascade,
  favorite_moods      text[] not null default '{}',
  favorite_categories text[] not null default '{}',
  preferred_budget    integer,
  preferred_radius    integer, -- km
  city                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PLACES — discovery catalog. external_place_id is reserved for the upcoming
-- Google Places integration (unique → no duplicates when importing venues).
-- ----------------------------------------------------------------------------
create table public.places (
  id                 text primary key,
  external_place_id  text unique,
  provider           text not null default 'vybe' check (provider in ('vybe', 'google')),
  name               text not null,
  tagline            text,
  description        text,
  category           text not null,
  primary_mood       text not null,
  secondary_moods    text[] not null default '{}',
  latitude           double precision,
  longitude          double precision,
  address            text,
  neighborhood       text,
  city               text,
  price_level        text,
  approx_cost_usd    integer,
  rating             numeric(3, 2) not null default 0,
  review_count       integer not null default 0,
  base_vybe_score    integer not null default 75,
  photos             jsonb not null default '[]'::jsonb,
  tags               text[] not null default '{}',
  estimated_duration text,
  opening_hours      jsonb not null default '{}'::jsonb,
  features           jsonb not null default '{}'::jsonb,
  suitable_for       text[] not null default '{}',
  website            text,
  phone              text,
  instagram          text,
  featured           boolean not null default false,
  trending           boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- COLLECTIONS + COLLECTION_ITEMS
-- ----------------------------------------------------------------------------
create table public.collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  description text,
  emoji       text not null default '✨',
  color       text not null default '#a3e635',
  is_public   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.collection_items (
  id            text primary key,
  collection_id uuid not null references public.collections(id) on delete cascade,
  place_id      text not null references public.places(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (collection_id, place_id)
);

-- ----------------------------------------------------------------------------
-- SAVED_PLACES — private bookmarks ("My VYBES").
-- ----------------------------------------------------------------------------
create table public.saved_places (
  id         text primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  place_id   text not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

-- ----------------------------------------------------------------------------
-- PLANS + PLAN_ITEMS — VYBE Plan Builder.
-- ----------------------------------------------------------------------------
create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  date        text,
  mood        text,
  budget      numeric(10, 2),
  cover_image text,
  is_public   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.plan_items (
  id         text primary key,
  plan_id    uuid not null references public.plans(id) on delete cascade,
  place_id   text not null references public.places(id) on delete cascade,
  start_time text,
  duration   integer not null default 90, -- minutes
  notes      text,
  sort_order integer not null default 0
);

-- ----------------------------------------------------------------------------
-- REVIEWS + LIKES
-- ----------------------------------------------------------------------------
create table public.reviews (
  id             text primary key,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  place_id       text not null references public.places(id) on delete cascade,
  rating         integer not null check (rating between 1 and 5),
  vibe_intensity integer not null default 80 check (vibe_intensity between 0 and 100),
  mood_tags      text[] not null default '{}',
  comment        text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.likes (
  id         text primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  place_id   text not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);
