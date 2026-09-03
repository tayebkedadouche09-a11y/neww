import React from "react";
import { ArrowDownUp, Gem, Moon, MapPin, Sparkles, X } from "lucide-react";
import { PriceLevel } from "../../types";
import { useData } from "../../context/DataContext";

export const FilterBar: React.FC = () => {
  const { filters, setFilters, resetFilters, filteredPlaces } = useData();

  const togglePrice = (price: PriceLevel) => {
    setFilters(prev => {
      const exists = prev.priceLevels.includes(price);
      return {
        ...prev,
        priceLevels: exists ? prev.priceLevels.filter(p => p !== price) : [...prev.priceLevels, price],
      };
    });
  };

  const hasActiveControls = Boolean(
    filters.searchQuery ||
    filters.priceLevels.length ||
    filters.onlyOpenNow ||
    filters.onlyFree ||
    filters.onlyHiddenGems ||
    filters.onlyLateNight
  );

  const placeTypeLabel = filters.searchQuery.trim();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-vybe-dark-border bg-white/80 dark:bg-vybe-dark-card/80 backdrop-blur-md px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-vybe-lime" />
              DISCOVERY CONTROLS
            </span>
            {placeTypeLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-vybe-lime/15 text-vybe-lime border border-vybe-lime/30 px-2.5 py-1 font-bold">
                <MapPin className="w-3 h-3" />
                {placeTypeLabel}
              </span>
            )}
            {filters.duration && (
              <span className="text-slate-500">⏱️ {filters.duration}</span>
            )}
            {filters.companion && (
              <span className="text-slate-500">👥 {filters.companion}</span>
            )}
            {filters.moods.length > 0 && (
              <span className="text-slate-500">✨ {filters.moods.length} vibes</span>
            )}
          </div>

          <span className="text-xs text-slate-500 font-mono">
            {filteredPlaces.length} matching spots
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setFilters(prev => ({ ...prev, onlyOpenNow: !prev.onlyOpenNow }))} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${filters.onlyOpenNow ? "bg-emerald-500/20 text-emerald-400 border-emerald-500" : "bg-white dark:bg-vybe-dark-surface text-slate-600 dark:text-slate-400 border-slate-200 dark:border-vybe-dark-border"}`}>
            <span className={`w-2 h-2 rounded-full ${filters.onlyOpenNow ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`} />
            Open Now
          </button>

          <button onClick={() => setFilters(prev => ({ ...prev, onlyFree: !prev.onlyFree }))} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filters.onlyFree ? "bg-vybe-lime/20 text-vybe-lime border-vybe-lime" : "bg-white dark:bg-vybe-dark-surface text-slate-600 dark:text-slate-400 border-slate-200 dark:border-vybe-dark-border"}`}>
            💸 Free Things
          </button>

          <button onClick={() => setFilters(prev => ({ ...prev, onlyHiddenGems: !prev.onlyHiddenGems }))} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${filters.onlyHiddenGems ? "bg-purple-500/20 text-purple-400 border-purple-500" : "bg-white dark:bg-vybe-dark-surface text-slate-600 dark:text-slate-400 border-slate-200 dark:border-vybe-dark-border"}`}>
            <Gem className="w-3.5 h-3.5" />
            Hidden Gems
          </button>

          <button onClick={() => setFilters(prev => ({ ...prev, onlyLateNight: !prev.onlyLateNight }))} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${filters.onlyLateNight ? "bg-pink-500/20 text-pink-400 border-pink-500" : "bg-white dark:bg-vybe-dark-surface text-slate-600 dark:text-slate-400 border-slate-200 dark:border-vybe-dark-border"}`}>
            <Moon className="w-3.5 h-3.5" />
            Late Night
          </button>

          <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-white/10">
            {(["$", "$$", "$$$"] as PriceLevel[]).map(p => (
              <button key={p} onClick={() => togglePrice(p)} className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${filters.priceLevels.includes(p) ? "bg-slate-900 text-white dark:bg-white dark:text-black border-transparent" : "bg-white dark:bg-vybe-dark-surface text-slate-500 border-slate-200 dark:border-vybe-dark-border"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <ArrowDownUp className="w-3.5 h-3.5" />
            <select value={filters.sortBy} onChange={e => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))} className="bg-white dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-vybe-lime cursor-pointer">
              <option value="vybe-score">🔥 Highest VYBE Score</option>
              <option value="rating">⭐ Highest Rated</option>
              <option value="price-asc">💰 Budget: Low to High</option>
              <option value="distance">📍 Closest Distance</option>
              <option value="trending">⚡ Trending Now</option>
            </select>
          </div>

          {hasActiveControls && (
            <button onClick={resetFilters} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-all">
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-1">
        <span>Explore is driven by the same discovery engine as the map.</span>
        {filters.duration && <span className="text-vybe-lime font-bold">⏱️ Plan: {filters.duration}</span>}
      </div>
    </div>
  );
};