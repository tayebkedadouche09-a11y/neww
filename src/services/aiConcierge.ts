import { Place } from '../types';

export interface AiConciergeRequest { query:string; places:Place[]; language?:string; userContext?:string; }
export interface AiConciergeResponse { answer:string; model?:string; }

function compactPlace(place:Place){return{
  id:place.id,name:place.name,category:place.category,canonicalCategory:place.canonicalCategory,primaryMood:place.primaryMood,
  rating:place.rating,reviewCount:place.reviewCount,approxCostUsd:place.approxCostUsd,distanceKm:place.distanceKm,
  address:place.location.address,tags:place.tags.slice(0,10),estimatedDuration:place.estimatedDuration
};}

export async function askVybeAi(input:AiConciergeRequest):Promise<AiConciergeResponse>{
  const response=await fetch('/api/ai-concierge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    query:input.query,language:input.language||'auto',userContext:input.userContext||'',places:input.places.map(compactPlace)
  })});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(typeof data?.error==='string'?data.error:'VYBE AI is unavailable right now.');
  if(typeof data?.answer!=='string'||!data.answer.trim())throw new Error('VYBE AI returned no answer.');
  return {answer:data.answer,model:typeof data.model==='string'?data.model:undefined};
}

export function buildGooStyleItinerary(places:Place[],companion:string,budgetUsd:number,availableHours:number){
  const target=Math.max(120,Math.round(availableHours*60));
  const activities=places.filter(p=>['arcade-gaming','entertainment','outdoors-nature','arts-culture'].includes(p.category)).slice(0,1);
  const food=places.filter(p=>p.category==='food-drink').slice(0,1);
  const chill=places.filter(p=>['chill-spots','outdoors-nature'].includes(p.category)).slice(0,1);
  const candidates=[...activities,...food,...chill].filter((place,index,self)=>self.findIndex(p=>p.id===place.id)===index);
  const stops: Array<{place:Place;startTime:string;durationMinutes:number;note:string}> = [];
  let elapsed=0;
  for(const place of candidates){
    const duration=place.estimatedDuration==='15min'?15:place.estimatedDuration==='30min'?30:place.estimatedDuration==='1h'?60:place.estimatedDuration==='2h'?120:90;
    if(elapsed+duration+20>target+30)continue;
    const minutes=(18*60)+elapsed;
    const hh=String(Math.floor(minutes/60)%24).padStart(2,'0');
    const mm=String(minutes%60).padStart(2,'0');
    stops.push({place,startTime:`${hh}:${mm}`,durationMinutes:duration,note:`Great ${companion} stop · about $${Math.round(place.approxCostUsd)} per person`});
    elapsed+=duration+20;
  }
  const totalCost=stops.reduce((sum,s)=>sum+(s.place.features.isFree?0:s.place.approxCostUsd),0);
  return {stops,totalCost,budgetRemaining:Math.max(0,budgetUsd-totalCost),totalMinutes:elapsed};
}
