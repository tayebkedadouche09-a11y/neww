import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Heart,
  Calendar,
  Edit3,
  Share2,
  LogOut,
  ArrowRight,
  LoaderCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { PlaceCard } from '../cards/PlaceCard';
import { INITIAL_MOODS } from '../../data/initialMoods';
import { MoodType, Place } from '../../types';
import { getGooglePlaceDetails } from '../../services/googlePlaces';
import { placesService } from '../../services/placesService';
import { isBackendConfigured } from '../../lib/env';

export const ProfileView: React.FC = () => {
  const { currentUser, profiles, switchProfile, updateProfile, logout } = useAuth();
  const { places, plans, openShareModal, showToast, setActiveTab, setActivePlan } = useData();

  const [activeSubTab, setActiveSubTab] = useState<'saved' | 'liked' | 'plans' | 'edit'>('saved');
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editBio, setEditBio] = useState(currentUser?.bio || '');
  const [editMoods, setEditMoods] = useState<MoodType[]>(currentUser?.favoriteMoods || ['chill']);
  const [hydratedPlaces, setHydratedPlaces] = useState<Place[]>([]);
  const [hydratingPlaces, setHydratingPlaces] = useState(false);

  useEffect(() => {
    setEditName(currentUser?.name || '');
    setEditBio(currentUser?.bio || '');
    setEditMoods(currentUser?.favoriteMoods || ['chill']);
  }, [currentUser?.id]);

  // Saved/liked places can come from Google Places or the VYBE catalog and may
  // no longer be in the current discovery result set. Rehydrate every missing
  // stable place ID so "My VYBES" survives refresh and a new discovery search.
  useEffect(() => {
    let cancelled = false;
    const ids = [...new Set([...(currentUser?.savedPlaceIds || []), ...(currentUser?.likedPlaceIds || [])])];
    const missingIds = ids.filter(id => !places.some(place => place.id === id));

    if (!currentUser || missingIds.length === 0) {
      setHydratedPlaces([]);
      setHydratingPlaces(false);
      return;
    }

    setHydratingPlaces(true);
    void Promise.all(missingIds.map(async id => {
      try {
        if (id.startsWith('google:')) {
          const providerId = id.slice('google:'.length);
          return providerId ? await getGooglePlaceDetails(providerId) : null;
        }
        if (!isBackendConfigured) return null;
        return await placesService.getPublic(id);
      } catch (error) {
        console.warn('[VYBE profile] failed to restore saved/liked place', id, error);
        return null;
      }
    })).then(results => {
      if (!cancelled) setHydratedPlaces(results.filter((place): place is Place => Boolean(place)));
    }).finally(() => {
      if (!cancelled) setHydratingPlaces(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.savedPlaceIds, currentUser?.likedPlaceIds, places]);

  const allKnownPlaces = useMemo(() => {
    const byId = new Map<string, Place>();
    [...places, ...hydratedPlaces].forEach(place => byId.set(place.id, place));
    return [...byId.values()];
  }, [places, hydratedPlaces]);

  if (!currentUser) return null;

  const savedPlaces = allKnownPlaces.filter(p => currentUser.savedPlaceIds.includes(p.id));
  const likedPlaces = allKnownPlaces.filter(p => currentUser.likedPlaceIds.includes(p.id));
  const userPlans = plans.filter(p => p.userId === currentUser.id);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name: editName.trim(), bio: editBio.trim(), favoriteMoods: editMoods });
    showToast('Profile updated!', '✨', 'success');
    setActiveSubTab('saved');
  };

  const toggleMoodTag = (moodId: MoodType) => {
    setEditMoods(prev => prev.includes(moodId) ? (prev.length > 1 ? prev.filter(m => m !== moodId) : prev) : [...prev, moodId]);
  };

  const openPlan = (plan: typeof userPlans[number]) => {
    setActivePlan(plan);
    setActiveTab('plan');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      <div className="relative rounded-3xl p-6 sm:p-10 bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-vybe-lime/10 dark:bg-vybe-lime/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative">
              <img src={currentUser.avatar} alt={currentUser.name} loading="lazy" decoding="async" className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-black dark:border-white shadow-2xl" />
              <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-vybe-lime text-black font-black text-xs shadow-neon-lime">🔥 {currentUser.vibeStreakDays}d</div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">{currentUser.name}</h1>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-vybe-dark-surface text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-white/10">@{currentUser.username}</span>
                {currentUser.isAdmin && <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-vybe-pink text-white font-bold">ADMIN</span>}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl">{currentUser.bio}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {currentUser.favoriteMoods.map(m => {
                  const obj = INITIAL_MOODS.find(i => i.id === m);
                  return <span key={m} className="px-2.5 py-0.5 rounded-lg bg-vybe-lime/10 text-slate-800 dark:text-vybe-lime border border-vybe-lime/30 text-xs font-bold font-mono">{obj?.emoji} {obj?.label}</span>;
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">SWITCH DEMO ACCOUNT</span>
              <div className="flex flex-wrap gap-1">
                {profiles.map(p => <button key={p.id} onClick={() => switchProfile(p.id)} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${currentUser.id === p.id ? 'bg-vybe-lime text-black shadow-sm' : 'bg-white dark:bg-vybe-dark-card text-slate-600 dark:text-slate-400 hover:text-white'}`}>{p.name.split(' ')[0]}</button>)}
              </div>
            </div>
            <button onClick={() => openShareModal()} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-black font-bold text-xs hover:scale-105 transition-all shadow-md"><Share2 className="w-3.5 h-3.5" /><span>Share My VYBE</span></button>
            <button onClick={() => { logout(); setActiveTab('explore'); showToast('Signed out — returning to public visitor mode.', '👋', 'info'); }} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white font-bold text-xs transition-all" data-testid="profile-signout"><LogOut className="w-3.5 h-3.5" /><span>Sign Out</span></button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8 mt-8 border-t border-slate-200 dark:border-white/10">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="text-[11px] font-mono text-slate-400">VIBE STREAK</span><p className="font-display font-extrabold text-xl text-orange-500 mt-0.5">{currentUser.vibeStreakDays} Days</p></div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="text-[11px] font-mono text-slate-400">SAVED SPOTS</span><p className="font-display font-extrabold text-xl text-vybe-lime mt-0.5">{currentUser.savedPlaceIds.length} Places</p></div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="text-[11px] font-mono text-slate-400">LIKED VIBES</span><p className="font-display font-extrabold text-xl text-rose-500 mt-0.5">{currentUser.likedPlaceIds.length} Spots</p></div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="text-[11px] font-mono text-slate-400">CUSTOM PLANS</span><p className="font-display font-extrabold text-xl text-vybe-cyan mt-0.5">{userPlans.length} Itineraries</p></div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveSubTab('saved')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${activeSubTab === 'saved' ? 'bg-black text-white dark:bg-vybe-lime dark:text-black shadow-neon-lime' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-vybe-dark-surface'}`}><Bookmark className="w-4 h-4" /><span>Saved Places ({savedPlaces.length})</span></button>
        <button onClick={() => setActiveSubTab('liked')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${activeSubTab === 'liked' ? 'bg-black text-white dark:bg-vybe-lime dark:text-black shadow-neon-lime' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-vybe-dark-surface'}`}><Heart className="w-4 h-4" /><span>Liked Places ({likedPlaces.length})</span></button>
        <button onClick={() => setActiveSubTab('plans')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${activeSubTab === 'plans' ? 'bg-black text-white dark:bg-vybe-lime dark:text-black shadow-neon-lime' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-vybe-dark-surface'}`}><Calendar className="w-4 h-4" /><span>My Plans ({userPlans.length})</span></button>
        <button onClick={() => setActiveSubTab('edit')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${activeSubTab === 'edit' ? 'bg-black text-white dark:bg-vybe-lime dark:text-black shadow-neon-lime' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-vybe-dark-surface'}`}><Edit3 className="w-4 h-4" /><span>Edit Profile</span></button>
      </div>

      {activeSubTab === 'saved' && <div className="space-y-6">{hydratingPlaces && savedPlaces.length === 0 ? <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border space-y-2"><LoaderCircle className="w-7 h-7 mx-auto animate-spin text-vybe-lime" /><p className="font-display font-bold text-slate-800 dark:text-white">Restoring your saved spots…</p><p className="text-xs text-slate-500">VYBE is fetching the saved place details.</p></div> : savedPlaces.length === 0 ? <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border space-y-2"><span className="text-3xl">🔖</span><p className="font-display font-bold text-slate-800 dark:text-white">Your saved collection is empty.</p><p className="text-xs text-slate-500">Tap the bookmark icon on any spot to save it here.</p></div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{savedPlaces.map(place => <PlaceCard key={place.id} place={place} />)}</div>}</div>}

      {activeSubTab === 'liked' && <div className="space-y-6">{hydratingPlaces && likedPlaces.length === 0 ? <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border space-y-2"><LoaderCircle className="w-7 h-7 mx-auto animate-spin text-vybe-lime" /><p className="font-display font-bold text-slate-800 dark:text-white">Restoring your liked spots…</p><p className="text-xs text-slate-500">VYBE is fetching the liked place details.</p></div> : likedPlaces.length === 0 ? <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border space-y-2"><span className="text-3xl">💖</span><p className="font-display font-bold text-slate-800 dark:text-white">No liked vibes yet.</p><p className="text-xs text-slate-500">Heart places to build your personal taste profile.</p></div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{likedPlaces.map(place => <PlaceCard key={place.id} place={place} />)}</div>}</div>}

      {activeSubTab === 'plans' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {userPlans.length === 0 ? (
            <div className="sm:col-span-2 p-12 text-center rounded-3xl bg-slate-50 dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border space-y-2"><span className="text-3xl">🗓️</span><p className="font-display font-bold text-slate-800 dark:text-white">No plans yet.</p><p className="text-xs text-slate-500">Build an outing from Explore and save the stops you want.</p></div>
          ) : userPlans.map(plan => (
            <button key={plan.id} type="button" onClick={() => openPlan(plan)} className="text-left p-5 rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border hover:border-vybe-lime/50 transition-all shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div><h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">{plan.title}</h3><p className="text-xs text-slate-500 mt-1">{plan.items.length} stops · {plan.mood} · ${plan.targetBudgetUsd}</p></div>
                <ArrowRight className="w-5 h-5 text-vybe-lime shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {activeSubTab === 'edit' && (
        <form onSubmit={handleSaveProfile} className="p-6 rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border shadow-lg space-y-5">
          <div><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Display Name</label><input value={editName} onChange={e => setEditName(e.target.value)} required className="mt-1 w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white" /></div>
          <div><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Bio</label><textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} className="mt-1 w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white" /></div>
          <div><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Favorite Vibes</label><div className="mt-2 flex flex-wrap gap-2">{INITIAL_MOODS.map(m => <button key={m.id} type="button" onClick={() => toggleMoodTag(m.id)} className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${editMoods.includes(m.id) ? 'bg-vybe-lime text-black border-vybe-lime' : 'bg-slate-50 dark:bg-vybe-dark-surface text-slate-600 dark:text-slate-300 border-slate-200 dark:border-vybe-dark-border'}`}>{m.emoji} {m.label}</button>)}</div></div>
          <div className="flex justify-end"><button type="submit" className="px-5 py-2.5 rounded-xl bg-vybe-lime text-black font-bold text-xs shadow-neon-lime">Save Profile</button></div>
        </form>
      )}
    </div>
  );
};
