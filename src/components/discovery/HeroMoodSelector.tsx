import React from 'react';
import { Sparkles, Compass, ArrowRight, Flame } from 'lucide-react';
import { INITIAL_MOODS } from '../../data/initialMoods';
import { useData } from '../../context/DataContext';

interface HeroMoodSelectorProps {
  onScrollToWizard: () => void;
}

export const HeroMoodSelector: React.FC<HeroMoodSelectorProps> = ({ onScrollToWizard }) => {
  const { activeHeroMood, setActiveHeroMood, filteredPlaces, resetFilters } = useData();

  const selectedMoodObj = INITIAL_MOODS.find(m => m.id === activeHeroMood);

  return (
    <section className="relative overflow-hidden pt-8 pb-16 px-4 sm:px-6 lg:px-8 transition-all duration-700">
      {/* Dynamic Ambient Background Glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[450px] rounded-full blur-[140px] pointer-events-none transition-all duration-700 opacity-40 dark:opacity-30"
        style={{
          backgroundColor: selectedMoodObj ? selectedMoodObj.accentColor : '#CCFF00'
        }}
      />

      {/* Background Decorative SVG Lines */}
      <div className="absolute inset-0 bg-noise pointer-events-none" />

      <div className="relative max-w-6xl mx-auto text-center space-y-8">
        
        {/* Floating Top Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 text-white dark:bg-white/10 dark:text-vybe-lime border border-white/10 backdrop-blur-md text-xs font-mono font-bold tracking-wider animate-bounce-subtle">
          <Sparkles className="w-3.5 h-3.5 text-vybe-lime" />
          <span>REAL-TIME CITY DISCOVERY ENGINE</span>
        </div>

        {/* Giant Expressive Headline */}
        <div className="space-y-4">
          <h1 className="font-display font-extrabold text-5xl sm:text-7xl lg:text-8xl tracking-tight text-slate-900 dark:text-white leading-[1.05]">
            What’s your <br className="hidden sm:inline" />
            <span className="relative inline-block px-3">
              <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-vybe-lime via-vybe-cyan to-vybe-pink animate-gradient-x">
                vibe today?
              </span>
              <span className="absolute bottom-2 left-0 right-0 h-3 bg-vybe-lime/20 dark:bg-vybe-lime/30 -rotate-1 rounded-sm -z-0"></span>
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-xl text-slate-600 dark:text-slate-300 font-medium">
            Discover underground places, experiences, food spots, and spontaneous adventures matched precisely to your energy.
          </p>
        </div>

        {/* 12 Interactive Mood Capsules */}
        <div className="pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3 max-w-5xl mx-auto">
            {INITIAL_MOODS.map(mood => {
              const isSelected = activeHeroMood === mood.id;
              return (
                <button
                  key={mood.id}
                  onClick={() => {
                    if (isSelected) {
                      setActiveHeroMood(null);
                    } else {
                      setActiveHeroMood(mood.id);
                    }
                  }}
                  className={`group relative flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 ${
                    isSelected
                      ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-neon-lime scale-105 z-10'
                      : 'bg-white/70 dark:bg-vybe-dark-card/80 border-slate-200 dark:border-vybe-dark-border text-slate-800 dark:text-slate-200 hover:border-vybe-lime/60 hover:-translate-y-1'
                  }`}
                  data-cursor={mood.label.toUpperCase()}
                >
                  <span className="text-3xl mb-1.5 transition-transform group-hover:scale-125">
                    {mood.emoji}
                  </span>
                  <span className="font-display font-bold text-sm tracking-wide">
                    {mood.label}
                  </span>
                  {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-vybe-lime border-2 border-black dark:border-white"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reactive Mood Status Banner */}
        {selectedMoodObj && (
          <div className="animate-fadeIn max-w-xl mx-auto p-4 rounded-2xl bg-black/90 dark:bg-vybe-dark-surface/90 border border-white/10 backdrop-blur-xl text-white shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedMoodObj.emoji}</span>
                <span className="font-display font-bold text-base text-vybe-lime">
                  {selectedMoodObj.label} Vibe Active
                </span>
                <span className="text-xs font-mono text-slate-400">
                  ({filteredPlaces.length} matching spots)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {selectedMoodObj.tagline}
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => resetFilters()}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors"
              >
                Clear
              </button>
              <button
                onClick={onScrollToWizard}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-vybe-lime text-black font-bold text-xs shadow-neon-lime hover:scale-105 transition-all"
              >
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

