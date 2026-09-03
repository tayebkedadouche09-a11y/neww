import { classifyProviderPlace } from '../src/data/categoryTaxonomy';

type ApiRequest = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown; };
type ApiResponse = { status:(code:number)=>ApiResponse; json:(body:unknown)=>void; setHeader:(name:string,value:string)=>void; };

const MAX_PLACE_ID_LENGTH=300, WINDOW_MS=60_000, MAX_REQUESTS_PER_WINDOW=20;
const requestBuckets=new Map<string,{count:number;resetAt:number}>();
function text(value:unknown,fallback=''):string{return typeof value==='string'?value.trim():fallback;}
function getBearerToken(req:ApiRequest):string|null{const raw=req.headers.authorization;const header=Array.isArray(raw)?raw[0]:raw;if(!header?.startsWith('Bearer '))return null;const token=header.slice(7).trim();return token||null;}
function clientIdentity(req:ApiRequest):string{const raw=req.headers['x-forwarded-for'];const value=Array.isArray(raw)?raw[0]:raw;return text(value).split(',')[0].trim()||'unknown';}
function rateLimited(key:string):boolean{const now=Date.now(),current=requestBuckets.get(key);if(!current||current.resetAt<=now){requestBuckets.set(key,{count:1,resetAt:now+WINDOW_MS});return false;}current.count+=1;return current.count>MAX_REQUESTS_PER_WINDOW;}
function googlePriceToVybe(priceLevel:string|undefined):string|null{switch(priceLevel){case'PRICE_LEVEL_FREE':return'free';case'PRICE_LEVEL_INEXPENSIVE':return'$';case'PRICE_LEVEL_MODERATE':return'$$';case'PRICE_LEVEL_EXPENSIVE':return'$$$';case'PRICE_LEVEL_VERY_EXPENSIVE':return'$$$$';default:return null;}}
function approxCost(priceLevel:string|undefined):number{switch(priceLevel){case'PRICE_LEVEL_FREE':return 0;case'PRICE_LEVEL_INEXPENSIVE':return 10;case'PRICE_LEVEL_MODERATE':return 25;case'PRICE_LEVEL_EXPENSIVE':return 50;case'PRICE_LEVEL_VERY_EXPENSIVE':return 100;default:return 0;}}
function jsonBody(req:ApiRequest):Record<string,unknown>{if(!req.body)return{};if(typeof req.body==='string'){try{return JSON.parse(req.body) as Record<string,unknown>;}catch{return{};}}return typeof req.body==='object'?req.body as Record<string,unknown>:{};}
async function readJson(response:Response):Promise<Record<string,unknown>>{const body=await response.text();try{return body?JSON.parse(body) as Record<string,unknown>:{};}catch{return{};}}

export default async function handler(req:ApiRequest,res:ApiResponse){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  const supabaseUrl=text(process.env.SUPABASE_URL),supabaseAnonKey=text(process.env.SUPABASE_ANON_KEY),supabaseServiceRoleKey=text(process.env.SUPABASE_SERVICE_ROLE_KEY),googleServerKey=text(process.env.GOOGLE_PLACES_SERVER_API_KEY);
  if(!supabaseUrl||!supabaseAnonKey||!supabaseServiceRoleKey||!googleServerKey)return res.status(503).json({error:'Server-side Google verification is not configured.'});
  const token=getBearerToken(req);if(!token)return res.status(401).json({error:'Authentication required.'});
  if(rateLimited(`${clientIdentity(req)}:${token.slice(0,24)}`))return res.status(429).json({error:'Too many requests. Please try again later.'});
  const payload=jsonBody(req),placeId=text(payload.placeId);
  if(!placeId||placeId.length>MAX_PLACE_ID_LENGTH||!/^[A-Za-z0-9_-]+$/.test(placeId))return res.status(400).json({error:'Invalid Google place ID.'});

  const authResponse=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{apikey:supabaseAnonKey,Authorization:`Bearer ${token}`}});
  if(!authResponse.ok)return res.status(401).json({error:'Invalid or expired session.'});
  const googleResponse=await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,{headers:{'Content-Type':'application/json','X-Goog-Api-Key':googleServerKey,'X-Goog-FieldMask':'id,displayName,formattedAddress,location,types,primaryType,rating,userRatingCount,priceLevel,websiteUri,nationalPhoneNumber,businessStatus'}});
  if(!googleResponse.ok)return res.status(502).json({error:'Google Places verification failed.'});

  const google=await readJson(googleResponse),verifiedId=text(google.id),nameObj=google.displayName as Record<string,unknown>|undefined,verifiedName=text(nameObj?.text),location=google.location as Record<string,unknown>|undefined;
  const latitude=typeof location?.latitude==='number'?location.latitude:null,longitude=typeof location?.longitude==='number'?location.longitude:null;
  const types=Array.isArray(google.types)?google.types.filter((v):v is string=>typeof v==='string').slice(0,30):[];
  const primaryType=text(google.primaryType)||undefined;
  if(verifiedId!==placeId||!verifiedName)return res.status(422).json({error:'Google returned an invalid place identity.'});
  if(latitude!==null&&(latitude<-90||latitude>90))return res.status(422).json({error:'Invalid place latitude.'});
  if(longitude!==null&&(longitude<-180||longitude>180))return res.status(422).json({error:'Invalid place longitude.'});

  const classification=classifyProviderPlace(types,primaryType,verifiedName);
  const existingResponse=await fetch(`${supabaseUrl}/rest/v1/places?select=id,provider&external_place_id=eq.${encodeURIComponent(placeId)}&limit=1`,{headers:{apikey:supabaseServiceRoleKey,Authorization:`Bearer ${supabaseServiceRoleKey}`}});
  if(existingResponse.ok){const existing=await existingResponse.json() as Array<{id?:string;provider?:string}>;if(existing[0]?.id&&existing[0]?.provider==='google')return res.status(200).json({id:existing[0].id});}

  const row={
    id:`google:${placeId}`,external_place_id:placeId,provider:'google',name:verifiedName.slice(0,500),tagline:null,description:null,
    category:classification.legacyCategory,canonical_category:classification.canonicalCategory,primary_mood:classification.mood,secondary_moods:[],provider_types:types,provider_primary_type:primaryType||null,
    latitude,longitude,address:text(google.formattedAddress)||null,neighborhood:null,city:null,price_level:googlePriceToVybe(text(google.priceLevel)||undefined),approx_cost_usd:approxCost(text(google.priceLevel)||undefined),
    rating:typeof google.rating==='number'?Math.max(0,Math.min(5,google.rating)):0,review_count:typeof google.userRatingCount==='number'?Math.max(0,Math.floor(google.userRatingCount)):0,base_vybe_score:75,
    photos:[],tags:types.slice(0,15),estimated_duration:'',opening_hours:{},features:{},suitable_for:[],website:text(google.websiteUri)||null,phone:text(google.nationalPhoneNumber)||null,instagram:null,featured:false,trending:false
  };
  const insertResponse=await fetch(`${supabaseUrl}/rest/v1/places`,{method:'POST',headers:{'Content-Type':'application/json',apikey:supabaseServiceRoleKey,Authorization:`Bearer ${supabaseServiceRoleKey}`,Prefer:'return=minimal'},body:JSON.stringify(row)});
  if(!insertResponse.ok){const error=await readJson(insertResponse);if(insertResponse.status===409)return res.status(200).json({id:row.id});console.error('[VYBE] Google place materialization failed',error);return res.status(500).json({error:'Could not persist verified Google place.'});}
  return res.status(200).json({id:row.id});
}
