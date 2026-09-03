# VYBE — Legacy Architecture Audit

Date: 2026-09-03
Repository: `tayebkedadouche09-a11y/neww`

## Scope and important finding

The large tree previously visible in GitHub is from historical commit `1a200c35f57cf138ad13f680431438e0b87c76df` (`Rebuild Explore experience as one unified discovery flow`). It is not the current `main` tree. The current `main` was later replaced by a clean v3 rebuild.

The user-provided tree contained 72 visible file entries, but it omitted `src/components/explore/ExploreExperience.tsx` and all files under `supabase/migrations/`. The historical snapshot therefore contains 80 files when those omitted entries are included: 15 root files + 2 scripts + 1 CI workflow + 55 src files + 7 Supabase files.

This audit reviews the historical architecture file-by-file and separates legacy defects from the active v3 implementation. Legacy files are not blindly restored to `main` because doing so would reintroduce the old Google/Supabase orchestration and duplicate discovery paths.

Legend: **CRITICAL** blocks correctness/security; **BUG** functional defect; **WARN** important risk/quality issue; **OK** no blocker identified; **LEGACY** valid historical code but should not be restored as-is.

## Root and tooling

| # | Path | Status | Finding |
|---|---|---|---|
| 1 | `.env.example` | WARN | Configuration contract is broad; production secrets must stay out of Git and be supplied by deployment configuration. |
| 2 | `.gitignore` | OK | Ignores local dependencies/build/deployment artifacts; no blocker identified. |
| 3 | `AUDIT_STATUS.md` | WARN | Historical status document can become stale and should not be treated as runtime truth. |
| 4 | `debug-overflow.mjs` | LEGACY | Diagnostic-only script; not part of production runtime. |
| 5 | `index.html` | WARN | Historical shell was serviceable but lacked some production polish; current v3 shell now has favicon/metadata. |
| 6 | `package-lock.json` | OK | Lockfile present in legacy tree; good for reproducible installs. |
| 7 | `package.json` | WARN | Large dependency surface and duplicated Google Places abstractions increased maintenance cost. |
| 8 | `postcss.config.js` | OK | Standard Tailwind/PostCSS setup. |
| 9 | `read-build.ps1` | WARN | Empty 0-byte helper; dead tooling. |
| 10 | `read-build2.ps1` | WARN | Empty 0-byte helper; dead tooling. |
| 11 | `tailwind.config.js` | OK | Theme/config support was coherent with the legacy UI. |
| 12 | `test-browser-qa.js` | WARN | Useful QA helper but large/brittle and coupled to the historical application surface. |
| 13 | `tsconfig.json` | OK | TypeScript configuration was structurally valid. |
| 14 | `vercel.json` | WARN | SPA rewrite is normal, but catch-all rewrites can hide asset-routing mistakes during debugging. |
| 15 | `vite.config.ts` | OK | Vite configuration was straightforward. |
| 16 | `.github/workflows/ci.yml` | OK | CI validates install/typecheck/build; historical architecture still needed runtime QA beyond compilation. |

## Scripts

| # | Path | Status | Finding |
|---|---|---|---|
| 17 | `scripts/diag-discovery.mjs` | LEGACY | Diagnostic script for the former discovery pipeline; not required by current v3 runtime. |
| 18 | `scripts/diag-no-loc.mjs` | LEGACY | Diagnostic script for no-location behavior; useful during debugging, not production runtime. |

## `src/components`

| # | Path | Status | Finding |
|---|---|---|---|
| 19 | `src/components/admin/AdminPortal.tsx` | CRITICAL | New places were created with empty city and `lat: 0`, `lng: 0`; new content could appear at Null Island. Needs real geolocation/coordinates before production use. |
| 20 | `src/components/auth/AuthModal.tsx` | WARN | Authentication UI works structurally; close control needs stronger accessibility semantics. |
| 21 | `src/components/cards/FeaturedHeroCard.tsx` | WARN | Clickable container is not keyboard-semantic; Like/Save controls need explicit pressed state. |
| 22 | `src/components/cards/PlaceCard.tsx` | WARN | Clickable card is not keyboard-semantic and reclassification work was repeated in render. |
| 23 | `src/components/common/CustomCursor.tsx` | WARN | Mouse-position effect/RAF lifecycle can restart excessively; performance issue rather than correctness blocker. |
| 24 | `src/components/common/ModeBadge.tsx` | OK | No blocker identified. |
| 25 | `src/components/common/ThemeToggle.tsx` | OK | No blocker identified; persistence should be guarded in hostile storage environments. |
| 26 | `src/components/common/ToastContainer.tsx` | WARN | Toast close/accessibility semantics need improvement (`aria-live`, labels). |
| 27 | `src/components/common/VybeScoreBadge.tsx` | OK | Score presentation component is structurally sound. |
| 28 | `src/components/discovery/FilterBar.tsx` | WARN | Filter controls had incomplete active-state coverage and incomplete price options; accessibility semantics were also weak. |
| 29 | `src/components/discovery/HeroMoodSelector.tsx` | BUG | Filter state was changed and discovery was requested in the same handler, allowing stale filters/duplicate requests. |
| 30 | `src/components/discovery/IHaveDiscoveryWizard.tsx` | BUG | Similar stale-state/duplicate-discovery pattern; requestLocationAndDiscover + delayed discover could fire multiple searches. |
| 31 | `src/components/discovery/ExploreExperience.tsx` | OK | Best of the historical discovery flows: passes the next filter state directly into discovery and unifies controls. |
| 32 | `src/components/layout/Footer.tsx` | WARN | Unused icon imports and hard-coded historical version; no functional blocker. |
| 33 | `src/components/layout/MobileNav.tsx` | WARN | Navigation is functional, but accessibility semantics could be stronger. |
| 34 | `src/components/layout/Navbar.tsx` | BUG | Search blur plus DataContext debounce could trigger duplicate discovery calls; clear control also needed an accessible label. |
| 35 | `src/components/map/GoogleMap.tsx` | WARN | Renders many markers without clustering/capping; fallback behavior is reasonable. |
| 36 | `src/components/map/VybeMap.tsx` | WARN | World-level fallback plus unbounded marker rendering can be heavy and is not ideal for mobile. |
| 37 | `src/components/place/PlaceDetailModal.tsx` | BUG | Several correctness/accessibility issues: gallery index not reset on place change, zero distance falls back to `1.2`, close control semantics, and external navigation lacked hardening. |
| 38 | `src/components/place/ReviewModal.tsx` | WARN | Review flow works but close/accessibility semantics need improvement. |
| 39 | `src/components/plan/VybePlanBuilder.tsx` | BUG | Budget state was partly dead/unused and time input lacked robust validation; icon-only actions needed labels. |
| 40 | `src/components/profile/CollectionsView.tsx` | BUG | Clipboard Promise rejection was not caught by the synchronous `try/catch`; active collection state could become stale after collection changes. |
| 41 | `src/components/profile/ProfileView.tsx` | WARN | Profile edit state is initialized once and can become stale after account switching; image error handling/accessibility can be improved. |
| 42 | `src/components/share/ShareStoryModal.tsx` | BUG | Async clipboard failure was not handled correctly, and the downloaded Canvas story did not include the place image even though the preview did. |

## `src/context`

| # | Path | Status | Finding |
|---|---|---|---|
| 43 | `src/context/AuthContext.tsx` | BUG | Initial session restore and auth-state listener can hydrate the same user twice; localStorage reads/writes were unguarded. |
| 44 | `src/context/DataContext.tsx` | CRITICAL | Multiple effects/handlers could trigger duplicate discovery requests; optimistic mutations had no rollback; seeded plans/collections could reference demo IDs while live discovery replaced the place catalog. Review timestamps also used human strings. |
| 45 | `src/context/ThemeContext.tsx` | WARN | Simple and functional; storage access should be guarded. |

## `src/data`

| # | Path | Status | Finding |
|---|---|---|---|
| 46 | `src/data/initialCategories.ts` | OK | Static catalog configuration; no blocker identified. |
| 47 | `src/data/initialMoods.ts` | OK | Static mood configuration; no blocker identified. |
| 48 | `src/data/initialPlaces.ts` | LEGACY/WARN | Uses synthetic `Metropolis` demo content and relative review timestamps; must never be treated as production real-world catalog data. |

## `src/hooks`

| # | Path | Status | Finding |
|---|---|---|---|
| 49 | `src/hooks/useGeolocation.ts` | WARN | Hook itself is reasonable, but the old DataContext auto-requested location, producing an unexpected permission flow. |
| 50 | `src/hooks/useRequireAuth.ts` | OK | Guard pattern is straightforward. |
| 51 | `src/hooks/useVybeScore.ts` | WARN | Score utility is robust, but the minimum-score floor makes all places look moderately good; product policy rather than a code failure. |

## `src/lib`

| # | Path | Status | Finding |
|---|---|---|---|
| 52 | `src/lib/dataMode.ts` | OK | Clear local/supabase mode abstraction. |
| 53 | `src/lib/env.ts` | OK | Environment configuration abstraction is useful; production values belong in deployment env. |
| 54 | `src/lib/googleMapsLoader.ts` | OK | Loader had a recovery path and isolated Google Maps script loading. |
| 55 | `src/lib/supabase.ts` | OK | Conditional client setup was structurally sound. |

## `src/services`

| # | Path | Status | Finding |
|---|---|---|---|
| 56 | `src/services/authService.ts` | OK | Auth service structure is sound. |
| 57 | `src/services/collectionsService.ts` | OK | Collection CRUD/service structure is sound. |
| 58 | `src/services/discoveryService.ts` | BUG | Google place type mapping mixed gyms/fitness into outdoor/nature; legacy discovery also depended too heavily on Google configuration. |
| 59 | `src/services/googlePlaces.ts` | OK | Google Places calls had retry/error resilience; returned result limits were reasonable. |
| 60 | `src/services/googlePlacesAdapter.ts` | BUG | Duplicate/overlapping classification table, broad substring matching, and wrong gym→outdoor mapping could misclassify results. |
| 61 | `src/services/googlePlacesTypes.ts` | WARN | Duplicate type/mapping layer increased drift risk with `googlePlacesAdapter.ts`. |
| 62 | `src/services/likesService.ts` | OK | Like persistence service is structurally sound. |
| 63 | `src/services/mappers.ts` | CRITICAL | Review `created_at` was converted into human-readable `timeAgo(...)` instead of preserving a real timestamp, breaking chronological semantics and any reliable date sorting. |
| 64 | `src/services/placesService.ts` | WARN | Service structure is fine, but review ordering depends on the timestamp bug in `mappers.ts`. |
| 65 | `src/services/plansService.ts` | OK | Plan CRUD/service structure is sound. |
| 66 | `src/services/profileService.ts` | OK | Profile persistence structure is sound. |
| 67 | `src/services/reviewsService.ts` | OK | Review CRUD structure is sound. |
| 68 | `src/services/savedPlacesService.ts` | OK | Saved-place persistence structure is sound. |

## `src/types` and root source files

| # | Path | Status | Finding |
|---|---|---|---|
| 69 | `src/types/index.ts` | OK | Shared domain types were comprehensive. |
| 70 | `src/App.tsx` | WARN | Large historical orchestrator coupled navigation, state, auth, discovery and modals; high blast radius for changes. |
| 71 | `src/index.css` | OK | Tailwind/Leaflet style layer was coherent. |
| 72 | `src/main.tsx` | OK | Bootstrap was structurally correct. |
| 73 | `src/vite-env.d.ts` | OK | Vite env typing support. |

## Supabase

| # | Path | Status | Finding |
|---|---|---|---|
| 74 | `supabase/README.md` | OK | Useful deployment/schema notes; historical only for current v3. |
| 75 | `supabase/migrations/0001_schema.sql` | OK | Core schema baseline; must be applied consistently in the target Supabase project. |
| 76 | `supabase/migrations/0002_indexes_triggers.sql` | OK | Index/trigger layer is coherent. |
| 77 | `supabase/migrations/0003_rls.sql` | WARN | RLS policy design is largely sound; admin/update policies deserve production security review before restoring this architecture. |
| 78 | `supabase/migrations/0004_rls_plans_reviews_likes.sql` | OK | Owner/public policies are structurally reasonable. |
| 79 | `supabase/migrations/0005_place_id_text_google_ids.sql` | OK | Migration aligns IDs for external place systems; historical dependency only. |
| 80 | `supabase/migrations/0006_remove_demo_seed_places.sql` | OK | Explicitly removes demo place data; good direction for production. |

## Highest-impact defects found in the legacy architecture

1. Discovery was orchestrated from too many places, creating stale-state and duplicate-request behavior.
2. `mappers.ts` destroyed real review timestamps by converting them into display strings.
3. Admin place creation could publish coordinates `0,0`.
4. Google classification mixed gyms/fitness with outdoor/nature and had duplicated mapping layers.
5. Several primary interaction surfaces were not keyboard/accessibility complete.
6. Async clipboard failures were incorrectly handled with synchronous `try/catch`.
7. The social story download did not contain the same image shown in the preview.
8. Demo seed data used synthetic city/place data that must not leak into production.
9. Marker rendering was unbounded for large discovery sets.
10. Optimistic remote mutations did not provide rollback on backend failure.

## Active v3 `main` remediation already applied

The active clean rebuild was hardened without restoring the legacy tree:

- Leaflet CSS is now imported in `src/main.tsx`.
- Discovery state now ignores stale/out-of-order responses.
- Saved/plan/city storage reads and writes are guarded and validated.
- Shared plan encoding/decoding now uses UTF-8-safe `TextEncoder`/`TextDecoder` logic.
- Shared-plan loading no longer races the automatic discovery effect.
- Shared city is restored when a known city ID is present.
- Clipboard sharing has a real fallback path.
- Toast timers are cleaned up/replaced safely.
- Cards and navigation controls received stronger keyboard/ARIA semantics.
- Map markers are capped at 400 on the rendered map to protect mobile performance.
- Category classification order was corrected for family, wellness, stay and outdoor cases.
- Romantic/creative mood signals are now actually generated when strong matching tags/names exist.
- Google Places loader can recover after a transient initialization failure.
- VYBE now has a real PWA/icon asset and favicon.
- Service-worker cache version was bumped and only successful responses are cached.

## Verification status

Static GitHub CI had previously passed the active v3 build/typecheck. The current remediation commits must still complete a fresh GitHub Actions run after these changes. A real browser/Vercel verification is not claimed here because the Vercel deployment service was previously rate-limited and a live browser session has not yet been completed in this environment.
