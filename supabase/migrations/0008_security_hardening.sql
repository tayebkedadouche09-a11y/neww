-- VYBE security hardening: prevent authenticated clients from overwriting
-- existing Google place catalog rows through the SECURITY DEFINER materializer.
-- Full cryptographic Google verification still requires a server-side Google
-- credential/function; this migration removes the privilege-escalation/data-
-- overwrite path and validates the externally supplied shape more strictly.

create or replace function public.ensure_google_place(payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text := trim(coalesce(payload ->> 'id', ''));
  v_external text := trim(coalesce(payload ->> 'external_place_id', ''));
  v_lat double precision;
  v_lng double precision;
  v_rating numeric;
  v_review_count integer;
  v_price text := nullif(payload ->> 'price_level', '');
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(payload ->> 'provider', '') <> 'google' then
    raise exception 'Only Google places can be materialized by this function';
  end if;

  if v_external = '' or length(v_external) > 300 or v_id <> 'google:' || v_external then
    raise exception 'Invalid Google place identity';
  end if;

  if trim(coalesce(payload ->> 'name', '')) = '' or length(trim(payload ->> 'name')) > 500 then
    raise exception 'Invalid Google place name';
  end if;

  if payload ? 'latitude' and nullif(payload ->> 'latitude', '') is not null then
    v_lat := (payload ->> 'latitude')::double precision;
    if v_lat < -90 or v_lat > 90 then raise exception 'Invalid latitude'; end if;
  end if;

  if payload ? 'longitude' and nullif(payload ->> 'longitude', '') is not null then
    v_lng := (payload ->> 'longitude')::double precision;
    if v_lng < -180 or v_lng > 180 then raise exception 'Invalid longitude'; end if;
  end if;

  if nullif(payload ->> 'rating', '') is not null then
    v_rating := (payload ->> 'rating')::numeric;
    if v_rating < 0 or v_rating > 5 then raise exception 'Invalid rating'; end if;
  end if;

  if nullif(payload ->> 'review_count', '') is not null then
    v_review_count := (payload ->> 'review_count')::integer;
    if v_review_count < 0 then raise exception 'Invalid review count'; end if;
  end if;

  if v_price is not null and v_price not in ('free', '$', '$$', '$$$', '$$$$') then
    raise exception 'Invalid price level';
  end if;

  insert into public.places (
    id, external_place_id, provider, name, tagline, description, category,
    primary_mood, secondary_moods, latitude, longitude, address, neighborhood,
    city, price_level, approx_cost_usd, rating, review_count, base_vybe_score,
    photos, tags, estimated_duration, opening_hours, features, suitable_for,
    website, phone, instagram, featured, trending
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
    v_lat,
    v_lng,
    nullif(payload ->> 'address', ''),
    nullif(payload ->> 'neighborhood', ''),
    nullif(payload ->> 'city', ''),
    v_price,
    case when payload ->> 'approx_cost_usd' ~ '^[-+]?[0-9]+$' then (payload ->> 'approx_cost_usd')::integer else 0 end,
    coalesce(v_rating, 0),
    coalesce(v_review_count, 0),
    case when payload ->> 'base_vybe_score' ~ '^[0-9]+$' then least((payload ->> 'base_vybe_score')::integer, 100) else 75 end,
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
  on conflict (id) do nothing;

  return v_id;
end;
$$;

revoke all on function public.ensure_google_place(jsonb) from public;
grant execute on function public.ensure_google_place(jsonb) to authenticated;
