import React, { useMemo, useState } from 'react';
import { Bot, X, Send, Sparkles, Route, Users, WalletCards, Clock3, Plus, CheckCircle2 } from 'lucide-react';
import { Place } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { askVybeAi, buildGooStyleItinerary } from '../../services/aiConcierge';

const QUICK_PROMPTS=['Where should I go tonight with friends?','Give me a cheap date idea nearby.','I have 3 hours — what should I do?','Find me something chill and interesting.'];

export const VybeAiConcierge:React.FC=()=>{
  const { places, createPlan, addPlaceToPlan, setActiveTab, showToast }=useData();
  const { currentUser }=useAuth();
  const requireAuth=useRequireAuth();
  const [open,setOpen]=useState(false);
  const [mode,setMode]=useState<'chat'|'itinerary'>('chat');
  const [query,setQuery]=useState('');
  const [answer,setAnswer]=useState('');
  const [loading,setLoading]=useState(false);
  const [companion,setCompanion]=useState('friends');
  const [budget,setBudget]=useState(3000);
  const [hours,setHours]=useState(5);
  const [created,setCreated]=useState(false);

  const compactPlaces=useMemo(()=>places.slice(0,40),[places]);
  const itinerary=useMemo(()=>buildGooStyleItinerary(compactPlaces,companion,Math.max(0,budget/135),hours),[compactPlaces,companion,budget,hours]);

  const ask=async(text?:string)=>{
    const prompt=(text??query).trim();
    if(!prompt)return;
    if(!places.length){showToast('Discover some nearby places first so VYBE AI has real options to work with.','🧭','info');return;}
    setLoading(true);setAnswer('');
    try{
      const context=[
        currentUser?.name?`Name: ${currentUser.name}`:'',
        currentUser?.location?`Location: ${currentUser.location}`:'',
        currentUser?.favoriteMoods?.length?`Favorite moods: ${currentUser.favoriteMoods.join(', ')}`:'',
      ].filter(Boolean).join(' · ');
      const result=await askVybeAi({query:prompt,places:compactPlaces,language:navigator.language,userContext:context});
      setAnswer(result.answer);
    }catch(error){showToast(error instanceof Error?error.message:'VYBE AI is unavailable right now.','⚠️','info');}
    finally{setLoading(false);}
  };

  const createAiPlan=()=>{
    if(!requireAuth())return;
    if(!itinerary.stops.length){showToast('VYBE needs a few more compatible spots to build this itinerary.','🧭','info');return;}
    const title=`AI ${companion} adventure · ${itinerary.stops.length} stops`;
    const plan=createPlan(title,'explore',Math.round(budget/135));
    itinerary.stops.forEach(stop=>addPlaceToPlan(plan.id,stop.place.id,stop.startTime,stop.place));
    setCreated(true);showToast(`${title} created with real VYBE places.`,'✨','success');
    window.setTimeout(()=>{setOpen(false);setCreated(false);setActiveTab('plan');},500);
  };

  return <>
    <button type="button" onClick={()=>setOpen(true)} className="fixed left-4 bottom-24 sm:left-6 sm:bottom-8 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-vybe-lime text-black border-2 border-black/10 font-display font-extrabold text-sm shadow-neon-lime hover:scale-105 active:scale-95 transition-all" aria-label="Open VYBE AI Concierge">
      <Bot className="w-4 h-4"/><span>Ask VYBE AI</span>
    </button>
    {open&&<div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-[2rem] bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-white/10 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 p-5 sm:p-6 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-vybe-dark-card/95 backdrop-blur-xl">
          <div><span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-vybe-lime"><Sparkles className="w-3.5 h-3.5"/> VYBE INTELLIGENCE</span><h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white mt-1">AI Concierge</h2><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Goo-style concierge, powered by your real VYBE discoveries.</p></div>
          <button type="button" onClick={()=>setOpen(false)} className="p-2 rounded-xl bg-slate-100 dark:bg-vybe-dark-surface text-slate-500 hover:text-white" aria-label="Close"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-vybe-dark-surface w-fit">
            <button type="button" onClick={()=>setMode('chat')} className={`px-4 py-2 rounded-xl text-xs font-black ${mode==='chat'?'bg-black text-white dark:bg-vybe-lime dark:text-black':'text-slate-500'}`}>Ask anything</button>
            <button type="button" onClick={()=>setMode('itinerary')} className={`px-4 py-2 rounded-xl text-xs font-black ${mode==='itinerary'?'bg-black text-white dark:bg-vybe-lime dark:text-black':'text-slate-500'}`}><Route className="w-3.5 h-3.5 inline mr-1"/>Build itinerary</button>
          </div>
          {mode==='chat'?<>
            <div className="grid sm:grid-cols-2 gap-2">{QUICK_PROMPTS.map(item=><button type="button" key={item} onClick={()=>{setQuery(item);void ask(item)}} className="text-left p-3 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-vybe-lime/60 transition-colors">{item}</button>)}</div>
            <div className="flex items-end gap-2"><textarea value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();void ask()}}} placeholder="Tell VYBE what kind of outing you want…" rows={3} className="flex-1 p-4 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white outline-none focus:border-vybe-lime"/><button type="button" onClick={()=>void ask()} disabled={loading||!query.trim()} className="p-4 rounded-2xl bg-black text-vybe-lime dark:bg-vybe-lime dark:text-black font-black disabled:opacity-50" aria-label="Ask VYBE AI"><Send className="w-5 h-5"/></button></div>
            <div className="min-h-32 rounded-3xl bg-slate-950 text-white p-5 border border-white/10">{loading?<div className="flex items-center gap-2 text-vybe-lime text-sm font-bold animate-pulse"><Sparkles className="w-4 h-4"/> VYBE is thinking from real nearby places…</div>:answer?<div className="whitespace-pre-wrap text-sm leading-6 text-slate-100">{answer}</div>:<p className="text-sm text-slate-400">Ask in Arabic, French, English, or mix them. VYBE will only use places currently discovered in your area.</p>}</div>
          </>:<>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="p-4 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2"><Users className="w-4 h-4"/> Squad</span><select value={companion} onChange={e=>setCompanion(e.target.value)} className="w-full p-2.5 rounded-xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border text-sm font-bold text-slate-900 dark:text-white"><option value="solo">Solo</option><option value="friends">Friends</option><option value="couple">Couple</option><option value="family">Family</option></select></label>
              <label className="p-4 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2"><WalletCards className="w-4 h-4"/> Budget</span><input type="number" min={0} step={250} value={budget} onChange={e=>setBudget(Math.max(0,Number(e.target.value)||0))} className="w-full p-2.5 rounded-xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border text-sm font-bold text-slate-900 dark:text-white"/><span className="text-[10px] text-slate-400">DA · about ${Math.round(budget/135)}</span></label>
              <label className="p-4 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2"><Clock3 className="w-4 h-4"/> Time</span><input type="number" min={2} max={12} value={hours} onChange={e=>setHours(Math.min(12,Math.max(2,Number(e.target.value)||2)))} className="w-full p-2.5 rounded-xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border text-sm font-bold text-slate-900 dark:text-white"/><span className="text-[10px] text-slate-400">hours available</span></label>
            </div>
            <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-950 via-vybe-dark-card to-black text-white space-y-4 border border-white/10">
              <div><span className="text-[11px] font-mono text-vybe-lime font-bold">PERSONALIZED ADVENTURE FLOW</span><h3 className="font-display font-black text-2xl mt-1">{itinerary.stops.length?`${itinerary.stops.length}-stop ${companion} plan`:'Not enough compatible stops yet'}</h3><p className="text-xs text-slate-400 mt-1">Real VYBE places · ~${Math.round(itinerary.totalCost)} per person · {itinerary.totalMinutes?`${Math.floor(itinerary.totalMinutes/60)}h ${itinerary.totalMinutes%60}m`:'—'}</p></div>
              <div className="space-y-2">{itinerary.stops.map((stop,index)=><div key={stop.place.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10"><span className="w-8 h-8 shrink-0 rounded-full bg-vybe-lime text-black flex items-center justify-center font-black text-xs">{index+1}</span><div className="min-w-0 flex-1"><p className="font-bold text-sm truncate">{stop.place.name}</p><p className="text-[11px] text-slate-400 truncate">{stop.startTime} · {stop.durationMinutes}m · {stop.note}</p></div><button type="button" onClick={()=>setMode('chat')} className="text-slate-400 hover:text-vybe-lime" aria-label={`Ask about ${stop.place.name}`}><Bot className="w-4 h-4"/></button></div>)}</div>
              <button type="button" onClick={createAiPlan} disabled={!itinerary.stops.length||created} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-vybe-lime text-black font-display font-black text-sm shadow-neon-lime disabled:opacity-60">{created?<><CheckCircle2 className="w-4 h-4"/> Created</>:<><Plus className="w-4 h-4"/> Save this itinerary to My Plans</>}</button>
              <p className="text-[10px] text-slate-500 text-center">Saving requires a VYBE account. The plan uses the same place IDs and Supabase planner as the existing app.</p>
            </div>
          </>}
        </div>
      </div>
    </div>}
  </>;
};
