import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyProviderPlace, evaluatePlaceRelevance, extractCategoryHint, isGooglePhotoIdentityExact, VYBE_CATEGORY_DEFINITIONS } from '../api/_shared/classify.ts';

describe('CERT 180 place intelligence',()=>{
 it('uses Google primary type over misleading name',()=>{const x=classifyProviderPlace(['hotel','restaurant'],'hotel','Hotel XYZ Restaurant');assert.equal(x.canonicalCategory,'hotel');assert.equal(x.providerIdentityValid,true);assert.ok(x.secondaryCategories.includes('restaurant'));});
 it('keeps restaurant identity when name says games',()=>{const x=classifyProviderPlace(['restaurant'],'restaurant','Games Burger');assert.equal(x.canonicalCategory,'restaurant');assert.equal(x.secondaryCategories.includes('games'),false);});
 it('keeps mall identity while exposing cafe as provider-backed secondary service',()=>{const x=classifyProviderPlace(['shopping_mall','cafe'],'shopping_mall','Mega Mall Cafe');assert.equal(x.canonicalCategory,'shopping');assert.ok(x.secondaryCategories.includes('cafe'));});
 it('rejects unsupported strong provider identities instead of name overriding',()=>{const x=classifyProviderPlace(['hospital','pharmacy'],'hospital','Hospital Games Center');const r=evaluatePlaceRelevance({provider:'google',providerPlaceId:'ChIJHospital',providerTypes:['hospital','pharmacy'],providerPrimaryType:'hospital',name:'Hospital Games Center',query:'games'});assert.equal(x.providerIdentityValid,false);assert.equal(r.decision,'REJECT');});
 it('separates gaming intent from cafe identity',()=>{assert.equal(extractCategoryHint('gaming cafe'),'cafe');const r=evaluatePlaceRelevance({provider:'google',providerPlaceId:'ChIJCafe',providerTypes:['cafe','internet_cafe'],providerPrimaryType:'cafe',name:'Arcade Cafe',query:'gaming cafe'});assert.equal(r.canonicalCategory,'cafe');assert.equal(r.decision,'ACCEPT');assert.equal(r.intentMatch,'HIGH');});
 it('binds Google photo names to exact place IDs',()=>{assert.equal(isGooglePhotoIdentityExact('ChIJAAA','places/ChIJAAA/photos/abc'),true);assert.equal(isGooglePhotoIdentityExact('ChIJAAA','places/ChIJBBB/photos/abc'),false);assert.equal(isGooglePhotoIdentityExact('ChIJAAA','osm/node/123/photos/abc'),false);});
 it('covers every canonical category definition',()=>{assert.equal(Object.keys(VYBE_CATEGORY_DEFINITIONS).length,17);for(const definition of Object.values(VYBE_CATEGORY_DEFINITIONS))assert.ok(definition.googleIncludedTypes.length>0);});
});
