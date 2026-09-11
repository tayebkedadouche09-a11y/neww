/**
 * Contract test: every OSM clause the VYBE category taxonomy can emit must be
 * accepted by /api/osm-discovery. Before this test, the API kept its own
 * hand-maintained clause allowlist that drifted from the taxonomy, so several
 * categories (nightlife, arts-culture, wellness, hotel, entertainment) returned
 * HTTP 400 "No supported discovery filters supplied." and silently lost all
 * OpenStreetMap coverage.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/osm-discovery.ts';
import { VYBE_CATEGORY_DEFINITIONS } from '../api/_shared/classify.ts';

interface MockResponse { statusCode: number; body: unknown; }
function makeResponse(): { res: any; state: MockResponse } {
  const state: MockResponse = { statusCode: 200, body: null };
  const res: any = {
    status(code: number) { state.statusCode = code; return res; },
    json(body: unknown) { state.body = body; },
    setHeader() {},
  };
  return { res, state };
}

const OVERPASS_OK = JSON.stringify({ elements: [{ type: 'node', id: 1, lat: 36.75, lon: 3.05, tags: { name: 'Fixture' } }] });

test('every taxonomy OSM clause is accepted by the discovery API', async () => {
  const originalFetch = globalThis.fetch;
  let call = 0;
  globalThis.fetch = (async () => new Response(OVERPASS_OK, { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch;
  try {
    for (const definition of Object.values(VYBE_CATEGORY_DEFINITIONS)) {
      assert.ok(definition.osmClauses.length > 0, `${definition.id} must declare at least one OSM clause`);
      const { res, state } = makeResponse();
      await handler(
        {
          method: 'POST',
          headers: { 'x-forwarded-for': `10.0.0.${call += 1}` },
          body: { lat: 36.7538, lng: 3.0588, radiusMeters: 5000, clauses: definition.osmClauses },
        },
        res
      );
      assert.notEqual(
        state.statusCode,
        400,
        `${definition.id} clauses were rejected by the API (400): ${JSON.stringify(definitionsError(state.body))}`
      );
      assert.equal(state.statusCode, 200, `${definition.id} discovery should succeed (got ${state.statusCode})`);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('unsafe clauses are still rejected', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(OVERPASS_OK, { status: 200 })) as typeof fetch;
  try {
    for (const clause of ['];out;', 'amenity="restaurant"];out;', 'evil="x"', 'amenity~"restaurant|evil phrase"']) {
      const { res, state } = makeResponse();
      await handler(
        { method: 'POST', headers: { 'x-forwarded-for': '10.9.9.9' }, body: { lat: 36.75, lng: 3.05, radiusMeters: 5000, clauses: [clause] } },
        res
      );
      assert.equal(state.statusCode, 400, `unsafe clause must be rejected: ${clause}`);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function definitionsError(body: unknown): unknown {
  return (body as { error?: unknown })?.error ?? body;
}
