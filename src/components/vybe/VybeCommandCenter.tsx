import React, { useMemo, useState } from 'react';
import { Sparkles, X, MapPin, Users, Clock3, WalletCards, Route, Flame, Check, Copy, Navigation, Zap } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { MoodType, Place } from '../../types';

const MOODS: Array<{ id: MoodType; label: string; emoji: string }> = [
  { id: 'chill', label: 'Chill', emoji: '🧊' }, { id: 'party', label: 'Party', emoji: '🔥' }, { id: 'romantic', label: 'Date', emoji: '💘' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' }, { id: 'creative', label: 'Creative', emoji: '🎨' }, { id: 'explore', label: 'Explore', emoji: '🧭' },
  { id: 'hungry', label: 'Food', emoji: '🍜' }, { id: 'energetic', label: 'Active', emoji: '⚡' },
];

const CITY_PRESETS = [
  { id: 'current', label: 'My location', lat: null as number | null, lng: null as number | null },
  { id: 'algiers', label: 'Algiers', lat: 36.7538, lng: 3.0588 }, { id: 'oran', label: 'Oran', lat: 35.6971, lng: -0.6308 },
  { id: 'setif', label: 'Sétif', lat: 36.1898, lng: 5.4108 }, { id: 'constantine', label: 'Constantine', lat: 36.365, lng: 6.6147 },
];

const MOOD_CATEGORY_WEIGHTS: Record<MoodType, Partial<Record<Place['category'], number>>> = {
  chill: { 'chill-spots': 18, 'food-drink': 8, 'outdoors-nature': 8 },
  party: { nightlife: 24, entertainment: 8, 'food-drink': 5 },
  romantic: { 'food-drink': 16, nightlife: 12, 'chill-spots': 12, 'outdoors-nature': 8 },
  gaming: { 'arcade-gaming': 26, entertainment: 12 },
  creative: { 'arts-culture': 24, entertainment: 10, 'hidden-gems': 8 },
  explore: { 'hidden-gems': 18, 'arts-culture': 12, 'outdoors-nature': 10, 'shopping-vintage': 8 },
  hungry: { 'food-drink': 30, nightlife: 3 },
  energetic: { 'outdoors-nature': 18, entertainment: 14, 'arcade-gaming': 8 },
};

const MOOD_KEYWORDS: Record<MoodType, string[]> = {
  chill: ['cafe', 'coffee', 'park', 'chill', 'matcha', 'garden', 'spa'], party: ['club', 'music', 'night', 'bar', 'party', 'karaoke'],
  romantic: ['romantic', 'date', 'rooftop', 'sunset', 'garden'], gaming: ['gaming', 'arcade', 'playstation', 'xbox', 'game', 'bowling'],
  creative: ['gallery', 'museum', 'art', 'creative', 'workshop', 'culture'], explore: ['museum', 'market', 'hidden', 'historic', 'nature', 'adventure'],
  hungry: ['restaurant', 'food', 'ramen', 'taco', 'bakery', 'cafe', 'pizzeria', 'pizza'], energetic: ['gym', 'sport', 'stadium', 'pool', 'tennis', 'climb'],
};
const DISALLOWED_BY_MOOD: Record<MoodType, Place['category'][]> = {
  chill: [], party: ['shopping-vintage'], romantic: ['hospital' as Place['category']], gaming: ['chill-spots'], creative: [],
  explore: [], hungry: ['chill-spots', 'shopping-vintage'], energetic: ['chill-spots'],
};

function scorePlace(place: Place, mood: MoodType, budget: number, maxKm: number): number {
  const haystack = `${place.name} ${place.tagline} ${place.tags.join(' ')}`.toLowerCase();
  const categoryWeight = MOOD_CATEGORY_WEIGHTS[mood]?.[place.category] ?? 0;
  const keywordHit = (MOOD_KEYWORDS[mood] || []).reduce((sum, token) => sum + (haystack.includes(token) ? 4 : 0), 0);
  const hardPenalty = DISALLOWED_BY_MOOD[mood].includes(place.category) ? 35 : 0;
  const distance = typeof place.distanceKm === 'number' ? place.distanceKm : maxKm;
  const distanceScore = Math.max(0, 10 - Math.min(distance, maxKm) * 1.5);
  const budgetScore = budget <= 0 ? 0 : place.features.isFree ? 8 : Math.max(0, 10 - Math.max(0, place.approxCostUsd - budget / 2) / 4);
  const ratingScore = Math.min(10, Math.max(0, place.rating * 2));
  const openScore = place.openingHours.isOpenNow === true ? 5 : 0;
  return categoryWeight + keywordHit + distanceScore + budgetScore + ratingScore + openScore - hardPenalty;
}

function directionsUrl(place: Place) { return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.location.lat},${place.location.lng}`)}`; }

export const VybeCommandCenter: React.FC = () => {
  const { places, userLocation, discoveryLoading, discoverAtLocation, createPlan, addPlaceToPlan, setActiveTab, showToast } = useData();
  const { currentUser } = useAuth();
  const requireAuth = useRequireAuth();
  const [open, setOpen] = useState(false); const [mood, setMood] = useState<MoodType>('party'); const [budget, setBudget] = useState(3000);
  const [people, setPeople] = useState(3); const [durationHours, setDurationHours] = useState(5); const [city, setCity] = useState('current'); const [selected, setSelected] = useState<Place[]>([]); const [shareCopied, setShareCopied] = useState(false);
  const budgetUsd = budget / 135;
  const rankedPlaces = useMemo(() => [...places].map(place => ({ place, score: scorePlace(place, mood, budgetUsd, 5) })).sort((a,b)=>b.score-a.score).map(item=>item.place), [places, mood, budgetUsd]);
  const recommendations = useMemo(() => rankedPlaces.slice(0, 8), [rankedPlaces]);
  const routePlaces = selected.length ? selected : recommendations.slice(0, Math.min(3, Math.max(2, Math.ceil(durationHours / 2))));
  const estimatedUsd = routePlaces.reduce((sum, place) => sum + (place.features.isFree ? 0 : place.approxCostUsd), 0) * Math.max(1, people / 3);
  const budgetRemaining = Math.max(0, budgetUsd - estimatedUsd);
  const togglePlace = (place: Place) => setSelected(prev => prev.some(item => item.id === place.id) ? prev.filter(item => item.id !== place.id) : [...prev, place].slice(0, 5));
  const handleCityChange = (value: string) => { setCity(value); setSelected([]); const preset=CITY_PRESETS.find(item=>item.id===value); if(!preset)return; if(value==='current'){ if(userLocation)discoverAtLocation(userLocation); else showToast('GPS is not available yet. Choose a city to discover nearby spots.','📍','info'); return; } if(preset.lat!==null&&preset.lng!==null)discoverAtLocation({lat:preset.lat,lng:preset.lng,accuracy:0,timestamp:Date.now()}); };
  const buildNight = () => { if(!requireAuth())return; if(!routePlaces.length){showToast('Discover a few spots first, then build your night.','🧭','info');return;} const title=`${MOODS.find(i=>i.id===mood)?.label||'VYBE'} Night · ${people} people`; const plan=createPlan(title,mood,Math.round(budgetUsd)); routePlaces.forEach((place,index)=>addPlaceToPlan(plan.id,place.id,`${18+index*2}:00`)); setOpen(false);setActiveTab('plan');showToast(`${title} created with ${routePlaces.length} smart stops.`,'⚡','success'); };
  const shareNight = async () => { const first=routePlaces[0]; const params=new URLSearchParams(); if(first?.id)params.set('place',first.id); const url=`${window.location.origin}${params.toString()?`?${params.toString()}`:''}`; try{await navigator.clipboard.writeText(url);setShareCopied(true);showToast('VYBE link copied.','🔗','success');window.setTimeout(()=>setShareCopied(false),1800);}catch{setShareCopied(false);showToast('Copy failed — use the browser share controls instead.','⚠️','info');} };
  const cityPreset=CITY_PRESETS.find(item=>item.id===city); const locationLabel=cityPreset?.label||'My location';
  return <>
    <button type="button" onClick={()=>setOpen(true)} className="fixed right-4 bottom-24 sm:right-6 sm:bottom-8 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-black dark:bg-vybe-lime text-white dark:text-black border border-vybe-lime/60 font-display font-extrabold text-sm shadow-neon-lime hover:scale-105 active:scale-95 transition-all" aria-label="Open Build My Night planner"><Sparkles className="w-4 h-4"/><span>Build My Night</span></button>
    {open && <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-[2rem] bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-white/10 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 p-5 sm:p-6 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-vybe-dark-card/95 backdrop-blur-xl"><div><span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-vybe-lime"><Zap className="w-3.5 h-3.5"/> VYBE COMMAND CENTER</span><h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white mt-1">Build My Night</h2><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tell VYBE the constraints. It builds the route, budget and plan.</p></div><button type="button" onClick={()=>setOpen(false)} className="p-2 rounded-xl bg-slate-100 dark:bg-vybe-dark-surface text-slate-500 hover:text-white" aria-label="Close"><X className="w-5 h-5"/></button></div>
        <div className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3"><div className="lg:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-3"><MapPin className="w-4 h-4 text-vybe-cyan"/> Location</div><select value={city} onChange={e=>handleCityChange(e.target.value)} className="w-full p-3 rounded-xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border text-sm font-bold text-slate-900 dark:text-white">{CITY_PRESETS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select>{city==='current'&&!userLocation&&<p className="text-[11px] text-amber-500 mt-2">Location is not available yet. Choose a city above to discover without GPS.</p>}{discoveryLoading&&<p className="text-[11px] text-vybe-cyan mt-2 animate-pulse">Refreshing smart picks…</p>}</div>
            <label className="p-4 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2"><Users className="w-4 h-4 text-vybe-pink"/> Squad</span><input type="number" min={1} max={20} value={people} onChange={e=>setPeople(Math.min(20,Math.max(1,Number(e.target.value)||1)))} className="w-full p-3 rounded-xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border text-sm font-bold text-slate-900 dark:text-white"/></label>
            <label className="p-4 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2"><Clock3 className="w-4 h-4 text-vybe-cyan"/> Hours</span><input type="number" min={2} max={12} value={durationHours} onChange={e=>setDurationHours(Math.min(12,Math.max(2,Number(e.target.value)||2)))} className="w-full p-3 rounded-xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border text-sm font-bold text-slate-900 dark:text-white"/></label></div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><div className="flex flex-wrap items-center justify-between gap-3 mb-3"><span className="text-xs font-bold text-slate-500">Mood</span><span className="text-xs font-mono text-vybe-lime font-bold">{Math.round(budget)} DA · ~${Math.round(budgetUsd)}</span></div><div className="flex flex-wrap gap-2">{MOODS.map(item=><button key={item.id} type="button" onClick={()=>setMood(item.id)} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${mood===item.id?'bg-black text-white dark:bg-vybe-lime dark:text-black border-transparent':'bg-white dark:bg-vybe-dark-card text-slate-600 dark:text-slate-300 border-slate-200 dark:border-vybe-dark-border'}`}>{item.emoji} {item.label}</button>)}</div><div className="mt-4 grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] items-center gap-3"><WalletCards className="w-4 h-4 text-vybe-lime"/><input type="range" min="500" max="20000" step="250" value={budget} onChange={e=>setBudget(Number(e.target.value))} className="w-full accent-lime-400" aria-label="Budget in Algerian dinars"/><span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-300 min-w-24 text-right">{budget.toLocaleString()} DA</span></div></div>
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4"><div className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Smart Picks</h3><p className="text-[11px] text-slate-500">{locationLabel} · ranked for your vibe</p></div><span className="text-[11px] font-mono text-slate-400">{recommendations.length} candidates</span></div>{recommendations.length===0?<div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-center text-sm text-slate-500">No discovered places yet. Choose a city or enable location to populate the planner.</div>:recommendations.map(place=>{const isChosen=selected.some(item=>item.id===place.id);return <button key={place.id} type="button" onClick={()=>togglePlace(place)} className={`w-full text-left p-4 rounded-2xl border transition-all ${isChosen?'border-vybe-lime bg-vybe-lime/10':'border-slate-200 dark:border-vybe-dark-border bg-white dark:bg-vybe-dark-surface hover:border-vybe-lime/50'}`}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">{place.name}</p><p className="text-[11px] text-slate-500 truncate">{place.location.neighborhood||place.location.address||'Nearby'} · {place.priceLevel}</p></div><span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isChosen?'bg-vybe-lime text-black':'bg-slate-100 dark:bg-vybe-dark-card text-slate-400'}`}><Check className="w-3.5 h-3.5"/></span></div></button>;})}</div>
            <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Night Preview</h3><Route className="w-4 h-4 text-vybe-cyan"/></div><div className="rounded-2xl p-4 bg-black text-white border border-white/10 space-y-4"><div className="flex items-center justify-between text-xs"><span className="text-slate-400">Stops</span><strong>{routePlaces.length}</strong></div><div className="space-y-2">{routePlaces.map((place,index)=><div key={place.id} className="flex items-center gap-2 text-xs"><span className="w-6 h-6 rounded-lg bg-vybe-lime text-black font-mono font-black flex items-center justify-center">{index+1}</span><span className="truncate">{place.name}</span><a href={directionsUrl(place)} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="ml-auto text-vybe-cyan hover:text-white" aria-label={`Directions to ${place.name}`}><Navigation className="w-3.5 h-3.5"/></a></div>)}</div><div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs"><div><span className="text-slate-400">Estimated</span><p className="font-mono font-bold mt-0.5">{Math.round(estimatedUsd*135).toLocaleString()} DA</p></div><div><span className="text-slate-400">Remaining</span><p className="font-mono font-bold text-vybe-lime mt-0.5">{Math.round(budgetRemaining*135).toLocaleString()} DA</p></div></div><div className="flex gap-2"><button type="button" onClick={shareNight} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold"><Copy className="w-3.5 h-3.5"/> {shareCopied?'Copied':'Share'}</button><button type="button" onClick={buildNight} className="flex-[1.5] inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-vybe-lime text-black text-xs font-bold shadow-neon-lime"><Flame className="w-3.5 h-3.5"/> Build Plan</button></div></div></div></div>
          {currentUser&&<div className="p-4 rounded-2xl border border-vybe-cyan/20 bg-vybe-cyan/5 text-[11px] text-slate-500 dark:text-slate-300 flex items-center gap-2"><Sparkles className="w-4 h-4 text-vybe-cyan shrink-0"/> VYBE will keep this outing in your account so you can continue editing, sharing and opening each stop on the map.</div>}
        </div>
      </div>
    </div>}
  </>;
};
