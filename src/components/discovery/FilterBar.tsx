import React from "react";
import {
  SlidersHorizontal,
  Sparkles,
  MapPin,
  DollarSign,
  Moon,
  Gem,
  Check,
  X,
  Flame,
  ArrowDownUp,
} from "lucide-react";
import { INITIAL_CATEGORIES } from "../../data/initialCategories";
import { CategoryType, PriceLevel } from "../../types";
import { useData } from "../../context/DataContext";

export const FilterBar: React.FC = () => {
  const { filters, setFilters, resetFilters, filteredPlaces } = useData();

  const toggleCategory = (catId: CategoryType) => {
    setFilters((prev) => {
      const exists = prev.categories.includes(catId);
      return {
        ...prev,
        categories: exists
          ? prev.categories.filter((c) => c !== catId)
          : [...prev.categories, catId],
      };
    });
  };

  const togglePrice = (price: PriceLevel) => {
    setFilters((prev) => {
      const exists = prev.priceLevels.includes(price);
      return {
        ...prev,
        priceLevels: exists
          ? prev.priceLevels.filter((p) => p !== price)
          : [...prev.priceLevels, price],
      };
    });
  };

  const isFiltered =
    filters.searchQuery ||
    filters.categories.length > 0 ||
    filters.priceLevels.length > 0 ||
    filters.onlyOpenNow ||
    filters.onlyFree ||
    filters.onlyHiddenGems ||
    filters.onlyLateNight ||
    filters.moods.length > 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Category Pills (Horizontal Scrollable) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setFilters((prev) => ({ ...prev, categories: [] }))}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
            filters.categories.length === 0
              ? "bg-black text-white dark:bg-vybe-lime dark:text-black shadow-neon-lime"
              : "bg-white dark:bg-vybe-dark-surface text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-vybe-dark-border hover:border-slate-400"
          }`}
        >
          ✨ All Categories
        </button>

        {INITIAL_CATEGORIES.map((cat) => {
          const isSelected = filters.categories.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? "bg-black text-white dark:bg-vybe-lime dark:text-black border-transparent shadow-neon-lime"
                  : "bg-white dark:bg-vybe-dark-surface text-slate-700 dark:text-slate-300 border-slate-200 dark:border-vybe-dark-border hover:border-slate-400"
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Controls: Quick Toggles & Sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Quick Vibe Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Open Now Toggle */}
          <button
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                onlyOpenNow: !prev.onlyOpenNow,
              }))
            }
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              filters.onlyOpenNow
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
                : "bg-white dark:bg-vybe-dark-surface text-slate-600 dark:text-slate-400 border-slate-200 dark:border-vybe-dark-border"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${filters.onlyOpenNow ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`}
            />
            <span>Open Now</span>
          </button>

          {/* 100% Free Toggle */}
          <button
            onClick={() =>
              setFilters((prev) => ({ ...prev, onlyFree: !prev.onlyFree }))
            }
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              filters.onlyFree
                ? "bg-vybe-lime/20 text-vybe-lime border-vybe-lime"
                : "bg-white dark:bg-vybe-dark-surface text-slate-600 dark:text-slate-400 border-slate-200 dark:border-vybe-dark-border"
            }`}
          >
            <span>💸 Free Things</span>
          </button>

          {/* Hidden Gems Toggle */}
          <button
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                onlyHiddenGems: !prev.onlyHiddenGems,
              }))
            }
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              filters.onlyHiddenGems
                ? "bg-purple-500/20 text-purple-400 border-purple-500"
                : "bg-white dark:bg-vybe-dark-surface text-slate-600 dark:text-slate-400 border-slate-200 dark:border-vybe-dark-border"
            }`}
          >
            <Gem className="w-3.5 h-3.5" />
            <span>Hidden Gems</span>
          </button>

          {/* Late Night Toggle */}
          <button
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                onlyLateNight: !prev.onlyLateNight,
              }))
            }
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              filters.onlyLateNight
                ? "bg-pink-500/20 text-pink-400 border-pink-500"
                : "bg-white dark:bg-vybe-dark-surface text-slate-600 dark:text-slate-400 border-slate-200 dark:border-vybe-dark-border"
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Late Night</span>
          </button>

          {/* Price Pills */}
          <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-white/10">
            {(["$", "$$", "$$$"] as PriceLevel[]).map((p) => (
              <button
                key={p}
                onClick={() => togglePrice(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                  filters.priceLevels.includes(p)
                    ? "bg-slate-900 text-white dark:bg-white dark:text-black border-transparent"
                    : "bg-white dark:bg-vybe-dark-surface text-slate-500 border-slate-200 dark:border-vybe-dark-border"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Sort & Reset */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <ArrowDownUp className="w-3.5 h-3.5" />
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  sortBy: e.target.value as any,
                }))
              }
              className="bg-white dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-vybe-lime cursor-pointer"
            >
              <option value="vybe-score">🔥 Highest VYBE Score</option>
              <option value="rating">⭐ Highest Rated</option>
              <option value="price-asc">💰 Budget: Low to High</option>
              <option value="distance">📍 Closest Distance</option>
              <option value="trending">⚡ Trending Now</option>
            </select>
          </div>

          {isFiltered && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Count & Feedback */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-1">
        <span>
          Showing {filteredPlaces.length} spots tailored to your energy
        </span>
        {filters.duration && (
          <span className="text-vybe-lime font-bold">
            ⏱️ Plan: {filters.duration} duration
          </span>
        )}
      </div>
    </div>
  );
};
