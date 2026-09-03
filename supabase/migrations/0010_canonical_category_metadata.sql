-- VYBE 0010: Canonical category metadata for provider-backed places.
-- Keeps raw provider types so classification survives reloads and prevents
-- query/UI labels from being reinterpreted after persistence.

alter table public.places
  drop constraint if exists places_provider_check;

alter table public.places
  add constraint places_provider_check check (provider in ('vybe', 'google', 'osm'));

alter table public.places
  add column if not exists canonical_category text,
  add column if not exists provider_types text[] not null default '{}',
  add column if not exists provider_primary_type text;

create index if not exists idx_places_canonical_category on public.places(canonical_category);
create index if not exists idx_places_provider_primary_type on public.places(provider_primary_type);

-- Existing Google rows historically stored provider types in tags. Preserve
-- those values as provider_types until the next fresh materialization.
update public.places
set provider_types = tags
where provider = 'google'
  and coalesce(array_length(provider_types, 1), 0) = 0
  and coalesce(array_length(tags, 1), 0) > 0;

-- Never retain ephemeral Google photo URIs in persisted place rows.
update public.places
set photos = '[]'::jsonb
where provider = 'google';
