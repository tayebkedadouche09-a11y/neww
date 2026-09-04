import React, { useMemo, useState } from 'react';
import { CheckCircle2, MapPin, Navigation, ShieldCheck, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { checkInPlace } from '../../services/gamificationService';

export const VybeCheckIn: React.FC = () => {
  const { selectedPlace, isDetailOpen, userLocation, showToast } = useData();
  const { currentUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [xp, setXp] = useState(0);

  const canCheckIn = Boolean(selectedPlace && isDetailOpen && currentUser && userLocation);
  const locationHint = useMemo(() => {
    if (!selectedPlace || !userLocation) return null;
    const dLat = ((selectedPlace.location.lat - userLocation.lat) * Math.PI) / 180;
    const dLng = ((selectedPlace.location.lng - userLocation.lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((userLocation.lat * Math.PI) / 180) * Math.cos((selectedPlace.location.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const meters = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000);
    return meters <= 500 ? `${meters}m away · ready to check in` : `${(meters / 1000).toFixed(1)}km away · move within 500m`;
  }, [selectedPlace, userLocation]);

  if (!canCheckIn || !selectedPlace || !currentUser || !userLocation) return null;

  const runCheckIn = () => {
    if (busy || done) return;
    setBusy(true);
    const result = checkInPlace(currentUser.id, selectedPlace, userLocation, 500);
    if (result.ok) {
      setDone(true);
      setXp(result.xpAwarded);
      showToast(`Check-in verified · +${result.xpAwarded} XP`, '🏆', 'success');
      result.newlyUnlocked.forEach(badge => showToast(`${badge.emoji} Badge unlocked: ${badge.title}`, '🎉', 'success'));
    } else if (result.reason === 'too-far') {
      showToast(`You're ${Math.round(result.distanceMeters || 0)}m away. Get within 500m to verify the visit.`, '📍', 'info');
    } else if (result.reason === 'already-visited') {
      setDone(true);
      showToast('You already checked in here.', '✅', 'info');
    } else {
      showToast('Live location is not accurate enough for a verified check-in.', '⚠️', 'info');
    }
    setBusy(false);
  };

  return <div className="fixed left-1/2 -translate-x-1/2 bottom-28 sm:bottom-7 z-[61] w-[calc(100%-2rem)] sm:w-auto sm:min-w-[360px]">
    <div className="p-3 rounded-2xl bg-black/95 text-white border border-vybe-lime/50 shadow-2xl backdrop-blur-xl flex items-center gap-3">
      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${done ? 'bg-vybe-lime text-black' : 'bg-white/10 text-vybe-lime'}`}>
        {done ? <CheckCircle2 className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
      </div>
      <div className="min-w-0 flex-1"><p className="font-display font-black text-sm truncate">{done ? `Visited ${selectedPlace.name}` : 'Verify this visit'}</p><p className="text-[10px] text-slate-400 truncate">{done ? `+${xp} XP · saved locally for your account` : locationHint || 'Live location required'}</p></div>
      <button type="button" onClick={runCheckIn} disabled={busy || done || !locationHint?.includes('ready')} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-vybe-lime text-black font-black text-[11px] disabled:opacity-40"><Trophy className="w-3.5 h-3.5" />{done ? 'Done' : busy ? 'Verifying…' : 'Check in'}</button>
    </div>
    {!done && <p className="mt-1 text-center text-[9px] text-white/60"><Navigation className="w-3 h-3 inline mr-1" />VYBE uses your live browser location and a 500m proximity check.</p>}
  </div>;
};
