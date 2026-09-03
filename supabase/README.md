# VYBE — Supabase Backend Setup

PostgreSQL schema, authentication, and Row Level Security for VYBE.

## 1. Create the project

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. Copy **Project Settings → API → Project URL** and **anon public key**.

## 2. Configure the frontend

```bash
cp .env.example .env
# fill in:
# VITE_SUPABASE_URL=https://<project-ref>.supabase.co
# VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

The anon key is safe for the browser — all authorization is enforced by RLS.
**Never** put the `service_role` key in `.env`; it bypasses RLS entirely.

With both values set, VYBE boots in `supabase` data mode. With either missing,
VYBE boots in `local` demo mode (bundled demo data + localStorage) and shows the
"LOCAL DEMO MODE" badge — the app never crashes on a missing backend.

## 3. Apply migrations (in order)

SQL editor → paste and run each file:

1. `supabase/migrations/0001_schema.sql` — tables, FKs, unique constraints
2. `supabase/migrations/0002_indexes_triggers.sql` — indexes, `updated_at`
   triggers, `is_admin()`, `handle_new_user()` signup hook
3. `supabase/migrations/0003_rls.sql` — RLS part 1 (profiles, preferences,
   places, collections, saved places)
4. `supabase/migrations/0004_rls_plans_reviews_likes.sql` — RLS part 2
5. `supabase/migrations/0005_place_id_text_google_ids.sql` — `places.id` and
   every `place_id` FK becomes TEXT so Google Place IDs (`google:ChIJ…`) can be
   persisted (required for likes/saves/plans/reviews/collections)
6. `supabase/migrations/0006_remove_demo_seed_places.sql` — removes the old
   fictional demo rows (idempotent)
7. `supabase/migrations/0007_google_place_persistence.sql` — SECURITY DEFINER
   materializer (superseded by 0008/0009 for server-side-only materialization)
8. `supabase/migrations/0008_security_hardening.sql` — strict shape validation
9. `supabase/migrations/0009_lock_google_materializer.sql` — revoke the
   client-callable RPC; materialization happens server-side only
10. `supabase/migrations/0010_text_place_ids_forward.sql` — **forward migration
    for live databases created from the older UUID schema variant.** Guarded
    and idempotent: converts `places.id` + all `place_id` FKs from UUID to TEXT
    and adds `provider`, restoring FKs afterwards. Safe to run on every
    project (no-op when already TEXT). Run 0005–0009 first if they were never
    applied, then 0010.

Or with the Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

> **Why 0010 exists:** the repository baseline has always defined TEXT place
> IDs, but some live projects were created from an older UUID variant. On those
> projects every user-owned write (like, save, plan stop, collection item,
> review) fails with `400 invalid input syntax for type uuid`. Run
> `0010_text_place_ids_forward.sql` in the SQL editor to reconcile a drifted
> database — the migration inspects the live schema and is safe to re-run.

## 4. Never load demo seed data

There is **no** places seed file, by design. An earlier `supabase/seed.sql`
generated from `src/data/initialPlaces.ts` (fictional "Metropolis" demo data)
was applied to the live project and polluted the production catalog — that file
and its generator (`scripts/generate-seed.ts`) have been removed.

Production rule: the `places` table holds **verified/real places only**
(`provider = 'google'` rows imported from Google Places, or admin-verified
venues). The bundled `INITIAL_PLACES` demo catalog exists only for local demo
mode (no backend configured) and must never be inserted into Supabase.

If demo rows were already applied to a project, clean them up with:

```bash
# SQL editor / supabase db push — idempotent
supabase/migrations/0006_remove_demo_seed_places.sql
```

The demo rows are identified by `external_place_id LIKE 'place-%'` (real Google
Place IDs are opaque `ChIJ…` strings; admin rows are NULL) and dependent rows
are removed by FK cascade.

## 5. Auth settings (Dashboard → Authentication)

- **Providers:** Email (enabled by default). Google OAuth: add client
  ID/secret, then add your site URL to **URL Configuration → Redirect URLs**.
- **URL Configuration:** set Site URL to `VITE_SITE_URL` (default
  `http://localhost:5173`) so password-reset links return to the app.

## Security model (RLS summary)

| Table | Read | Write |
|---|---|---|
| profiles | public | self only (role escalation impossible — self-update pins `role='admin'` check; role changes only via `is_admin()`) |
| user_preferences | — | owner only |
| places | public | **admins only** (`is_admin()` security-definer) |
| collections | owner or public | owner only |
| collection_items | via parent collection | via parent collection owner |
| saved_places | — | owner only |
| plans | owner or public | owner only |
| plan_items | via parent plan | via parent plan owner |
| reviews | public | author only |
| likes | public (counts) | owner only |

Frontend admin checks are cosmetic only — the database rejects non-admin
writes to `places` even if the UI were bypassed.

## Promoting an admin

```sql
update public.profiles set role = 'admin' where username = '<username>';
```

(Do this from the Supabase dashboard/SQL editor with the service role — it is
intentionally not possible from the client.)
