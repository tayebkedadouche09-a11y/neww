type ApiRequest = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
type ApiResponse = { status: (code: number) => ApiResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void };

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const MAX_RADIUS_METERS = 50_000;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const ALLOWED_STATIC_CLAUSES = new Set(['amenity="restaurant"','amenity="fast_food"','amenity="cafe"','leisure="park"','leisure="garden"','amenity="cinema"','leisure="fitness_centre"','amenity="gym"','tourism="hotel"','tourism="hostel"','tourism="guest_house"','shop="mall"','shop="department_store"','shop="supermarket"','shop="clothes"','amenity="library"','tourism="museum"','amenity="museum"','leisure="sports_centre"','leisure="stadium"','leisure="pitch"','amenity="bar"','amenity="pub"','amenity="nightclub"','leisure="amusement_arcade"','leisure="bowling_alley"','amenity="internet_cafe"','amenity="game_centre"','amenity="music_venue"','amenity="theatre"','amenity="hospital"','amenity="clinic"','leisure="playground"','natural="beach"']);
const ALLOWED_BROAD_CLAUSES = new Set(['amenity~"restaurant|fast_food|cafe|bar|pub|nightclub|cinema|theatre|library|hospital|clinic|place_of_worship|music_venue|internet_cafe|game_centre"','leisure~"park|garden|playground|fitness_centre|sports_centre|stadium|pitch|amusement_arcade|bowling_alley"','tourism~"hotel|hostel|guest_house|museum|attraction"','shop~"mall|department_store|supermarket|clothes|books|second_hand|toys|gift"','natural="beach"']);
function text(value: unknown, fallback = ''): string { return typeof value === 'string' ? value.trim() : fallback; }
function clientIdentity(req: ApiRequest): string { const forwarded = req.headers['x-forwarded-for']; const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded; return text(raw).split(',')[0].trim() || 'unknown'; }
function rateLimited(key: string): boolean { const now = Date.now(); const current = requestBuckets.get(key); if (!current || current.resetAt <= now) { requestBuckets.set(key,{count:1,resetAt:now+WINDOW_MS}); return false; } current.count += 1; return current.count > MAX_REQUESTS_PER_WINDOW; }
function jsonBody(req: ApiRequest): Record<string, unknown> { if (!req.body) return {}; if (typeof req.body === 'string') { try { return JSON.parse(req.body) as Record<string, unknown>; } catch { return {}; } } return typeof req.body === 'object' ? req.body as Record<string, unknown> : {}; }
function buildQuery(lat:number,lng:number,radiusMeters:number,clauses:string[]):string { return `[out:json][timeout:10];(${clauses.map(c=>`nwr(around:${radiusMeters},${lat},${lng})[${c}];`).join('')});out center tags;`; }
function isSafeNameClause(clause:string):boolean { return /^name~"[A-Za-z0-9 .,_'()&+\-/\u00C0-\u024F\u0600-\u06FF]{1,100}",i$/.test(clause); }
async function requestMirror(endpoint:string, query:string):Promise<Response> { const controller = new AbortController(); const timeout = setTimeout(()=>controller.abort(),7000); try { return await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','User-Agent':'VYBE discovery proxy/1.0'},body:new URLSearchParams({data:query}),signal:controller.signal}); } finally { clearTimeout(timeout); } }

export default async function handler(req:ApiRequest,res:ApiResponse) {
  res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff');
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({error:'Method not allowed'}); }
  if (rateLimited(clientIdentity(req))) return res.status(429).json({error:'Too many discovery requests. Please try again later.'});
  const payload=jsonBody(req); const lat=Number(payload.lat); const lng=Number(payload.lng); const radiusMeters=Number(payload.radiusMeters);
  const clauses=Array.isArray(payload.clauses)?payload.clauses.filter((v):v is string=>typeof v==='string'&&v.length>0&&v.length<=300).filter(c=>ALLOWED_STATIC_CLAUSES.has(c)||ALLOWED_BROAD_CLAUSES.has(c)||isSafeNameClause(c)).slice(0,6):[];
  if(!Number.isFinite(lat)||lat<-90||lat>90||!Number.isFinite(lng)||lng<-180||lng>180) return res.status(400).json({error:'Invalid coordinates.'});
  if(!Number.isFinite(radiusMeters)||radiusMeters<=0||radiusMeters>MAX_RADIUS_METERS) return res.status(400).json({error:'Invalid radius.'});
  if(!clauses.length) return res.status(400).json({error:'No supported discovery filters supplied.'});
  const query=buildQuery(lat,lng,radiusMeters,clauses);
  const settled=await Promise.allSettled(ENDPOINTS.map(endpoint=>requestMirror(endpoint,query)));
  for(const result of settled){ if(result.status!=='fulfilled'||!result.value.ok) continue; const body=await result.value.text(); try{return res.status(200).json(JSON.parse(body));}catch{/* try next mirror */} }
  return res.status(503).json({error:'OpenStreetMap is temporarily unavailable. Showing other available results.'});
}
