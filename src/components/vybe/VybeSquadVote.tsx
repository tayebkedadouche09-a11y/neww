import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Crown, Share2, Users } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Place } from '../../types';

function readPollIds() {
  const value = new URLSearchParams(window.location.search).get('vote');
  if (!value) return [];
  try {
    const parsed = JSON.parse(atob(value)) as unknown;
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string').slice(0, 5) as string[] : [];
  } catch {
    return [];
  }
}

export const VybeSquadVote: React.FC = () => {
  const { places, showToast } = useData();
  const [pollIds, setPollIds] = useState<string[]>(readPollIds);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [myVote, setMyVote] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const fromLink = pollIds.map(id => places.find(place => place.id === id)).filter((place): place is Place => Boolean(place));
    if (fromLink.length >= 2) return fromLink;
    return places.slice(0, 4);
  }, [places, pollIds]);

  useEffect(() => {
    const raw = localStorage.getItem('vybe-squad-votes');
    if (raw) {
      try { setVotes(JSON.parse(raw) as Record<string, number>); } catch { setVotes({}); }
    }
    const savedMine = localStorage.getItem('vybe-my-vote');
    if (savedMine) setMyVote(savedMine);
  }, []);

  const castVote = (placeId: string) => {
    setVotes(prev => {
      const next = { ...prev };
      if (myVote && myVote !== placeId) next[myVote] = Math.max(0, (next[myVote] || 0) - 1);
      if (myVote === placeId) next[placeId] = Math.max(0, (next[placeId] || 1) - 1);
      else next[placeId] = (next[placeId] || 0) + 1;
      localStorage.setItem('vybe-squad-votes', JSON.stringify(next));
      return next;
    });
    const nextMine = myVote === placeId ? null : placeId;
    setMyVote(nextMine);
    if (nextMine) localStorage.setItem('vybe-my-vote', nextMine);
    else localStorage.removeItem('vybe-my-vote');
  };

  const createPollLink = async () => {
    const ids = candidates.map(place => place.id);
    if (ids.length < 2) return;
    setPollIds(ids);
    const encoded = btoa(JSON.stringify(ids));
    const url = `${window.location.origin}?vote=${encodeURIComponent(encoded)}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Squad vote link copied.', '👥', 'success');
    } catch {
      showToast('Could not copy the squad vote link.', '⚠️', 'info');
    }
  };

  if (candidates.length < 2) return null;

  const winner = [...candidates].sort((a, b) => (votes[b.id] || 0) - (votes[a.id] || 0))[0];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6" aria-label="VYBE squad voting">
      <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-vybe-dark-card shadow-lg p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-vybe-pink"><Users className="w-3.5 h-3.5" /> SQUAD VOTE</span>
            <h2 className="font-display font-extrabold text-xl text-slate-900 dark:text-white mt-1">Let the squad pick the spot</h2>
            <p className="text-xs text-slate-500 mt-1">Vote for one candidate. The winner is saved on this device.</p>
          </div>
          <button type="button" onClick={createPollLink} className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-vybe-lime transition-all"><Share2 className="w-3.5 h-3.5" /> Share poll</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {candidates.map(place => {
            const selected = myVote === place.id;
            return <button key={place.id} type="button" onClick={() => castVote(place.id)} className={`text-left p-4 rounded-2xl border transition-all ${selected ? 'border-vybe-lime bg-vybe-lime/10' : 'border-slate-200 dark:border-vybe-dark-border hover:border-vybe-lime/50'}`}>
              <div className="flex items-center justify-between gap-2"><p className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">{place.name}</p><span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${selected ? 'bg-vybe-lime text-black' : 'bg-slate-100 dark:bg-vybe-dark-surface text-slate-400'}`}>{selected ? <Check className="w-3.5 h-3.5" /> : <span className="text-[10px] font-mono font-bold">{votes[place.id] || 0}</span>}</span></div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">{place.location.neighborhood || place.location.address || 'Nearby'} · {place.priceLevel}</p>
            </button>;
          })}
        </div>

        {winner && (votes[winner.id] || 0) > 0 && <div className="mt-4 p-3 rounded-2xl bg-black text-white flex flex-col sm:flex-row sm:items-center gap-3"><Crown className="w-4 h-4 text-vybe-lime shrink-0" /><p className="text-xs"><strong className="text-vybe-lime">Current winner:</strong> {winner.name} with {votes[winner.id] || 0} vote{votes[winner.id] === 1 ? '' : 's'}.</p><span className="ml-auto text-[10px] text-slate-400">Local squad tally</span></div>}
      </div>
    </section>
  );
};
