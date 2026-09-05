/**
 * Deterministic race guards for discovery + photo identity.
 * These encode the production invariants without needing a live browser SPA driver.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isGooglePhotoIdentityExact } from '../api/_shared/classify.ts';

/** Pure model of DataContext discovery request versioning. */
function createDiscoveryRaceController() {
  let requestId = 0;
  let places: string[] = [];
  let loading = false;

  return {
    get places() {
      return places;
    },
    get loading() {
      return loading;
    },
    startSearch(label: string, delayMs: number, resolveWith: string[]) {
      const id = ++requestId;
      loading = true;
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Latest-search-wins: ignore stale responses
          if (id !== requestId) {
            resolve();
            return;
          }
          places = resolveWith;
          loading = false;
          resolve();
        }, delayMs);
      });
    },
  };
}

/** Pure model of place photo hydration race. */
function createPhotoHydrationController() {
  let currentPlaceId: string | null = null;
  let displayedPhoto: string | null = null;
  let displayedAsProviderMedia = false;

  return {
    get currentPlaceId() {
      return currentPlaceId;
    },
    get displayedPhoto() {
      return displayedPhoto;
    },
    get displayedAsProviderMedia() {
      return displayedAsProviderMedia;
    },
    openPlace(placeId: string) {
      currentPlaceId = placeId;
      displayedPhoto = null;
      displayedAsProviderMedia = false;
    },
    /** Simulate async photo arrival for a placeId that may no longer be current. */
    hydrate(placeId: string, photoResource: string, ok: boolean) {
      // Stale hydration must not attach
      if (placeId !== currentPlaceId) return;
      if (!ok) {
        displayedPhoto = 'FALLBACK';
        displayedAsProviderMedia = false;
        return;
      }
      if (!isGooglePhotoIdentityExact(placeId, photoResource)) {
        displayedPhoto = 'FALLBACK';
        displayedAsProviderMedia = false;
        return;
      }
      displayedPhoto = photoResource;
      displayedAsProviderMedia = true;
    },
  };
}

describe('Race guard \u2014 discovery Search A \u2192 Search B', () => {
  it('Search B wins when Search A resolves later (stale overwrite = 0)', async () => {
    const ctrl = createDiscoveryRaceController();
    const a = ctrl.startSearch('A', 40, ['place-A1', 'place-A2']);
    const b = ctrl.startSearch('B', 10, ['place-B1', 'place-B2', 'place-B3']);
    await Promise.all([a, b]);
    assert.deepEqual(ctrl.places, ['place-B1', 'place-B2', 'place-B3']);
    assert.equal(ctrl.loading, false);
  });

  it('failed Search A after successful Search B cannot clear B results', async () => {
    // A starts first (slow failure); B starts second (fast success).
    // When A later fails, its request id is stale and must not clear B.
    let requestId = 0;
    let places: string[] = [];
    const start = (delayMs: number, result: string[] | 'fail') => {
      const id = ++requestId;
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          if (id !== requestId) return resolve();
          if (result === 'fail') places = [];
          else places = result;
          resolve();
        }, delayMs);
      });
    };
    const pA = start(40, 'fail');
    const pB = start(10, ['B1']);
    await Promise.all([pA, pB]);
    assert.deepEqual(places, ['B1']);
  });
});

describe('Race guard \u2014 photo hydration Place A \u2192 Place B', () => {
  it('Place A photo must not attach after Place B is current', () => {
    const photo = createPhotoHydrationController();
    photo.openPlace('ChIJaaa');
    photo.openPlace('ChIJbbb');
    // Stale A response arrives
    photo.hydrate('ChIJaaa', 'places/ChIJaaa/photos/refA', true);
    assert.equal(photo.currentPlaceId, 'ChIJbbb');
    assert.equal(photo.displayedPhoto, null);
    assert.equal(photo.displayedAsProviderMedia, false);
  });

  it('rejects Place A id + Place B photo resource', () => {
    const photo = createPhotoHydrationController();
    photo.openPlace('ChIJbbb');
    photo.hydrate('ChIJbbb', 'places/ChIJaaa/photos/refA', true);
    assert.equal(photo.displayedPhoto, 'FALLBACK');
    assert.equal(photo.displayedAsProviderMedia, false);
  });

  it('failed hydration shows fallback not attributed as Google provider media', () => {
    const photo = createPhotoHydrationController();
    photo.openPlace('ChIJccc');
    photo.hydrate('ChIJccc', 'places/ChIJccc/photos/refC', false);
    assert.equal(photo.displayedPhoto, 'FALLBACK');
    assert.equal(photo.displayedAsProviderMedia, false);
  });

  it('exact identity photo attaches only for current place', () => {
    const photo = createPhotoHydrationController();
    photo.openPlace('ChIJddd');
    photo.hydrate('ChIJddd', 'places/ChIJddd/photos/refD', true);
    assert.equal(photo.displayedPhoto, 'places/ChIJddd/photos/refD');
    assert.equal(photo.displayedAsProviderMedia, true);
  });
});

describe('Race guard \u2014 map/detail place authority', () => {
  it('stale Place A detail payload cannot replace Place B selection', () => {
    let selectedId = 'A';
    let detailName = 'Place A';
    const open = (id: string, name: string) => {
      selectedId = id;
      detailName = name;
    };
    const applyStale = (id: string, name: string) => {
      if (id !== selectedId) return; // authority check
      detailName = name;
    };
    open('B', 'Place B');
    applyStale('A', 'Place A stale');
    assert.equal(selectedId, 'B');
    assert.equal(detailName, 'Place B');
  });
});
