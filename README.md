# VYBE — clean rebuild

This branch is rebuilt from a new Git tree. The product is intentionally local-first and key-free for discovery: OpenStreetMap + Overpass provides place data, then VYBE classifies every returned place before Explore/Map receive it.

Core flows: city/location selection, radius search, category discovery, mood filtering, large-result discovery up to 1000 unique places, deterministic place analysis, Explore cards, Map markers, saved places, route links, plan builder, shareable plan snapshots, responsive mobile navigation, and offline shell caching.

Run: `npm install` then `npm run dev`.
Verify: `npm run check`.
