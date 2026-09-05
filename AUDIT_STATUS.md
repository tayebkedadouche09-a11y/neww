# VYBE Production Audit Status

This file tracks the production-readiness audit being performed directly against the repository.

## Current focus
- Google Maps JavaScript API + Places API production reliability
- Real place data only; no fake image fallback
- Search / discovery / place details
- Runtime error prevention
- Build/typecheck correctness
- Responsive UX and production stability
- Request race protection (stale discovery results)
- Honest quota / materialize error surfaces

## Recent hardening (2026-09-05)
- DataContext: versioned discovery requests so rapid Search A → Search B never lets stale results overwrite the latest query.
- materialize-google-place: distinguish 429/403 quota from other Google failures (return 429 instead of opaque 502).
- discoveryService: slightly more conservative Google request pacing (750 ms) to reduce 429 risk.
- Photo hydration already uses IntersectionObserver + on-demand refresh; keep honest fallbacks.
- AuthModal: focus trap, auto-focus on open, role=dialog, aria-modal, stable data-testid.

## Google Maps findings
- Places discovery/details use the modern Maps JavaScript API Places library.
- Google photo URIs are passed through without constructing legacy photo URLs.
- No Unsplash/random image fallback should be used for real places.
- API key must be supplied by Vercel environment variables and restricted in Google Cloud.

## Rule
Do not treat a successful TypeScript build as sufficient. Production behavior must be verified after deployment.
