import React from 'react';
import { Sparkles, ArrowRight, RotateCcw } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface HeroMoodSelectorProps {
  onScrollToWizard: () => void;
}

const PLACE_TYPE_OPTIONS = [
  { id: 'mosque', query: 'mosque', label: 'Mosques', emoji: '🕌' },
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
];

export const HeroMoodSelector: React.FC<HeroMoodSelectorProps> = ({ onScrollToWizard }) => {
  const { filteredPlaces, resetFilters, filters, setFilters, requestLocationAndDiscover } = useData();

  const activePlace = PLACE_TYPE_OPTIONS.find(option =>
    filters.searchQuery.trim().toLowerCase() === option.query.toLowerCase()
  );

  const choosePlaceType = (query: string) => {
    const isSelected = filters.searchQuery.trim().toLowerCase() === query.toLowerCase();

    setFilters(prev => ({
      ...prev,
      searchQuery: isSelected ? '' : query,
      categories: [],
      moods: [],
    }));

    if (!isSelected) requestLocationAndDiscover();
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-16 px-4 sm:px-6 lg:px-8 transition-all duration-700">
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[450px] rounded-full blur-[140px] pointer-events-none transition-all duration-700 opacity-40 dark:opacity-30"
        style={{ backgroundColor: '#CCFF00' }}
      />
      <div className="absolute inset-0 bg-noise pointer-events-none" />

      <div className="relative max-w-6xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 text-white dark:bg-white/10 dark:text-vybe-lime border border-white/10 backdrop-blur-md text-xs font-mono font-bold tracking-wider animate-bounce-subtle">
          <Sparkles className="w-3.5 h-3.5 text-vybe-lime" />
          <span>REAL-TIME CITY DISCOVERY ENGINE</span>
        </div>

        <div className="space-y-4">
          <h1 className="font-display font-extrabold text-5xl sm:text-7xl lg:text-8xl tracking-tight text-slate-900 dark:text-white leading-[1.05]">
            What are you <br className="hidden sm:inline" />
            <span className="relative inline-block px-3">
              <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-vybe-lime via-vybe-cyan to-vybe-pink animate-gradient-x">
                looking for?
              </span>
              <span className="absolute bottom-2 left-0 right-0 h-3 bg-vybe-lime/20 dark:bg-vybe-lime/30 -rotate-1 rounded-sm -z-0"></span>
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-xl text-slate-600 dark:text-slate-300 font-medium">
            Choose what you want to discover and VYBE will find real nearby places for you.
          </p>
        </div>

        {/* Replaced the old mood buttons with place-type discovery buttons */}
        <div className="pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3 max-w-5xl mx-auto">
            {PLACE_TYPE_OPTIONS.map(option => {
              const isSelected = activePlace?.id === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => choosePlaceType(option.query)}
                  className={`group relative flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 ${
                    isSelected
                      ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-neon-lime scale-105 z-10'
                      : 'bg-white/70 dark:bg-vybe-dark-card/80 border-slate-200 dark:border-vybe-dark-border text-slate-800 dark:text-slate-200 hover:border-vybe-lime/60 hover:-translate-y-1'
                  }`}
                  data-cursor={option.label.toUpperCase()}
                >
                  <span className="text-3xl mb-1.5 transition-transform group-hover:scale-125">{option.emoji}</span>
                  <span className="font-display font-bold text-sm tracking-wide">{option.label}</span>
                  {option.id === 'mosque' && <span className="mt-0.5 text-xs">🇩🇿</span>}
                  {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-vybe-lime border-2 border-black dark:border-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activePlace && (
          <div className="animate-fadeIn max-w-xl mx-auto p-4 rounded-2xl bg-black/90 dark:bg-vybe-dark-surface/90 border border-white/10 backdrop-blur-xl text-white shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-xl">{activePlace.emoji}</span>
                <span className="font-display font-bold text-base text-vybe-lime">{activePlace.label} Active</span>
                <span className="text-xs font-mono text-slate-400">({filteredPlaces.length} matching spots)</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">The same discovery results are used by Explore and Map.</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button onClick={resetFilters} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors">
                <RotateCcw className="w-3.5 h-3.5" />
                Clear
              </button>
              <button onClick={onScrollToWizard} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-vybe-lime text-black font-bold text-xs shadow-neon-lime hover:scale-105 transition-all">
                <span>Fine-tune</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
