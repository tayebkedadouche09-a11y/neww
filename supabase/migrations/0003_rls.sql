-- ============================================================================
-- VYBE — 0003: Row Level Security, part 1 (Phase 8)
-- Users may only modify their OWN rows. Public READ for discovery content.
-- Admin place-catalog operations enforced DB-side via is_admin().
-- ============================================================================

alter table public.profiles         enable row level security;
alter table public.user_preferences enable row level security;
alter table public.places           enable row level security;
alter table public.collections      enable row level security;
alter table public.collection_items enable row level security;
alter table public.saved_places     enable row level security;

-- ----------------------------------------------------------------------------
-- PROFILES: public read (review authors), self write only. The self-update
-- policy pins role='user' so a non-admin can never escalate privileges.
-- ----------------------------------------------------------------------------
create policy "profiles_public_read" on public.profiles
  for select using (true);

create policy "profiles_self_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id and role = 'user');

create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin());

-- ----------------------------------------------------------------------------
-- USER_PREFERENCES: strictly private to the owner.
-- ----------------------------------------------------------------------------
create policy "preferences_all_owner" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- PLACES: public discovery data → world read. Writes: admins only.
-- ----------------------------------------------------------------------------
create policy "places_public_read" on public.places
  for select using (true);

create policy "places_admin_insert" on public.places
  for insert with check (public.is_admin());

create policy "places_admin_update" on public.places
  for update using (public.is_admin());

create policy "places_admin_delete" on public.places
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- COLLECTIONS: owner full control; public collections world-readable.
-- ----------------------------------------------------------------------------
create policy "collections_read_public_or_owner" on public.collections
  for select using (is_public or auth.uid() = user_id);

create policy "collections_owner_insert" on public.collections
  for insert with check (auth.uid() = user_id);

create policy "collections_owner_update" on public.collections
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "collections_owner_delete" on public.collections
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- COLLECTION_ITEMS: access inherited from the parent collection.
-- ----------------------------------------------------------------------------
create policy "items_read_via_collection" on public.collection_items
  for select using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and (c.is_public or c.user_id = auth.uid())
    )
  );

create policy "items_write_via_collection" on public.collection_items
  for all using (
    exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.collections c where c.id = collection_id and c.user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- SAVED_PLACES: strictly private bookmarks.
-- ----------------------------------------------------------------------------
create policy "saved_places_owner" on public.saved_places
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
