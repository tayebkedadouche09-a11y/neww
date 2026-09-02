-- ============================================================================
-- VYBE — 0004: Row Level Security, part 2 (plans, reviews, likes)
-- ============================================================================

alter table public.plans      enable row level security;
alter table public.plan_items enable row level security;
alter table public.reviews    enable row level security;
alter table public.likes      enable row level security;

-- ----------------------------------------------------------------------------
-- PLANS: owner full control; public plans world-readable.
-- ----------------------------------------------------------------------------
create policy "plans_read_public_or_owner" on public.plans
  for select using (is_public or auth.uid() = user_id);

create policy "plans_owner_insert" on public.plans
  for insert with check (auth.uid() = user_id);

create policy "plans_owner_update" on public.plans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "plans_owner_delete" on public.plans
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- PLAN_ITEMS: access inherited from the parent plan.
-- ----------------------------------------------------------------------------
create policy "plan_items_read_via_plan" on public.plan_items
  for select using (
    exists (
      select 1 from public.plans p
      where p.id = plan_id and (p.is_public or p.user_id = auth.uid())
    )
  );

create policy "plan_items_write_via_plan" on public.plan_items
  for all using (
    exists (select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- REVIEWS: world read; author writes own.
-- ----------------------------------------------------------------------------
create policy "reviews_public_read" on public.reviews
  for select using (true);

create policy "reviews_owner_insert" on public.reviews
  for insert with check (auth.uid() = user_id);

create policy "reviews_owner_update" on public.reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reviews_owner_delete" on public.reviews
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- LIKES: world read (count display); author writes own.
-- ----------------------------------------------------------------------------
create policy "likes_public_read" on public.likes
  for select using (true);

create policy "likes_owner_write" on public.likes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
