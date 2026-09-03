import React, { useMemo } from 'react';
import { ArrowRight, Flame, Sparkles, Star } from 'lucide-react';
import { Place } from '../../types';
import { calculateVybeScore } from '../../hooks/useVybeScore';
import { useData } from '../../context/DataContext';

function rankForToday(place: Place, index: number) {
  const daySeed = new Date().toISOString().slice(0, 10).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ((Math.round(place.baseVybeScore) * 7 + daySeed + index * 13) % 100) + place.rating * 4;
}

export const VybeDailyDrop: React.FC = () => {
  const { places, openPlaceDetail } = useData();

  const picks = useMemo(() => {
    return [...places]
      .map((place, index) => ({ place, score: rankForToday(place, index) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ place }) => {
        const info = calculateVybeScore(place, {});
        return { place, info };
      });
  }, [places]);

  if (picks.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-5" aria-label="Today's VYBE picks">
      <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-vybe-dark-card shadow-lg">
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-vybe-citrus"><Flame className="w-3.5 h-3.5" /> DAILY DROP</span>
            <h2 className="font-display font-extrabold text-xl text-slate-900 dark:text-white mt-1">3 spots worth leaving home for today</h2>
            <p className="text-xs text-slate-500 mt-1">Rotated daily from the same live discovery pool as Explore.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500"><Sparkles className="w-3.5 h-3.5 text-vybe-lime" /> Fresh picks</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-white/10">
          {picks.map(({ place, info }, index) => (
            <button key={place.id} type="button" onClick={() => openPlaceDetail(place)} className="text-left p-5 hover:bg-slate-50 dark:hover:bg-vybe-dark-surface transition-colors group">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="w-7 h-7 rounded-xl bg-black text-vybe-lime dark:bg-vybe-lime dark:text-black flex items-center justify-center font-mono font-black text-xs">0{index + 1}</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500"><Star className="w-3.5 h-3.5 fill-current" /> {place.rating.toFixed(1)}</span>
              </div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white group-hover:text-vybe-lime transition-colors line-clamp-1">{place.name}</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{place.tagline || place.location.address}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-vybe-cyan">{info.score}% match</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 group-hover:text-vybe-lime">View vibe <ArrowRight className="w-3.5 h-3.5" /></span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
