# VYBE — Local Run Guide

## 1. Reproduce the artifacts a fresh checkout needs

The main checkout is `C:\Users\tayeb\Desktop\neww`. This workspace IS the main
checkout, so no copying is needed here. For a **fresh worktree**:

1. Copy env config (never commit secrets):
   ```bash
   cp /c/Users/tayeb/Desktop/neww/.env .env
   ```
   (`.env` provides `VITE_GOOGLE_MAPS_API_KEY`, `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, and Vercel function env — see `.env.example` for
   the full documented list. Values stay in the main checkout; never paste
   them into the run doc.)
2. Install dependencies with npm (the project has only `package-lock.json`):
   ```bash
   npm install
   ```
3. Tests, build and contract checks are already verified green
   (`npm run build`, `npm test`, `npm run category-contract`).

## 2. Run the dev server

```bash
npm run dev
```

- Vite dev server, default port 5173. **This thread runs it on 5173**
  (re-verified free before starting):
  ```bash
  npm run dev -- --port 5173 --strictPort
  ```
  If 5173 is taken by another thread's server, pick the next free port and
  adapt: `npm run dev -- --port 5175 --strictPort`
- The Google Maps key is browser-restricted; localhost is an allowed referrer,
  so Explore/Map/Search work locally exactly as in production.
- OSM discovery goes through `/api/osm-discovery` — in plain `vite` dev this
  route is NOT proxied (no `vite.config` proxy for it), so OSM-backed results
  appear only in `npm run preview` or the production deployment. Google
  discovery works fully in dev.
