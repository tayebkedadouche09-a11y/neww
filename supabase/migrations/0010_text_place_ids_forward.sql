-- ============================================================================
-- VYBE — 0010: Live-schema reconciliation — TEXT Google place identifiers
-- ----------------------------------------------------------------------------
-- The repository baseline (0001_schema.sql) defines `places.id` and every
-- `place_id` foreign key as TEXT so opaque Google Place IDs can act as primary
-- identifiers ("google:ChIJ…"). Some deployed databases were created from an
-- older UUID variant of this schema, which makes every user-owned write fail
-- with HTTP 400 `invalid input syntax for type uuid` (likes, saved_places,
-- plan_items, collection_items, reviews).
--
-- This is a FORWARD migration for those live databases. It is fully guarded
-- and idempotent: every step inspects the live schema first, so it is safe to
-- run on a UUID-drifted database AND on an already up-to-date TEXT database
-- (all steps become no-ops there).
--
-- Run this file once in the Supabase SQL editor (Project → SQL Editor → paste
-- the whole file → Run).
-- ============================================================================

-- Snapshot every FK constraint that references public.places(id) so the
-- constraints can be dropped (type changes require it), then faithfully
-- restored with the same names below.
create temp table if not exists _vybe_places_fks (
  child_table text,
  child_column text,
  conname text
);

truncate table _vybe_places_fks;

insert into _vybe_places_fks (child_table, child_column, conname)
select
  child_cls.relname,
  att.attname,
  con.conname
from pg_constraint con
join pg_class parent_cls on parent_cls.oid = con.confrelid
join pg_namespace parent_ns on parent_ns.oid = parent_cls.relnamespace
join pg_class child_cls on child_cls.oid = con.conrelid
join pg_namespace child_ns on child_ns.oid = child_cls.relnamespace
join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
where con.contype = 'f'
  and parent_ns.nspname = 'public'
  and parent_cls.relname = 'places'
  and child_ns.nspname = 'public'
  and att.attnum = con.conkey[1]
  and child_cls.relname not in ('_vybe_places_fks')
group by child_cls.relname, att.attname, con.conname;

do $$
declare
  rec record;
  col_type text;
begin
  -- --------------------------------------------------------------------------
  -- 1) Drop every FK that references public.places(id).
  -- --------------------------------------------------------------------------
  for rec in select * from _vybe_places_fks loop
    execute format(
      'alter table public.%I drop constraint if exists %I',
      rec.child_table,
      rec.conname
    );
  end loop;

  -- --------------------------------------------------------------------------
  -- 2) places.id : UUID -> TEXT (skipped when already TEXT)
  -- --------------------------------------------------------------------------
  select data_type into col_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'places' and column_name = 'id';

  if col_type = 'uuid' then
    for rec in
      select con.conname as conname
      from pg_constraint con
      join pg_class cls on cls.oid = con.conrelid
      join pg_namespace ns on ns.oid = cls.relnamespace
      where con.contype = 'p' and ns.nspname = 'public' and cls.relname = 'places'
    loop
      execute format('alter table public.places drop constraint %I', rec.conname);
    end loop;

    execute 'alter table public.places alter column id type text using id::text';
    execute 'alter table public.places alter column id drop default';
    execute 'alter table public.places add primary key (id)';
  end if;

  -- --------------------------------------------------------------------------
  -- 3) Add the provider column (0005) when it is missing entirely.
  -- --------------------------------------------------------------------------
  if not exists (
    select 1 from pg_attribute
    where attrelid = 'public.places'::regclass and attname = 'provider' and not attisdropped
  ) then
    execute 'alter table public.places add column provider text not null default ''vybe'' check (provider in (''vybe'', ''google''))';
  end if;

  -- --------------------------------------------------------------------------
  -- 4) Every child place_id column : UUID -> TEXT (skipped when already TEXT)
  -- --------------------------------------------------------------------------
  for rec in select * from _vybe_places_fks loop
    select data_type into col_type
    from information_schema.columns
    where table_schema = 'public' and table_name = rec.child_table and column_name = rec.child_column;

    if col_type = 'uuid' then
      execute format(
        'alter table public.%I alter column %I type text using %I::text',
        rec.child_table, rec.child_column, rec.child_column
      );
    end if;
  end loop;

  -- --------------------------------------------------------------------------
  -- 5) external_place_id : UUID -> TEXT (same reconciliation; no-op when TEXT)
  -- --------------------------------------------------------------------------
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'places'
      and column_name = 'external_place_id' and data_type = 'uuid'
  ) then
    execute 'alter table public.places alter column external_place_id type text using external_place_id::text';
  end if;

  -- --------------------------------------------------------------------------
  -- 6) Restore every places FK (NOT VALID + best-effort validation).
  --    NOT VALID still enforces all NEW writes, so persistence is unblocked
  --    even if a drifted database holds orphaned historical rows; validation
  --    then tightens the constraint when the historical data is consistent.
  -- --------------------------------------------------------------------------
  for rec in select * from _vybe_places_fks loop
    execute format(
      'alter table public.%I add constraint %I foreign key (%I) references public.places (id) on delete cascade not valid',
      rec.child_table, rec.conname, rec.child_column
    );
    begin
      execute format('alter table public.%I validate constraint %I', rec.child_table, rec.conname);
    exception when foreign_key_violation then
      raise notice 'VYBE 0010: FK % has orphaned legacy rows; left NOT VALID (still enforced for new writes)', rec.conname;
    end;
  end loop;

  -- --------------------------------------------------------------------------
  -- 7) Defensive: any remaining UUID place_id column without an FK becomes
  --    TEXT as well (covers drift variants not seen by the snapshot).
  -- --------------------------------------------------------------------------
  for rec in
    select table_name as t, column_name as c
    from information_schema.columns
    where table_schema = 'public'
      and column_name in ('place_id', 'liked_place_id', 'saved_place_id')
      and data_type = 'uuid'
  loop
    execute format(
      'alter table public.%I alter column %I type text using %I::text',
      rec.t, rec.c, rec.c
    );
  end loop;
end $$;

drop table if exists _vybe_places_fks;
