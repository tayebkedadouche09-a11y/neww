type ApiRequest = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
type ApiResponse = { status: (code:number)=>ApiResponse; json: (body:unknown)=>void; setHeader: (name:string,value:string)=>void };

const WINDOW_MS=60_000, MAX_REQUESTS=12;
const buckets=new Map<string,{count:number;resetAt:number}>();
function text(value:unknown):string{return typeof value==='string'?value.trim():'';}
function bodyOf(req:ApiRequest):Record<string,unknown>{if(!req.body)return{};if(typeof req.body==='string'){try{return JSON.parse(req.body) as Record<string,unknown>}catch{return{}}}return typeof req.body==='object'?req.body as Record<string,unknown>:{};}
function clientId(req:ApiRequest){const raw=req.headers['x-forwarded-for'];const value=Array.isArray(raw)?raw[0]:raw;return text(value).split(',')[0]||'unknown';}
function limited(key:string){const now=Date.now(),b=buckets.get(key);if(!b||b.resetAt<=now){buckets.set(key,{count:1,resetAt:now+WINDOW_MS});return false;}b.count+=1;return b.count>MAX_REQUESTS;}

export default async function handler(req:ApiRequest,res:ApiResponse){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
  const key=text(process.env.GEMINI_API_KEY)||text(process.env.GOOGLE_GEMINI_API_KEY);
  if(!key)return res.status(503).json({error:'VYBE AI is not configured on the server yet.'});
  if(limited(clientId(req)))return res.status(429).json({error:'VYBE AI is busy. Please try again in a moment.'});
  const payload=bodyOf(req),query=text(payload.query),language=text(payload.language)||'auto',userContext=text(payload.userContext);
  const rawPlaces=Array.isArray(payload.places)?payload.places:[];
  const places=rawPlaces.slice(0,40).filter((v):v is Record<string,unknown>=>!!v&&typeof v==='object').map(p=>({
    id:text(p.id),name:text(p.name),category:text(p.category),canonicalCategory:text(p.canonicalCategory),rating:typeof p.rating==='number'?p.rating:0,
    reviews:typeof p.reviewCount==='number'?p.reviewCount:0,cost:typeof p.approxCostUsd==='number'?p.approxCostUsd:0,distanceKm:typeof p.distanceKm==='number'?p.distanceKm:null,
    address:text(p.address),mood:text(p.primaryMood),duration:text(p.estimatedDuration),tags:Array.isArray(p.tags)?p.tags.filter((x):x is string=>typeof x==='string').slice(0,10):[]
  }));
  if(!query||query.length>1500)return res.status(400).json({error:'Please enter a short request.'});
  const placeContext=JSON.stringify(places);
  const systemInstruction=`You are VYBE AI Concierge, the web evolution of Goo's AI Concierge. You help people decide where to go using ONLY the supplied VYBE places. Never invent a venue, address, rating, price, or fact. Prefer local, nearby, relevant results. You can reason over mood, companions, budget, duration and category. Answer in the user's language when clear (Arabic, French, or English). Keep recommendations practical and concise. When the user asks for a plan, give a simple ordered itinerary with times, places, approximate spend and short reasons. IMPORTANT: use place IDs/names from the provided list only.\n\nLanguage hint: ${language}\nUser context: ${userContext}\nAvailable places: ${placeContext}`;
  try{
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({systemInstruction:{parts:[{text:systemInstruction}]},contents:[{role:'user',parts:[{text:query}]}]})});
    const data=await response.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>};
    if(!response.ok){console.error('[VYBE AI] Gemini error',response.status);return res.status(502).json({error:'VYBE AI could not answer right now.'});}
    const answer=data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim();
    if(!answer)return res.status(502).json({error:'VYBE AI returned an empty answer.'});
    return res.status(200).json({answer,model:'gemini-3.8-flash'});
  }catch(error){console.error('[VYBE AI] request failed',error);return res.status(502).json({error:'VYBE AI is temporarily unavailable.'});}
}
