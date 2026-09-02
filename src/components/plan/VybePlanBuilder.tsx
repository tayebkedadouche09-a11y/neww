import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  Plus, 
  Trash2, 
  Share2, 
  MapPin, 
  Sparkles, 
  ArrowRight,
  MoveDown,
  Edit2,
  Check
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { INITIAL_MOODS } from '../../data/initialMoods';
import { MoodType } from '../../types';
import { useRequireAuth } from '../../hooks/useRequireAuth';

export const VybePlanBuilder: React.FC = () => {
  const { 
    plans, 
    activePlan, 
    setActivePlan, 
    createPlan, 
    deletePlan, 
    removePlaceFromPlan, 
    updatePlanItem,
    places, 
    openPlaceDetail,
    openShareModal,
    addPlaceToPlan,
    showToast
  } = useData();
  const requireAuth = useRequireAuth();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMood, setNewMood] = useState<MoodType>('party');
  const [newBudget, setNewBudget] = useState(50);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [editTime, setEditTime] = useState('');

  const currentPlan = activePlan || plans[0];

  // Calculate total budget and duration
  const planPlaces = (currentPlan?.items || []).map(item => {
    const place = places.find(p => p.id === item.placeId);
    return { item, place };
  }).filter(p => p.place !== undefined);

  const totalBudget = planPlaces.reduce((sum, p) => sum + (p.place?.approxCostUsd || 0), 0);
  const totalDurationMinutes = (currentPlan?.items || []).reduce((sum, item) => sum + item.durationMinutes, 0);

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAuth()) return;
    if (!newTitle.trim()) return;
    createPlan(newTitle.trim(), newMood, newBudget);
    setNewTitle('');
    setIsCreatingNew(false);
  };

  const handleSaveEdit = (itemId: string) => {
    updatePlanItem(currentPlan.id, itemId, {
      startTime: editTime || undefined,
      customNote: editNote || undefined
    });
    setEditingItemId(null);
  };

  return (
    <div data-testid="plan-builder" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header & Plan Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-vybe-lime/15 text-slate-900 dark:text-vybe-lime font-mono font-bold text-xs mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>VYBE ITINERARY BUILDER</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white">
            Your Outing Plans
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Build, pace, and visualize an unforgettable day or night with your friends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Plan Selector */}
          <select
            value={currentPlan?.id || ''}
            onChange={e => {
              const selected = plans.find(p => p.id === e.target.value);
              if (selected) setActivePlan(selected);
            }}
            className="bg-slate-100 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
          >
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.title} ({p.items.length} stops)</option>
            ))}
          </select>

          <button
            onClick={() => setIsCreatingNew(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-vybe-lime text-black font-bold text-xs shadow-neon-lime hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Plan</span>
          </button>
        </div>
      </div>

      {/* New Plan Creation Form Modal */}
      {isCreatingNew && (
        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border space-y-4 animate-fadeIn">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
            Create New Outing Plan
          </h3>
          <form onSubmit={handleCreateNew} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="Plan Title (e.g. Saturday Date Rush)"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="col-span-1 sm:col-span-2 p-3 rounded-xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white focus:outline-none"
              />
              <select
                value={newMood}
                onChange={e => setNewMood(e.target.value as MoodType)}
                className="p-3 rounded-xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white font-bold"
              >
                {INITIAL_MOODS.map(m => (
                  <option key={m.id} value={m.id}>{m.emoji} {m.label} Mood</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-vybe-lime text-black font-bold text-xs shadow-neon-lime"
              >
                Create Plan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Plan Summary Dashboard Card */}
      {currentPlan && (
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-vybe-dark-card to-black text-white border border-white/10 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <span className="text-xs font-mono text-vybe-lime font-bold uppercase tracking-wider">
                ACTIVE OUTING ITINERARY
              </span>
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white mt-1">
                {currentPlan.title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openShareModal()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-vybe-citrus text-white font-bold text-xs shadow-neon-citrus hover:scale-105 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Outing</span>
              </button>

              {plans.length > 1 && (
                <button
                  onClick={() => deletePlan(currentPlan.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-white/5 transition-colors"
                  title="Delete Plan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[11px] text-slate-400 font-mono">TOTAL STOPS</span>
              <p className="font-display font-bold text-xl text-vybe-lime mt-0.5">
                {currentPlan.items.length} Activities
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[11px] text-slate-400 font-mono">ESTIMATED BUDGET</span>
              <p className="font-display font-bold text-xl text-vybe-cyan mt-0.5">
                ~${totalBudget} <span className="text-xs text-slate-400 font-sans">/ person</span>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[11px] text-slate-400 font-mono">TOTAL TIME</span>
              <p className="font-display font-bold text-xl text-white mt-0.5">
                {Math.floor(totalDurationMinutes / 60)}h {totalDurationMinutes % 60}m
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-[11px] text-slate-400 font-mono">VIBE MOOD</span>
              <p className="font-display font-bold text-xl text-vybe-pink mt-0.5 capitalize">
                {currentPlan.mood}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Visual Outing Timeline */}
      <div className="space-y-6">
        <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
          Itinerary Timeline
        </h3>

        {planPlaces.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-slate-50 dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border space-y-3">
            <span className="text-4xl">🗺️</span>
            <h4 className="font-display font-bold text-slate-900 dark:text-white text-lg">
              No stops added to this plan yet!
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Explore spots and click "Add to Plan" on any discovery card to build your timeline.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-10 space-y-8 before:absolute before:left-3 sm:before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-vybe-lime before:via-vybe-cyan before:to-vybe-pink">
            {planPlaces.map(({ item, place }, idx) => (
              <div key={item.id} className="relative group">
                
                {/* Timeline Dot Icon */}
                <div className="absolute -left-6 sm:-left-10 top-5 -translate-x-1/2 w-6 h-6 rounded-full bg-black text-vybe-lime border-2 border-vybe-lime flex items-center justify-center font-mono text-[10px] font-black shadow-neon-lime z-10">
                  {idx + 1}
                </div>

                {/* Timeline Card */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border shadow-lg space-y-4 hover:border-vybe-lime/50 transition-all">
                  
                  {/* Top Row: Time & Place Title */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-xl bg-black text-vybe-lime dark:bg-white/10 dark:text-vybe-lime font-mono font-black text-xs">
                        {item.startTime}
                      </span>
                      <h4 
                        onClick={() => place && openPlaceDetail(place)}
                        className="font-display font-extrabold text-lg text-slate-900 dark:text-white hover:text-vybe-lime cursor-pointer transition-colors"
                      >
                        {place?.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">
                        {item.durationMinutes} mins
                      </span>

                      <button
                        onClick={() => {
                          setEditingItemId(item.id);
                          setEditTime(item.startTime);
                          setEditNote(item.customNote || '');
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                        title="Edit stop"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => removePlaceFromPlan(currentPlan.id, item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                        title="Remove stop"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Editing inline */}
                  {editingItemId === item.id ? (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Time (e.g. 19:30)"
                          value={editTime}
                          onChange={e => setEditTime(e.target.value)}
                          className="p-2 rounded-lg bg-white dark:bg-vybe-dark-card border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          placeholder="Custom note for squad"
                          value={editNote}
                          onChange={e => setEditNote(e.target.value)}
                          className="p-2 rounded-lg bg-white dark:bg-vybe-dark-card border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        className="px-3 py-1 rounded-lg bg-vybe-lime text-black font-bold text-xs flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Save Changes
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <p className="font-medium">
                        💡 {item.customNote || place?.tagline}
                      </p>
                      <div className="flex items-center gap-3 shrink-0 font-mono text-slate-400">
                        <span>📍 {place?.location.neighborhood}</span>
                        <span className="text-vybe-lime font-bold">~${place?.approxCostUsd}</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Next Stops Bar */}
      <div className="p-6 rounded-3xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Recommended Next Stops for this Vibe
            </h4>
            <p className="text-xs text-slate-500">
              Handpicked spots within quick walking distance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {places.slice(0, 3).map(p => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border"
            >
              <div className="truncate">
                <p className="font-display font-bold text-xs text-slate-900 dark:text-white truncate">
                  {p.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {p.category} · {p.distanceKm} km
                </p>
              </div>
              <button
                onClick={() => {
                  if (!requireAuth()) return;
                  addPlaceToPlan(currentPlan.id, p.id);
                }}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-vybe-dark-surface hover:bg-vybe-lime hover:text-black transition-all shrink-0"
                title="Add to plan"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

