import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Clock,
  Wallet,
  Users,
  MapPin,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Flame
} from 'lucide-react';
import { TimeDuration, CompanionType } from '../../types';
import { useData } from '../../context/DataContext';

const TIME_OPTIONS: { value: TimeDuration; label: string; icon: string }[] = [
  { value: '15min', label: '15 min', icon: '⚡' },
  { value: '30min', label: '30 min', icon: '☕' },
  { value: '1h', label: '1 hour', icon: '⏱️' },
  { value: '2h', label: '2 hours', icon: '🌆' },
  { value: '3h+', label: '3+ hours', icon: '🚀' },
  { value: 'all-day', label: 'All day', icon: '🌅' }
];

const BUDGET_OPTIONS: { value: number | 'free' | 'unlimited'; label: string; icon: string }[] = [
  { value: 'free', label: 'Free ($0)', icon: '💸' },
  { value: 10, label: 'Under $10', icon: '🪙' },
  { value: 25, label: 'Under $25', icon: '💵' },
  { value: 50, label: 'Under $50', icon: '💳' },
  { value: 'unlimited', label: 'No Limit', icon: '✨' }
];

const COMPANION_OPTIONS: { value: CompanionType; label: string; icon: string }[] = [
  { value: 'solo', label: 'Solo Mode', icon: '🎧' },
  { value: 'friends', label: 'Friends', icon: '🛹' },
  { value: 'couple', label: 'Date / Couple', icon: '💖' },
  { value: 'family', label: 'Family', icon: '🏡' },
  { value: 'group', label: 'Big Squad', icon: '🎉' }
];

export const IHaveDiscoveryWizard: React.FC<{ onResultsReady?: () => void }> = ({ onResultsReady }) => {
  const { filters, setFilters, showToast, requestLocationAndDiscover, discover, discoveryLoading } = useData();

  const [selectedTime, setSelectedTime] = useState<TimeDuration>(filters.duration || '2h');
  const [selectedBudget, setSelectedBudget] = useState<number | 'free' | 'unlimited'>(
    filters.onlyFree ? 'free' : (filters.maxBudget || 25)
  );
  const [selectedCompanion, setSelectedCompanion] = useState<CompanionType>(filters.companion || 'friends');

  const handleGenerate = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#CCFF00', '#FF5500', '#00F0FF', '#FF007F']
    });

    setFilters(prev => ({
      ...prev,
      duration: selectedTime,
      maxBudget: typeof selectedBudget === 'number' ? selectedBudget : undefined,
      onlyFree: selectedBudget === 'free',
      companion: selectedCompanion,
      sortBy: 'vybe-score'
    }));

    showToast('Your Explore feed is now personalized to your outing.', '🔥', 'vibe');
    requestLocationAndDiscover();
    setTimeout(() => discover(), 500);
    setTimeout(() => onResultsReady?.(), 200);
  };

  const handleReset = () => {
    setSelectedTime('2h');
    setSelectedBudget(25);
    setSelectedCompanion('friends');
    setFilters(prev => ({
      ...prev,
      duration: undefined,
      maxBudget: undefined,
      onlyFree: false,
      companion: undefined,
      moods: [],
      categories: [],
      searchQuery: ''
    }));
    showToast('Explore preferences reset', '🔄', 'info');
  };

  return (
    <section id="discovery-engine" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="relative rounded-3xl p-6 sm:p-10 bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-vybe-lime/10 dark:bg-vybe-lime/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-slate-200 dark:border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-vybe-citrus/15 text-vybe-citrus font-mono font-bold text-xs mb-2">
              <Flame className="w-3.5 h-3.5" />
              <span>DISCOVERY ENGINE</span>
            </div>
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">"I have..." Personalized Matcher</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Choose your constraints and Explore will build the best nearby results.</p>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white self-start sm:self-auto py-2 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        <div className="py-6 border-b border-slate-200 dark:border-white/10 space-y-3">
          <label className="flex items-center gap-2 font-display font-bold text-base text-slate-900 dark:text-white">
            <Clock className="w-4 h-4 text-vybe-cyan" />
            <span>1. How much time do you have?</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {TIME_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setSelectedTime(opt.value)} className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${selectedTime === opt.value ? 'bg-black text-white dark:bg-vybe-lime dark:text-black border-transparent shadow-neon-lime' : 'bg-slate-50 dark:bg-vybe-dark-surface border-slate-200 dark:border-vybe-dark-border text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600'}`}>
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="py-6 border-b border-slate-200 dark:border-white/10 space-y-3">
          <label className="flex items-center gap-2 font-display font-bold text-base text-slate-900 dark:text-white">
            <Wallet className="w-4 h-4 text-vybe-lime" />
            <span>2. What's your budget per person?</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {BUDGET_OPTIONS.map(opt => (
              <button key={String(opt.value)} onClick={() => setSelectedBudget(opt.value)} className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${selectedBudget === opt.value ? 'bg-black text-white dark:bg-vybe-lime dark:text-black border-transparent shadow-neon-lime' : 'bg-slate-50 dark:bg-vybe-dark-surface border-slate-200 dark:border-vybe-dark-border text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600'}`}>
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="py-6 border-b border-slate-200 dark:border-white/10 space-y-3">
          <label className="flex items-center gap-2 font-display font-bold text-base text-slate-900 dark:text-white">
            <Users className="w-4 h-4 text-vybe-pink" />
            <span>3. Who are you rolling with?</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {COMPANION_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setSelectedCompanion(opt.value)} className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${selectedCompanion === opt.value ? 'bg-black text-white dark:bg-vybe-lime dark:text-black border-transparent shadow-neon-lime' : 'bg-slate-50 dark:bg-vybe-dark-surface border-slate-200 dark:border-vybe-dark-border text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600'}`}>
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="py-6 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 font-display font-bold text-base text-slate-900 dark:text-white">
              <MapPin className="w-4 h-4 text-vybe-cyan" />
              <span>4. What do you want to discover?</span>
            </label>
            <span className="text-xs text-slate-400 font-mono">Pick one or more in Explore above</span>
          </div>
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-4 bg-slate-50/70 dark:bg-vybe-dark-surface/60">
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Sparkles className="w-4 h-4 text-vybe-lime" />
              <span>Place type choices live in the Explore header so the same selection drives both the feed and the map.</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium text-center sm:text-left">🎯 Generating real-time VYBE scores for your specific setup</div>
          <button onClick={handleGenerate} disabled={discoveryLoading} className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-vybe-lime text-black font-display font-black text-base uppercase tracking-wider shadow-neon-lime hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait" data-cursor="GO!">
            <span>{discoveryLoading ? 'BUILDING YOUR VYBES' : 'SHOW MY VYBES'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
};