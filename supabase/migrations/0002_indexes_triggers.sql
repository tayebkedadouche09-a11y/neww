-- ============================================================================
-- VYBE — 0002: Indexes, updated_at maintenance, admin helper, new-user hook
-- ============================================================================

-- ----------------------------------------------------------------------------
-- INDEXES — hot query paths (feed filters, detail joins, per-user lists).
-- ----------------------------------------------------------------------------
create index idx_places_category        on public.places (category);
create index idx_places_primary_mood    on public.places (primary_mood);
create index idx_places_city            on public.places (city);
create index idx_places_featured        on public.places (featured) where featured;
create index idx_places_trending        on public.places (trending) where trending;
create index idx_collections_user       on public.collections (user_id);
create index idx_collection_items_place on public.collection_items (place_id);
create index idx_saved_places_user      on public.saved_places (user_id);
create index idx_saved_places_place     on public.saved_places (place_id);
create index idx_plans_user             on public.plans (user_id);
create index idx_plan_items_plan        on public.plan_items (plan_id);
create index idx_reviews_place          on public.reviews (place_id);
create index idx_reviews_user           on public.reviews (user_id);
create index idx_likes_place            on public.likes (place_id);
create index idx_likes_user             on public.likes (user_id);

-- ----------------------------------------------------------------------------
-- updated_at maintenance
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_touch    before update on public.profiles        for each row execute function public.touch_updated_at();
create trigger trg_preferences_touch before update on public.user_preferences for each row execute function public.touch_updated_at();
create trigger trg_places_touch      before update on public.places          for each row execute function public.touch_updated_at();
create trigger trg_collections_touch before update on public.collections     for each row execute function public.touch_updated_at();
create trigger trg_plans_touch       before update on public.plans           for each row execute function public.touch_updated_at();
create trigger trg_reviews_touch     before update on public.reviews         for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- ADMIN HELPER — security-definer role check used by RLS (Phase 8).
-- Frontend role checks are cosmetic only; this is the server-side truth.
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- NEW USER HOOK — auto-create profile + preferences for every auth.users row.
-- Username gets a short id suffix to guarantee uniqueness.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
      || '_' || substr(replace(new.id::text, '-', ''), 1, 6),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      'https://api.dicebear.com/7.x/bottts/svg?seed=' || coalesce(new.raw_user_meta_data ->> 'username', new.id::text)
    )
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
