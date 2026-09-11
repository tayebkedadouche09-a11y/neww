# Remaining CERT gates — autonomous run in progress

Started 2026-09-06T00:38Z by this thread. Watcher pid: **15132**
(kill with `taskkill //PID 15132 //F` if needed; do NOT kill 11532 — that is the preview dev server).

## What the watcher does
1. Polls production with a minimal probe until Google Places quota resets
   (midnight Pacific = 07:00 UTC; baseline probe at 00:36Z confirmed still 429).
2. The moment discovery succeeds, runs:
   - **Gate 1 (Flow F live):** `node scripts/cert-flow-f-live.mjs` → `.freebuff/flow-f-final/flow-f-result.json`
   - 90s cooldown
   - **Gate 2 (photo chain):** `node scripts/cert-map-probe.mjs` → `cert-map-probe.json`

## How to pick up results
```bash
cat .freebuff/quota-watcher.log          # probe timeline + gate exit codes
cat .freebuff/quota-status.json          # whether reset was detected
cat .freebuff/flow-f-final/flow-f-result.json   # Gate 1 evidence (pass = latestSearchWins.pass true, quotaBlocked absent)
cat cert-map-probe.json                  # Gate 2 evidence (detail.images + Google links w/ place id)
```

Verdict rules (unchanged):
- Gate 1 PASS only if `latestSearchWins.pass === true` and no `quotaBlocked` flag and zero page errors.
- Gate 2 PASS only if rendered image URLs are Google-hosted AND the Google Maps link / photo name embeds the SAME place id as the card (exact identity), else BLOCKED-EXTERNAL if 429.
- Flow D stays BLOCKED (no legitimate QA session exists; do not fabricate credentials).
- If the watcher logs "quota never recovered", both gates remain BLOCKED-EXTERNAL.
