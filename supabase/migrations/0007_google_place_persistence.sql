-- ============================================================================
-- VYBE — 0007: Persist external Google Places safely for user-owned actions
-- ----------------------------------------------------------------------------
-- Google discovery is runtime/external data, while user-owned relations
-- (saved_places, likes, plan_items, reviews, collection_items) keep FK
-- integrity against public.places. This SECURITY DEFINER helper lets an
-- authenticated user materialize one verified Google place without granting
-- direct insert/update access to the public places catalog.
-- ============================================================================

create or replace function public.ensure_google_place(payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := trim(coalesce(payload ->> 'id', ''));
  v_external text := trim(coalesce(payload ->> 'external_place_id', ''));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(payload ->> 'provider', '') <> 'google' then
    raise exception 'Only Google places can be materialized by this function';
  end if;

  if v_id = '' or v_external = '' or v_id <> 'google:' || v_external then
    raise exception 'Invalid Google place identity';
  end if;

  if trim(coalesce(payload ->> 'name', '')) = '' then
    raise exception 'Google place name is required';
  end if;

  insert into public.places (
    id,
    external_place_id,
    provider,
    name,
    tagline,
    description,
    category,
    primary_mood,
    secondary_moods,
    latitude,
    longitude,
    address,
    neighborhood,
    city,
    price_level,
    approx_cost_usd,
    rating,
    review_count,
    base_vybe_score,
    photos,
    tags,
    estimated_duration,
    opening_hours,
    features,
    suitable_for,
    website,
    phone,
    instagram,
    featured,
    trending
  ) values (
    v_id,
    v_external,
    'google',
    trim(payload ->> 'name'),
    nullif(payload ->> 'tagline', ''),
    nullif(payload ->> 'description', ''),
    coalesce(nullif(payload ->> 'category', ''), 'hidden-gems'),
    coalesce(nullif(payload ->> 'primary_mood', ''), 'explore'),
    coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(payload -> 'secondary_moods', '[]'::jsonb)) as x(value)), '{}'::text[]),
    case when payload ->> 'latitude' ~ '^[-+]?[0-9]*\\.?[0-9]+$' then (payload ->> 'latitude')::double precision end,
    case when payload ->> 'longitude' ~ '^[-+]?[0-9]*\\.?[0-9]+$' then (payload ->> 'longitude')::double precision end,
    nullif(payload ->> 'address', ''),
    nullif(payload ->> 'neighborhood', ''),
    nullif(payload ->> 'city', ''),
    nullif(payload ->> 'price_level', ''),
    case when payload ->> 'approx_cost_usd' ~ '^[-+]?[0-9]+$' then (payload ->> 'approx_cost_usd')::integer else 0 end,
    case when payload ->> 'rating' ~ '^([0-9]+)(\\.[0-9]+)?$' then (payload ->> 'rating')::numeric else 0 end,
    case when payload ->> 'review_count' ~ '^[0-9]+$' then (payload ->> 'review_count')::integer else 0 end,
    case when payload ->> 'base_vybe_score' ~ '^[0-9]+$' then (payload ->> 'base_vybe_score')::integer else 75 end,
    coalesce(payload -> 'photos', '[]'::jsonb),
    coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(payload -> 'tags', '[]'::jsonb)) as x(value)), '{}'::text[]),
    coalesce(nullif(payload ->> 'estimated_duration', ''), ''),
    coalesce(payload -> 'opening_hours', '{}'::jsonb),
    coalesce(payload -> 'features', '{}'::jsonb),
    coalesce((select array_agg(value) from jsonb_array_elements_text(coalesce(payload -> 'suitable_for', '[]'::jsonb)) as x(value)), '{}'::text[]),
    nullif(payload ->> 'website', ''),
    nullif(payload ->> 'phone', ''),
    nullif(payload ->> 'instagram', ''),
    false,
    false
  )
  on conflict (id) do update set
    external_place_id = excluded.external_place_id,
    provider = 'google',
    name = excluded.name,
    tagline = excluded.tagline,
    description = excluded.description,
    category = excluded.category,
    primary_mood = excluded.primary_mood,
    secondary_moods = excluded.secondary_moods,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    address = excluded.address,
    neighborhood = excluded.neighborhood,
    city = excluded.city,
    price_level = excluded.price_level,
    approx_cost_usd = excluded.approx_cost_usd,
    rating = excluded.rating,
    review_count = excluded.review_count,
    base_vybe_score = excluded.base_vybe_score,
    photos = excluded.photos,
    tags = excluded.tags,
    estimated_duration = excluded.estimated_duration,
    opening_hours = excluded.opening_hours,
    features = excluded.features,
    suitable_for = excluded.suitable_for,
    website = excluded.website,
    phone = excluded.phone,
    instagram = excluded.instagram;

  return v_id;
end;
$$;

revoke all on function public.ensure_google_place(jsonb) from public;
grant execute on function public.ensure_google_place(jsonb) to authenticated;
