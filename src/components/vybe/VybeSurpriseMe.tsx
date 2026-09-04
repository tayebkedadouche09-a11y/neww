import React, { useMemo, useState } from 'react';
import { Dice5, MapPin, Sparkles, X, ArrowRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Place } from '../../types';
import { fetchWeather, VYBEWeather } from '../../services/weatherService';

function weatherScore(place: Place, weather: VYBEWeather | null): number {
  if (!weather) return 0;
  const indoor = place.features.isIndoor && !place.features.isOutdoor;
  if (weather.recommendation === 'indoor') return indoor ? 30 : -20;
  if (weather.recommendation === 'outdoor') return place.features.isOutdoor ? 25 : indoor ? 2 : 8;
  return 6;
}

function surpriseScore(place: Place, weather: VYBEWeather | null): number {
  const distance = typeof place.distanceKm === 'number' ? place.distanceKm : 5;
  const fresh = place.isNew ? 8 : place.isTrending ? 5 : 0;
  const variety = place.features.isSecretGem ? 8 : 0;
  return (place.baseVybeScore || 70) + Math.max(0, 12 - distance * 2) + Math.min(10, place.rating * 2) + fresh + variety + weatherScore(place, weather) + Math.random() * 18;
}

export const VybeSurpriseMe: React.FC = () => {
  const { places, userLocation, openPlaceDetail, showToast } = useData();
  const [open, setOpen] = useState(false);
  const [weather, setWeather] = useState<VYBEWeather | null>(null);
  const [pick, setPick] = useState<Place | null>(null);
  const [rolling, setRolling] = useState(false);

  const candidates = useMemo(() => places.filter(place => Boolean(place.location.lat && place.location.lng)), [places]);

  const surprise = async () => {
    if (!candidates.length) {
      showToast('Discover some nearby places first, then let VYBE surprise you.', '🎲', 'info');
      return;
    }
    setRolling(true);
    let liveWeather: VYBEWeather | null = null;
    if (userLocation) liveWeather = await fetchWeather(userLocation.lat, userLocation.lng);
    setWeather(liveWeather);
    await new Promise(resolve => window.setTimeout(resolve, 450));
    const ranked = [...candidates].sort((a, b) => surpriseScore(b, liveWeather) - surpriseScore(a, liveWeather));
    const chosen = ranked[0];
    setPick(chosen);
    setOpen(true);
    setRolling(false);
  };

  return <>
    <button type="button" onClick={surprise} disabled={rolling} className="fixed left-4 bottom-40 sm:left-6 sm:bottom-24 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-vybe-dark-card text-slate-900 dark:text-white border border-slate-200 dark:border-vybe-dark-border font-display font-extrabold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-60" aria-label="Surprise me with a place">
      <Dice5 className={`w-4 h-4 text-vybe-pink ${rolling ? 'animate-spin' : ''}`} /><span>{rolling ? 'Picking…' : 'Surprise Me'}</span>
    </button>
    {open && pick && <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md p-4 flex items-center justify-center" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="w-full max-w-xl rounded-[2rem] overflow-hidden bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-white/10 shadow-2xl">
        <div className="p-6 bg-slate-950 text-white relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-vybe-lime/20 blur-2xl" />
          <div className="flex items-center justify-between gap-3 relative"><div><span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-vybe-lime"><Sparkles className="w-3.5 h-3.5" /> VYBE SURPRISE ENGINE</span><h2 className="font-display font-black text-2xl mt-2">Try this one.</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close surprise" className="p-2 rounded-xl bg-white/10 hover:bg-white/15"><X className="w-5 h-5" /></button></div>
        </div>
        <div className="p-6 space-y-5">
          {pick.images[0] && <img src={pick.images[0]} alt="" className="w-full h-48 object-cover rounded-2xl" loading="lazy" decoding="async" />}
          <div><p className="text-xs font-mono text-vybe-lime font-black uppercase">{pick.canonicalCategory || pick.category}</p><h3 className="font-display font-black text-2xl text-slate-900 dark:text-white mt-1">{pick.name}</h3><p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{pick.tagline || pick.location.address}</p></div>
          <div className="grid grid-cols-2 gap-3 text-xs"><div className="p-3 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface"><span className="text-slate-400">VYBE score</span><p className="font-black text-lg text-vybe-lime">{Math.round(pick.baseVybeScore || 70)}</p></div><div className="p-3 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface"><span className="text-slate-400">Distance</span><p className="font-black text-lg text-slate-900 dark:text-white">{typeof pick.distanceKm === 'number' ? `${pick.distanceKm.toFixed(1)} km` : 'Nearby'}</p></div></div>
          {weather && <div className="px-4 py-3 rounded-2xl bg-vybe-cyan/10 border border-vybe-cyan/20 text-xs text-slate-700 dark:text-slate-200"><span className="font-black">{weather.emoji} {weather.label}</span><span className="mx-2">·</span>{weather.recommendation === 'indoor' ? 'VYBE picked an indoor-friendly option.' : weather.recommendation === 'outdoor' ? 'Great moment for an outdoor vibe.' : 'Balanced weather — this spot fits either way.'}</div>}
          <div className="flex gap-2"><button type="button" onClick={() => { setOpen(false); openPlaceDetail(pick); }} className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-vybe-lime text-black font-display font-black text-sm shadow-neon-lime">Open details <ArrowRight className="w-4 h-4" /></button><button type="button" onClick={() => void surprise()} className="px-4 rounded-2xl bg-slate-100 dark:bg-vybe-dark-surface font-black text-sm"><Dice5 className="w-4 h-4" /></button></div>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><MapPin className="w-3.5 h-3.5" /> Picked from your current VYBE discoveries — not a seeded/demo venue.</p>
        </div>
      </div>
    </div>}
  </>;
};
