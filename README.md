# VYBE — clean rebuild

VYBE is a real-world discovery app rebuilt from a clean Git tree. Discovery uses OpenStreetMap + Overpass for broad local coverage, then VYBE classifies and scores every returned place before Explore and Map receive it.

## Product flows

- Explore: dense result discovery, search, category filters and moods.
- Place analysis: category, mood, distance, confidence, completeness and score.
- Google Photos: optional Google Places (New) matching for real place photography in Explore, with required photo attribution when returned.
- Map: the same analyzed place dataset drives markers, so Explore and Map stay consistent.
- Saved: place snapshots persist locally.
- Plan: build, share and navigate a multi-stop outing.
- PWA: installable shell with safe same-origin offline caching.

## Google Photos configuration

Create a browser key in Google Cloud, enable **Places API (New)** and restrict the key to your VYBE web origins. The frontend reads it from:

`VITE_GOOGLE_MAPS_API_KEY`

For local development, copy `.env.example` to `.env.local` and fill the key. For Vercel, add the same variable to the project Environment Variables and redeploy `main`.

VYBE does **not** use Google Maps as its map renderer. Leaflet/OpenStreetMap remains the map layer; Google is used only for optional place-photo enrichment. Google’s current JavaScript Places API supports `Place.searchByText`, `Place.fetchFields`, and `Photo.getURI`; photo author attributions are required when photos are shown.

## Run

`npm install`

`npm run dev`

`npm run check`
