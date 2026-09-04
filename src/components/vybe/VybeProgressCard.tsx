import React, { useEffect, useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { badgeDefinitions, getGamificationState, levelFromXp, levelTitle } from '../../services/gamificationService';

export const VybeProgressCard: React.FC = () => {
  const { currentUser } = useAuth();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick(value => value + 1);
    window.addEventListener('vybe:gamification-updated', listener);
    return () => window.removeEventListener('vybe:gamification-updated', listener);
  }, []);
  const state = useMemo(() => getGamificationState(currentUser?.id), [currentUser?.id, tick]);
  if (!currentUser) return null;
  const level = levelFromXp(state.xp);
  const nextLevelXp = level * 300;
  const progress = Math.min(100, Math.round(((state.xp - (level - 1) * 300) / 300) * 100));
  const unlocked = badgeDefinitions().filter(badge => state.unlockedBadges.includes(badge.id));
  return <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 pb-2">
    <div className="rounded-3xl p-5 sm:p-6 bg-slate-950 text-white border border-white/10 shadow-2xl overflow-hidden relative">
      <div className="absolute -right-10 -top-16 w-48 h-48 rounded-full bg-vybe-lime/10 blur-3xl pointer-events-none" />
      <div className="relative flex flex-col lg:flex-row lg:items-center gap-5">
        <div className="flex items-center gap-3 min-w-0"><div className="w-12 h-12 rounded-2xl bg-vybe-lime text-black flex items-center justify-center shadow-neon-lime"><Trophy className="w-6 h-6" /></div><div className="min-w-0"><p className="text-[10px] font-mono text-vybe-lime font-black uppercase tracking-wider">Explorer progression</p><h2 className="font-display font-black text-xl truncate">Level {level} · {levelTitle(level)}</h2><p className="text-xs text-slate-400">{state.xp} XP · {state.visitedPlaceIds.length} verified visits</p></div></div>
        <div className="flex-1"><div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2"><span>Progress to Level {level + 1}</span><span>{Math.max(0, nextLevelXp - state.xp)} XP left</span></div><div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-vybe-lime rounded-full transition-all" style={{ width: `${progress}%` }} /></div></div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">{unlocked.length ? unlocked.slice(-4).map(badge => <span key={badge.id} title={badge.description} className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/10 text-[10px] font-bold"><span>{badge.emoji}</span>{badge.title}</span>) : <span className="text-[10px] text-slate-500">Check in at real places to unlock badges.</span>}</div>
      </div>
    </div>
  </div>;
};
