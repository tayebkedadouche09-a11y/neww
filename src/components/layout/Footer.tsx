import React from 'react';
import { Sparkles, Heart, Compass, MapPin, Share2, Instagram, Twitter, Github } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { INITIAL_MOODS } from '../../data/initialMoods';

export const Footer: React.FC = () => {
  const { setActiveHeroMood, setActiveTab, openShareModal } = useData();

  return (
    <footer className="w-full border-t border-black/10 dark:border-white/10 bg-slate-50 dark:bg-[#07080C] text-slate-600 dark:text-slate-400 py-16 px-4 sm:px-6 lg:px-8 mt-24 mb-16 lg:mb-0 transition-colors">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        
        {/* Brand & Manifesto */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-black dark:bg-white text-vybe-lime dark:text-black flex items-center justify-center font-black text-lg shadow-neon-lime">
              V
            </div>
            <span className="font-display font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
              VYBE
            </span>
          </div>
          <p className="text-sm leading-relaxed max-w-md text-slate-600 dark:text-slate-400">
            A living digital playground for discovering what to do. Built for the restless, curious, and spontaneous crowd looking for their next vibe.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => openShareModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-vybe-lime text-black shadow-neon-lime hover:scale-105 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share VYBE</span>
            </button>
            <span className="text-xs font-mono text-slate-500">v1.0.0</span>
          </div>
        </div>

        {/* Quick Mood Hop */}
        <div className="space-y-3">
          <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
            Quick Mood Hop
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {INITIAL_MOODS.slice(0, 8).map(mood => (
              <button
                key={mood.id}
                onClick={() => {
                  setActiveHeroMood(mood.id);
                  setActiveTab('explore');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-vybe-dark-surface hover:bg-vybe-lime hover:text-black dark:hover:bg-vybe-lime dark:hover:text-black transition-all"
              >
                {mood.emoji} {mood.label}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Links */}
        <div className="space-y-3">
          <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
            Explore
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <button 
                onClick={() => { setActiveTab('explore'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="hover:text-vybe-lime transition-colors"
              >
                Trending Vibes
              </button>
            </li>
            <li>
              <button 
                onClick={() => { setActiveTab('map'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="hover:text-vybe-lime transition-colors"
              >
                Interactive Map
              </button>
            </li>
            <li>
              <button 
                onClick={() => { setActiveTab('plan'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="hover:text-vybe-lime transition-colors"
              >
                VYBE Itinerary Planner
              </button>
            </li>
            <li>
              <button 
                onClick={() => { setActiveTab('saved'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="hover:text-vybe-lime transition-colors"
              >
                My VYBES Collections
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-10 mt-10 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <p>© 2026 VYBE Platform Inc. Find your next vibe.</p>
        <p className="flex items-center gap-1">
          Designed with <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 inline" /> for spontaneous nights out.
        </p>
      </div>
    </footer>
  );
};

