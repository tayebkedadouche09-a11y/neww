import type { CategoryType, FilterState, Place, PlaceOpeningHours, PriceLevel, VybeCategory } from '../types/index.ts';
import { isGoogleMapsConfigured } from '../lib/env';
import { searchNearbyGooglePlaces, searchGooglePlacesText } from './googlePlaces';
import { haversineDistanceKm } from '../hooks/useGeolocation';
import { isGooglePlaceValidForRequest, classifyPlace } from './googlePlacesAdapter';
import { VYBE_CATEGORY_DEFINITIONS, categoryOsmClauses, categorySearchTypes, legacyCategoryToCanonical, normalizeCategoryQuery, placeMatchesCanonicalCategory } from '../data/categoryTaxonomy';

export interface DiscoveryOptions { userLat?: number; userLng?: number; radiusKm?: number; searchQuery?: string; filters?: Partial<FilterState>; }

const NON_DISCOVERABLE_GOOGLE_TYPES = new Set(['airport','bus_station','train_station','transit_station','school','university','hospital','doctor','pharmacy','dentist','police','fire_station','courthouse','government_office','post_office']);
const PERSISTENT_CACHE_VERSION = 'v1';
const PERSISTENT_CACHE_TTL_MS = 30 * 60 * 1000;
const PERSISTENT_CACHE_PREFIX = `vybe:discovery:${PERSISTENT_CACHE_VERSION}:`;

function canonicalTargets(options: DiscoveryOptions): VybeCategory[] {
  const raw = options.searchQuery?.trim() || options.filters?.searchQuery?.trim() || '';
  const queryTarget = normalizeCategoryQuery(raw);
  if (queryTarget) return [queryTarget];
  return [...new Set((options.filters?.categories ?? []).flatMap(legacyCategoryToCanonical))];
}

function deduplicate(places: Place[]): Place[] {
  const byKey = new Map<string, Place>();
  for (const place of places) {
    const key = place.providerPlaceId || place.id || `${place.name}:${place.location.lat}:${place.location.lng}`;
    const previous = byKey.get(key);
    if (!previous) byKey.set(key, place);
    else byKey.set(key, (place.reviewCount ?? 0) > (previous.reviewCount ?? 0) ? { ...previous, ...place } : previous);
  }
  return [...byKey.values()];
}
function withDistance(places: Place[], userLat?: number, userLng?: number): Place[] {
  if (userLat === undefined || userLng === undefined) return places;
  return places.map(place => Number.isFinite(place.location.lat) && Number.isFinite(place.location.lng) ? { ...place, distanceKm: haversineDistanceKm(userLat,userLng,place.location.lat,place.location.lng) } : place);
}
function enforceRadius(places: Place[], userLat?: number, userLng?: number, radiusKm = 5): Place[] {
  if (userLat === undefined || userLng === undefined) return places;
  return withDistance(places,userLat,userLng).filter(place => Number.isFinite(place.distanceKm) && (place.distanceKm ?? Infinity) <= radiusKm + 0.05);
}
function analyzePlace(place: Place): Place {
  if (place.canonicalCategory) {
    const definition = VYBE_CATEGORY_DEFINITIONS[place.canonicalCategory];
    return { ...place, category: definition.legacyCategory, primaryMood: definition.mood, tags: [...new Set([...(place.tags ?? []), place.canonicalCategory, definition.mood])].slice(0,20), description: place.description || place.name };
  }
  const classified = classifyPlace(place.providerTypes ?? place.tags, place.name);
  return { ...place, canonicalCategory: (place.providerTypes?.length ? undefined : place.canonicalCategory), category: classified.category, primaryMood: classified.mood, tags: [...new Set([...(place.tags ?? []), classified.category, classified.mood])].slice(0,20), description: place.description || place.name };
}
function matchesFilters(place: Place, filters?: Partial<FilterState>, targets: VybeCategory[] = []): boolean {
  const classified = analyzePlace(place);
  if (targets.length && !targets.some(target => placeMatchesCanonicalCategory(classified,target))) return false;
  if (filters?.categories?.length && !filters.categories.includes(classified.category)) return false;
  if (filters?.priceLevels?.length && !filters.priceLevels.includes(classified.priceLevel)) return false;
  if (filters?.onlyOpenNow && classified.openingHours.isOpenNow !== true) return false;
  if (filters?.onlyFree && !classified.features.isFree) return false;
  if (filters?.onlyHiddenGems && !classified.features.isSecretGem) return false;
  if (filters?.onlyLateNight && !classified.features.isLateNight) return false;
  if (filters?.maxDistanceKm !== undefined && (classified.distanceKm === undefined || classified.distanceKm > filters.maxDistanceKm)) return false;
  return true;
}
function normalize(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
function escapeOverpassRegex(value: string): string { return value.replace(/[\\"\n\r\[\]]/g,' ').trim(); }
function pickOsmCoordinates(element: any): {lat:number;lng:number}|null {
  if (Number.isFinite(element?.lat) && Number.isFinite(element?.lon)) return {lat:element.lat,lng:element.lon};
  if (Number.isFinite(element?.center?.lat) && Number.isFinite(element?.center?.lon)) return {lat:element.center.lat,lng:element.center.lon};
  return null;
}
function estimateOsmPrice(tags: Record<string,string>): PriceLevel { return tags.amenity==='place_of_worship'||tags.leisure==='park'||tags.leisure==='playground'||tags.natural==='beach'||tags.amenity==='library' ? 'free' : '$$'; }
function osmOpeningHours(tags: Record<string,string>): PlaceOpeningHours { const hours=tags.opening_hours||''; return {monday:hours,tuesday:hours,wednesday:hours,thursday:hours,friday:hours,saturday:hours,sunday:hours,isOpenNow:undefined}; }

function osmElementToPlace(element: any): Place|null {
  const tags: Record<string,string> = element?.tags || {};
  const name=String(tags.name||tags['name:fr']||tags['name:ar']||'').trim(); const coords=pickOsmCoordinates(element); if(!name||!coords)return null;
  const providerTypes=[tags.amenity,tags.leisure,tags.tourism,tags.shop,tags.sport,tags.natural,tags.religion,tags['theatre:type']].filter(Boolean) as string[];
  const searchText=[name,tags.description,tags['name:fr'],tags['name:ar']].filter(Boolean).join(' ');
  const normalizedSearch=normalize(searchText);
  const canonicalCandidates=Object.keys(VYBE_CATEGORY_DEFINITIONS) as VybeCategory[];
  const canonicalCategory=canonicalCandidates.find(category=>{
    const definition=VYBE_CATEGORY_DEFINITIONS[category];
    return definition.signals.some(signal=>normalizedSearch.includes(normalize(signal))) || definition.osmClauses.some(clause=>providerTypes.some(type=>clause.toLowerCase().includes(type.toLowerCase())));
  });
  const fallback=classifyPlace([...providerTypes,searchText],name);
  const canonical=canonicalCategory || legacyCategoryToCanonical(fallback.category)[0] || 'entertainment';
  const definition=VYBE_CATEGORY_DEFINITIONS[canonical]; const priceLevel=estimateOsmPrice(tags);
  return {
    id:`osm:${element.type}:${element.id}`, provider:'osm', providerPlaceId:`osm:${element.type}:${element.id}`, providerTypes, providerPrimaryType:providerTypes[0], canonicalCategory:canonical,
    name, tagline:[tags['addr:street'],tags['addr:city']].filter(Boolean).join(', ')||'Nearby place', description:tags.description||'', category:definition.legacyCategory, primaryMood:definition.mood, secondaryMoods:[],
    location:{address:[tags['addr:housenumber'],tags['addr:street'],tags['addr:suburb'],tags['addr:city']].filter(Boolean).join(', ')||name,neighborhood:tags['addr:suburb']||'',city:tags['addr:city']||'',lat:coords.lat,lng:coords.lng},
    priceLevel,approxCostUsd:0,rating:0,reviewCount:0,baseVybeScore:58,images:/^https?:\/\//i.test(tags.image||'')?[tags.image]:[],photoAttributions:[],
    tags:[...new Set([...providerTypes,...Object.values(tags).filter(v=>typeof v==='string'&&v.length<80),name])].slice(0,20),estimatedDuration:'',openingHours:osmOpeningHours(tags),
    features:{isFree:priceLevel==='free',isOutdoor:Boolean(tags.leisure||tags.natural==='beach'||tags.tourism==='camp_site'),isIndoor:Boolean(tags.amenity||tags.shop),hasFood:['restaurant','fast_food','cafe','pub','bar'].includes(tags.amenity),hasAlcohol:['bar','pub','nightclub'].includes(tags.amenity),isLateNight:/(?:24\/7|24 hours|00:?00|01:?00|02:?00|03:?00)/i.test(tags.opening_hours||''),isSecretGem:canonical==='tourist',isPetFriendly:/pet friendly|pets allowed/i.test(tags.description||''),isWifiFriendly:/wifi|internet/i.test(tags.internet_access||'')||Boolean(tags.internet_access),isPhotoSpot:Boolean(tags.image||tags.wikimedia_commons||tags.tourism==='attraction'),isAccessible:['yes','designated'].includes(tags.wheelchair||'')},
    suitableFor:['solo','friends','family','group'],website:tags.website,phone:tags.phone,instagram:tags['contact:instagram'],isFeatured:false,isTrending:false,reviews:[]
  };
}

async function fetchOsmPlaces(userLat:number,userLng:number,radiusKm:number,targets:VybeCategory[],searchQuery?:string):Promise<Place[]> {
  const normalizedQuery=normalize(searchQuery||'');
  const clauses=targets.length?categoryOsmClauses(targets):normalizedQuery?[`name~"${escapeOverpassRegex(normalizedQuery)}",i`]:[];
  if(!clauses.length)return [];
  const response=await fetch('/api/osm-discovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lat:userLat,lng:userLng,radiusMeters:Math.min(Math.max(radiusKm*1000,100),50000),clauses})});
  const payload=await response.json().catch(()=>({})); if(!response.ok)throw new Error((payload as {error?:string}).error||`OSM discovery failed (${response.status})`);
  const converted=(Array.isArray((payload as {elements?:unknown}).elements)?(payload as {elements:any[]}).elements:[]).map(osmElementToPlace).filter(Boolean) as Place[];
  return enforceRadius(deduplicate(converted),userLat,userLng,radiusKm).filter(place=>!targets.length||targets.some(target=>placeMatchesCanonicalCategory(place,target))).slice(0,250);
}

async function discoverGooglePlaces(options:DiscoveryOptions,targets:VybeCategory[]):Promise<Place[]> {
  if(!isGoogleMapsConfigured||options.userLat===undefined||options.userLng===undefined)return [];
  const radiusKm=options.radiusKm??5; const rawQuery=options.searchQuery?.trim()||options.filters?.searchQuery?.trim()||''; const canonicalQuery=normalizeCategoryQuery(rawQuery);
  if(targets.length){
    const includedTypes=categorySearchTypes(targets);
    let results=includedTypes.length?await searchNearbyGooglePlaces(options.userLat,options.userLng,radiusKm,includedTypes):[];
    results=results.filter(place=>!place.providerTypes?.some(type=>NON_DISCOVERABLE_GOOGLE_TYPES.has(type)));
    results=results.filter(place=>targets.some(target=>isGooglePlaceValidForRequest(place,{query:canonicalQuery||rawQuery,categories:options.filters?.categories})&&placeMatchesCanonicalCategory(place,target)));
    if(!results.length){
      for(const target of targets){
        const definition=VYBE_CATEGORY_DEFINITIONS[target];
        for(const textQuery of definition.googleTextQueries.slice(0,2)){
          for(const includedType of definition.googleIncludedTypes.slice(0,3)){
            const fallback=await searchGooglePlacesText(textQuery,options.userLat,options.userLng,radiusKm,includedType);
            const valid=fallback.filter(place=>isGooglePlaceValidForRequest(place,{query:textQuery,categories:options.filters?.categories})&&placeMatchesCanonicalCategory(place,target));
            results.push(...valid); if(results.length>=5)break;
          }
          if(results.length>=5)break;
        }
        if(results.length>=5)break;
      }
    }
    return enforceRadius(deduplicate(results),options.userLat,options.userLng,radiusKm);
  }
  if(rawQuery){
    const results=await searchGooglePlacesText(rawQuery,options.userLat,options.userLng,radiusKm);
    return enforceRadius(deduplicate(results.filter(place=>!place.providerTypes?.some(type=>NON_DISCOVERABLE_GOOGLE_TYPES.has(type)))),options.userLat,options.userLng,radiusKm);
  }
  const results=await searchNearbyGooglePlaces(options.userLat,options.userLng,radiusKm);
  return enforceRadius(deduplicate(results.filter(place=>!place.providerTypes?.some(type=>NON_DISCOVERABLE_GOOGLE_TYPES.has(type)))),options.userLat,options.userLng,radiusKm);
}

function isQuotaError(error:unknown):boolean { const message=error instanceof Error?error.message:String(error); return /RESOURCE_EXHAUSTED|quota exceeded|dailyLimitExceeded|rateLimitExceeded/i.test(message); }
function friendlyProviderError(error:unknown,provider:'Google Places'|'OpenStreetMap'):Error { const message=error instanceof Error?error.message:String(error); if(provider==='Google Places'&&isQuotaError(error))return new Error('Google Places quota is currently exhausted. Showing alternative local results where available.'); if(/404|504|timeout|timed out|unavailable/i.test(message))return new Error(`${provider} is temporarily unavailable. Showing other available results.`); return new Error(`${provider} is temporarily unavailable.`); }
const discoveryCache=new Map<string,{expiresAt:number;promise:Promise<Place[]>}>(); const DISCOVERY_CACHE_MS=20000;
function discoveryKey(options:DiscoveryOptions,targets:VybeCategory[]):string { const lat=options.userLat?.toFixed(4)||''; const lng=options.userLng?.toFixed(4)||''; const filters=options.filters||{}; return [lat,lng,options.radiusKm??5,JSON.stringify({searchQuery:normalize(options.searchQuery??filters.searchQuery??''),categories:[...(filters.categories??[])].sort(),priceLevels:[...(filters.priceLevels??[])].sort(),moods:[...(filters.moods??[])].sort(),maxBudget:filters.maxBudget??null,maxDistanceKm:filters.maxDistanceKm??null,duration:filters.duration??null,companion:filters.companion??null,onlyOpenNow:filters.onlyOpenNow??false,onlyFree:filters.onlyFree??false,onlyHiddenGems:filters.onlyHiddenGems??false,onlyLateNight:filters.onlyLateNight??false,sortBy:filters.sortBy??'vybe-score',targets})].join('|'); }
function persistentKey(key:string):string { return `${PERSISTENT_CACHE_PREFIX}${key}`; }
function readPersistentCache(key:string):Place[]|null {
  if(typeof window==='undefined') return null;
  try {
    const raw=window.localStorage.getItem(persistentKey(key)); if(!raw)return null;
    const parsed=JSON.parse(raw) as {savedAt?:number;places?:Place[]};
    if(!parsed.savedAt||Date.now()-parsed.savedAt>PERSISTENT_CACHE_TTL_MS||!Array.isArray(parsed.places))return null;
    return parsed.places;
  } catch { return null; }
}
function writePersistentCache(key:string,places:Place[]):void {
  if(typeof window==='undefined'||!places.length)return;
  try {
    window.localStorage.setItem(persistentKey(key),JSON.stringify({savedAt:Date.now(),places:places.slice(0,250)}));
  } catch { /* cache is best-effort */ }
}

export async function discoverPlaces(options:DiscoveryOptions):Promise<Place[]> {
  const targets=canonicalTargets(options); const key=discoveryKey(options,targets); const cached=discoveryCache.get(key); if(cached&&cached.expiresAt>Date.now())return cached.promise;
  const promise=(async()=>{
    const [googleResult,osmResult]=await Promise.allSettled([discoverGooglePlaces(options,targets),options.userLat===undefined||options.userLng===undefined?Promise.resolve([]):fetchOsmPlaces(options.userLat,options.userLng,options.radiusKm??5,targets,options.searchQuery||options.filters?.searchQuery)]);
    const googlePlaces=googleResult.status==='fulfilled'?googleResult.value:[]; const osmPlaces=osmResult.status==='fulfilled'?osmResult.value:[];
    if(googleResult.status==='rejected')console.warn('Google discovery unavailable:',friendlyProviderError(googleResult.reason,'Google Places'));
    if(osmResult.status==='rejected')console.warn('OSM discovery unavailable:',friendlyProviderError(osmResult.reason,'OpenStreetMap'));
    const fresh=enforceRadius(deduplicate([...googlePlaces,...osmPlaces]).map(analyzePlace),options.userLat,options.userLng,options.radiusKm??5).filter(place=>matchesFilters(place,options.filters,targets)).sort((a,b)=>(b.baseVybeScore-a.baseVybeScore)||((a.distanceKm??999)-(b.distanceKm??999))).slice(0,250);
    if(fresh.length){ writePersistentCache(key,fresh); return fresh; }
    const offline=readPersistentCache(key);
    if(offline?.length){
      return enforceRadius(deduplicate(offline.map(analyzePlace)),options.userLat,options.userLng,options.radiusKm??5).filter(place=>matchesFilters(place,options.filters,targets)).slice(0,250);
    }
    return fresh;
  })();
  discoveryCache.set(key,{expiresAt:Date.now()+DISCOVERY_CACHE_MS,promise}); promise.catch(()=>{if(discoveryCache.get(key)?.promise===promise)discoveryCache.delete(key);}); return promise;
}