import React, { useMemo } from 'react';
import {
  ArrowDownUp,
  ArrowRight,
  Check,
  Clock3,
  Compass,
  Gem,
  MapPin,
  RotateCcw,
  Sparkles,
  Users,
  WalletCards,
} from 'lucide-react';
import { MoodType, CompanionType, FilterState, TimeDuration } from '../../types';
import { INITIAL_MOODS } from '../../data/initialMoods';
import { useData } from '../../context/DataContext';
import { PlaceCard } from '../cards/PlaceCard';

const USD_TO_DZD_DISPLAY = 130;

const PLACE_TYPES = [
  { id: 'mosque', query: 'mosque', label: 'Mosques', emoji: '🕌', flag: '🇩🇿' },
  { id: 'restaurant', query: 'restaurant', label: 'Restaurants', emoji: '🍽️' },
  { id: 'cafe', query: 'cafe', label: 'Cafés', emoji: '☕' },
  { id: 'park', query: 'park', label: 'Parks', emoji: '🌳' },
  { id: 'cinema', query: 'cinema', label: 'Cinema', emoji: '🎬' },
  { id: 'gym', query: 'gym', label: 'Gyms', emoji: '💪' },
  { id: 'hotel', query: 'hotel', label: 'Hotels', emoji: '🏨' },
  { id: 'shopping', query: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'library', query: 'library', label: 'Libraries', emoji: '📚' },
  { id: 'museum', query: 'museum', label: 'Museums', emoji: '🏛️' },
  { id: 'sports', query: 'sports center', label: 'Sports', emoji: '⚽' },
  { id: 'nightlife', query: 'nightlife', label: 'Nightlife', emoji: '🌙' },
  { id: 'arcade', query: 'arcade gaming', label: 'Arcades', emoji: '🎮' },
  { id: 'music', query: 'live music', label: 'Music', emoji: '🎵' },
  { id: 'hospital', query: 'hospital', label: 'Hospitals', emoji: '🏥' },
  { id: 'theatre', query: 'theatre', label: 'Theatre', emoji: '🎭' },
  { id: 'playground', query: 'playground', label: 'Playgrounds', emoji: '🛝' },
  { id: 'beach', query: 'beach', label: 'Beaches', emoji: '🏖️' },
] as const;

const TIME_OPTIONS: { value: TimeDuration; label: string; icon: string }[] = [
  { value: '15min', label: '15 min', icon: '⚡' },
  { value: '30min', label: '30 min', icon: '☕' },
  { value: '1h', label: '1 hour', icon: '⏱️' },
  { value: '2h', label: '2 hours', icon: '🌆' },
  { value: '3h+', label: '3+ hours', icon: '🚀' },
  { value: 'all-day', label: 'All day', icon: '🌅' },
];

const BUDGET_OPTIONS = [
  { value: 'free' as const, usd: undefined, label: 'Free', sub: '$0 / 0 DZD', icon: '💸' },
  { value: 10, label: 'Under $10', sub: `≈ ${10 * USD_TO_DZD_DISPLAY.toLocaleString()} DZD`, icon: '🪙' },
  { value: 25, label: 'Under $25', sub: `≈ ${25 * USD_TO_DZD_DISPLAY} DZD`, icon: '💵' },
  { value: 50, label: 'Under $50', sub: `≈ ${(50 * USD_TO_DZD_DISPLAY).toLocaleString()} DZD`, icon: '💳' },
  { value: 'unlimited' as const, usd: undefined, label: 'No Limit', sub: 'USD / DZD', icon: '✨' },
];

const COMPANION_OPTIONS: { value: CompanionType; label: string; icon: string }[] = [
  { value: 'solo', label: 'Solo Mode', icon: '🎧' },
  { value: 'friends', label: 'Friends', icon: '🛹' },
  { value: 'couple', label: 'Date / Couple', icon: '💖' },
  { value: 'family', label: 'Family', icon: '🏡' },
  { value: 'group', label: 'Big Squad', icon: '🎉' },
];

const SORT_OPTIONS = [
  { value: 'vybe-score', label: '🔥 Highest VYBE Score' },
  { value: 'rating', label: '⭐ Highest Rated' },
  { value: 'price-asc', label: '💰 Budget: Low to High' },
  { value: 'distance', label: '📍 Closest Distance' },
  { value: 'trending', label: '⚡ Trending Now' },
] as const;

const controlBase = 'rounded-xl border transition-all font-bold';

export const ExploreExperience: React.FC = () => {
  const {
    filters,
    setFilters,
    filteredPlaces,
    places,
    userLocation,
    locationError,
    discoveryError,
    discoveryLoading,
    discover,
    requestLocationAndDiscover,
    setActiveTab,
    resetFilters,
  } = useData();

  const activeType = useMemo(
    () => PLACE_TYPES.find((type) => filters.searchQuery.trim().toLowerCase() === type.query.toLowerCase()),
    [filters.searchQuery]
  );

  const selectedBudgetKey = filters.onlyFree ? 'free' : (filters.maxBudget ?? 'unlimited');

  const updateFiltersAndMaybeDiscover = (next: FilterState, shouldDiscover = false) => {
    setFilters(next);
    if (shouldDiscover) discover(next);
  };

  const choosePlaceType = (query: string) => {
    const normalized = filters.searchQuery.trim().toLowerCase();
    const nextQuery = normalized === query.toLowerCase() ? '' : query;
    const next: FilterState = {
      ...filters,
      searchQuery: nextQuery,
      categories: [],
    };
    updateFiltersAndMaybeDiscover(next, Boolean(nextQuery));
  };

  const chooseTime = (value: TimeDuration) => updateFiltersAndMaybeDiscover({ ...filters, duration: value });

  const chooseBudget = (value: number | 'free' | 'unlimited') => {
    updateFiltersAndMaybeDiscover({
      ...filters,
      maxBudget: typeof value === 'number' ? value : undefined,
      onlyFree: value === 'free',
    });
  };

  const chooseCompanion = (value: CompanionType) => updateFiltersAndMaybeDiscover({ ...filters, companion: value });

  const toggleMood = (mood: MoodType) => {
    const nextMoods = filters.moods.includes(mood)
      ? filters.moods.filter((item) => item !== mood)
      : [...filters.moods, mood];
    updateFiltersAndMaybeDiscover({ ...filters, moods: nextMoods });
  };

  const runMatcher = () => {
    if (!userLocation) {
      requestLocationAndDiscover();
      return;
    }
    discover(filters);
    document.getElementById('explore-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearAll = () => {
    resetFilters();
    document.getElementById('explore-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const hasActiveControls = Boolean(
    filters.searchQuery ||
    filters.duration ||
    filters.maxBudget !== undefined ||
    filters.onlyFree ||
    filters.companion ||
    filters.moods.length ||
    filters.onlyOpenNow ||
    filters.onlyHiddenGems ||
    filters.onlyLateNight ||
    filters.priceLevels.length
  );

  const resultHeading = activeType ? `${activeType.emoji} ${activeType.label} near you` : 'Top VYBE matches near you';

  return (
    <div id="explore-top" className="relative overflow-hidden bg-[#F6F7FB] dark:bg-[#090A0F]">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(204,255,0,0.12),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(0,240,255,0.08),transparent_28%)]" />

      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950 text-white dark:bg-white/10 dark:text-vybe-lime border border-white/10 text-xs font-mono font-bold tracking-[0.16em]">
            <Sparkles className="w-3.5 h-3.5 text-vybe-lime" />
            REAL-TIME CITY DISCOVERY ENGINE
          </div>
          <h1 className="font-display font-black text-5xl sm:text-7xl lg:text-8xl tracking-tight text-slate-950 dark:text-white leading-[0.95]">
            What are you <span className="text-transparent bg-clip-text bg-gradient-to-r from-vybe-lime via-vybe-cyan to-vybe-pink">looking for?</span>
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-lg text-slate-600 dark:text-slate-300">
            Pick a real place type, tell VYBE what you have, and get nearby results ranked around your outing.
          </p>
          <div className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>🇩🇿 Algeria</span><span>•</span><span>USD / DZD budgets</span><span>•</span><span>{places.length} discovered</span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {PLACE_TYPES.map((type) => {
            const selected = activeType?.id === type.id;
            return (
              <button
                key={type.id}
                onClick={() => choosePlaceType(type.query)}
                className={`group relative flex flex-col items-center justify-center min-h-24 px-3 py-3 rounded-2xl border transition-all ${
                  selected
                    ? 'bg-black text-vybe-lime border-vybe-lime shadow-neon-lime scale-[1.02]'
                    : 'bg-white/80 dark:bg-vybe-dark-card/80 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-vybe-dark-border hover:-translate-y-1 hover:border-vybe-lime/60'
                }`}
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">{type.emoji}</span>
                <span className="mt-1 text-xs sm:text-sm font-display font-bold">{type.label}</span>
                {type.flag && <span className="text-[11px] mt-0.5">{type.flag}</span>}
                {selected && <Check className="absolute top-2 right-2 w-4 h-4" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="rounded-[2rem] bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border shadow-2xl overflow-hidden">
          <div className="p-6 sm:p-9 bg-gradient-to-r from-slate-950 via-slate-900 to-black text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 text-vybe-lime text-[11px] font-mono font-black tracking-[0.18em] uppercase"><Compass className="w-3.5 h-3.5" /> DISCOVERY ENGINE</div>
                <h2 className="mt-2 font-display font-black text-2xl sm:text-3xl">I have… Personalized Matcher</h2>
                <p className="text-sm text-slate-300 mt-1">Everything here writes into the same Explore state.</p>
              </div>
              {hasActiveControls && (
                <button onClick={clearAll} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold self-start">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset all
                </button>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-9 space-y-8">
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-vybe-dark-surface/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono font-black uppercase tracking-[0.18em] text-slate-400">Discovery target</div>
                <div className="mt-1 font-display font-black text-lg text-slate-900 dark:text-white">
                  {activeType ? `${activeType.emoji} ${activeType.label} ${activeType.flag ?? ''}` : '🌍 Broad nearby discovery'}
                </div>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Select one of the place buttons above.</div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 font-display font-bold"><Clock3 className="w-4 h-4 text-vybe-cyan" /> 1. How much time do you have?</div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {TIME_OPTIONS.map((option) => (
                  <button key={option.value} onClick={() => chooseTime(option.value)} className={`${controlBase} flex flex-col items-center gap-1 p-3 text-xs ${filters.duration === option.value ? 'bg-black text-vybe-lime border-vybe-lime shadow-neon-lime' : 'bg-slate-50 dark:bg-vybe-dark-surface border-slate-200 dark:border-vybe-dark-border text-slate-700 dark:text-slate-300'}`}>
                    <span>{option.icon}</span><span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 font-display font-bold"><WalletCards className="w-4 h-4 text-vybe-lime" /> 2. What’s your budget per person?</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {BUDGET_OPTIONS.map((option) => {
                  const selected = selectedBudgetKey === option.value;
                  return (
                    <button key={String(option.value)} onClick={() => chooseBudget(option.value)} className={`${controlBase} p-3 text-xs text-center ${selected ? 'bg-black text-vybe-lime border-vybe-lime shadow-neon-lime' : 'bg-slate-50 dark:bg-vybe-dark-surface border-slate-200 dark:border-vybe-dark-border text-slate-700 dark:text-slate-300'}`}>
                      <div className="text-lg">{option.icon}</div><div>{option.label}</div><div className="mt-0.5 font-mono text-[10px] opacity-70">{option.sub}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400">DZD values are display estimates; VYBE keeps the matching budget in USD internally.</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 font-display font-bold"><Users className="w-4 h-4 text-vybe-pink" /> 3. Who are you rolling with?</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {COMPANION_OPTIONS.map((option) => (
                  <button key={option.value} onClick={() => chooseCompanion(option.value)} className={`${controlBase} flex flex-col items-center gap-1 p-3 text-xs ${filters.companion === option.value ? 'bg-black text-vybe-lime border-vybe-lime shadow-neon-lime' : 'bg-slate-50 dark:bg-vybe-dark-surface border-slate-200 dark:border-vybe-dark-border text-slate-700 dark:text-slate-300'}`}>
                    <span className="text-lg">{option.icon}</span><span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-display font-bold"><Sparkles className="w-4 h-4 text-vybe-citrus" /> 4. Select your vibe flavours</div>
                <span className="text-xs font-mono text-slate-400">{filters.moods.length} selected</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {INITIAL_MOODS.map((mood) => {
                  const selected = filters.moods.includes(mood.id);
                  return (
                    <button key={mood.id} onClick={() => toggleMood(mood.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all inline-flex items-center gap-1.5 ${selected ? 'bg-black text-vybe-lime border-vybe-lime' : 'bg-slate-100 dark:bg-vybe-dark-surface border-slate-200 dark:border-vybe-dark-border text-slate-700 dark:text-slate-300'}`}>
                      <span>{mood.emoji}</span><span>{mood.label}</span>{selected && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-5 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 text-center sm:text-left"><span className="text-lg">🎯</span> Same target + time + budget + company + vibe state powers Explore and Map.</div>
              <button onClick={runMatcher} disabled={discoveryLoading} className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-vybe-lime text-black font-display font-black text-sm uppercase tracking-wider shadow-neon-lime hover:scale-105 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {discoveryLoading ? 'BUILDING YOUR VYBES' : 'SHOW MY VYBES'}<ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="explore-results" className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">
        <div className="rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                ['onlyOpenNow', '🟢 Open Now'],
                ['onlyFree', '💸 Free Things'],
                ['onlyHiddenGems', '💎 Hidden Gems'],
                ['onlyLateNight', '🌙 Late Night'],
              ].map(([key, label]) => {
                const active = Boolean(filters[key as keyof FilterState]);
                return (
                  <button key={key} onClick={() => setFilters({ ...filters, [key]: !active } as FilterState)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${active ? 'bg-black text-vybe-lime border-vybe-lime' : 'bg-slate-50 dark:bg-vybe-dark-surface border-slate-200 dark:border-vybe-dark-border text-slate-600 dark:text-slate-300'}`}>{label}</button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <ArrowDownUp className="w-3.5 h-3.5 text-slate-400" />
              <select value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FilterState['sortBy'] })} className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-xs font-bold">
                {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              {hasActiveControls && <button onClick={clearAll} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500/10 text-rose-500 text-xs font-bold"><RotateCcw className="w-3.5 h-3.5" /> Clear</button>}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs font-mono text-slate-500">
            <span>Showing {filteredPlaces.length} matched spots</span>
            {filters.duration && <span className="text-vybe-lime font-bold">⏱️ {filters.duration}</span>}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-black tracking-wider text-vybe-lime uppercase"><Sparkles className="w-3.5 h-3.5" /> ALGORITHMIC RECOMMENDATIONS</div>
            <h2 className="mt-1 font-display font-black text-3xl sm:text-4xl text-slate-950 dark:text-white">{resultHeading}</h2>
          </div>
          <button onClick={() => setActiveTab('map')} className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-vybe-lime self-start sm:self-auto"><MapPin className="w-4 h-4 text-vybe-cyan" /> Open Interactive Map <ArrowRight className="w-3.5 h-3.5" /></button>
        </div>

        {filteredPlaces.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border p-12 text-center space-y-4">
            <div className="text-5xl">🛸</div>
            <h3 className="font-display font-black text-xl">{discoveryError || (!userLocation ? 'Allow location to discover nearby places.' : 'No matches yet.')}</h3>
            <p className="text-sm text-slate-500 max-w-xl mx-auto">{discoveryError ? 'VYBE will automatically prefer its alternate place source when the primary provider is unavailable.' : 'Choose a place type and press SHOW MY VYBES to build your live result set.'}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {!userLocation && <button onClick={requestLocationAndDiscover} className="px-5 py-2.5 rounded-full bg-vybe-lime text-black text-sm font-black">Use my location</button>}
              {userLocation && <button onClick={runMatcher} disabled={discoveryLoading} className="px-5 py-2.5 rounded-full bg-vybe-lime text-black text-sm font-black">{discoveryLoading ? 'Searching…' : 'Search again'}</button>}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlaces.map(({ place, scoreInfo }) => <PlaceCard key={place.id} place={place} scoreInfo={scoreInfo} />)}
          </div>
        )}

        <div className="rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-slate-950 via-vybe-dark-card to-black text-white p-8 sm:p-10">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-vybe-cyan text-[11px] font-mono font-bold"><MapPin className="w-3.5 h-3.5" /> INTERACTIVE CITY RADAR</div>
            <h3 className="font-display font-black text-3xl sm:text-4xl">Same places. Same filters. Same map.</h3>
            <p className="text-sm text-slate-300">Explore and Map use the same discovered place collection, classification and active filters—no second discovery system.</p>
            <button onClick={() => setActiveTab('map')} className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-vybe-lime text-black font-black text-xs uppercase tracking-wider shadow-neon-lime"><span>Open Map Radar</span><ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      </section>
    </div>
  );
};
