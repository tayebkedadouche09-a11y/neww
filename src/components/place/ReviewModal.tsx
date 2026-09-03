import React, { useState } from 'react';
import { X, Star, Send } from 'lucide-react';
import { MoodType } from '../../types';
import { INITIAL_MOODS } from '../../data/initialMoods';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useRequireAuth } from '../../hooks/useRequireAuth';

export const ReviewModal: React.FC = () => {
  const { isReviewModalOpen, setIsReviewModalOpen, selectedPlace, addReview } = useData();
  const { currentUser } = useAuth();
  const requireAuth = useRequireAuth();
  const [rating, setRating] = useState(5);
  const [vibeRating, setVibeRating] = useState(95);
  const [comment, setComment] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<MoodType[]>(['chill']);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsReviewModalOpen(false); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsReviewModalOpen]);

  if (!isReviewModalOpen || !selectedPlace) return null;

  const toggleMood = (mood: MoodType) => {
    setSelectedMoods(prev => prev.includes(mood)
      ? (prev.length > 1 ? prev.filter(item => item !== mood) : prev)
      : [...prev, mood]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !requireAuth() || !currentUser) return;
    addReview(selectedPlace.id, {
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      rating,
      vibeRating,
      moodTags: selectedMoods,
      comment: comment.trim()
    });
    setComment('');
    setIsReviewModalOpen(false);
  };

  return (
    <div data-testid="review-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn cursor-pointer" onClick={() => setIsReviewModalOpen(false)}>
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border shadow-2xl p-6 sm:p-8 space-y-6 cursor-default" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={() => setIsReviewModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white bg-slate-100 dark:bg-vybe-dark-surface transition-colors" aria-label="Close review dialog"><X className="w-4 h-4" /></button>
        <div>
          <span className="text-xs font-mono text-vybe-lime font-bold uppercase tracking-wider">VIBE CHECK</span>
          <h3 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white mt-0.5">Rate {selectedPlace.name}</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Star Rating</label>
            <div className="flex items-center gap-2">
              {[1,2,3,4,5].map(star => <button type="button" key={star} aria-label={`${star} star${star === 1 ? '' : 's'}`} onClick={() => setRating(star)} className="p-1 hover:scale-125 transition-transform"><Star className={`w-7 h-7 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} /></button>)}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold"><span className="text-slate-700 dark:text-slate-300">Vibe Match Intensity</span><span className="font-mono text-vybe-lime">{vibeRating}% VYBE</span></div>
            <input type="range" min="50" max="100" value={vibeRating} onChange={e => setVibeRating(Number(e.target.value))} className="w-full accent-vybe-lime cursor-pointer" aria-label="Vibe match intensity" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tag Moods (Select what applies)</label>
            <div className="flex flex-wrap gap-1.5">{INITIAL_MOODS.slice(0,8).map(m => <button type="button" key={m.id} aria-pressed={selectedMoods.includes(m.id)} onClick={() => toggleMood(m.id)} className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${selectedMoods.includes(m.id) ? 'bg-vybe-lime text-black border-vybe-lime font-bold' : 'bg-slate-100 dark:bg-vybe-dark-surface border-slate-200 dark:border-vybe-dark-border text-slate-600 dark:text-slate-400'}`}>{m.emoji} {m.label}</button>)}</div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Your Review & Insider Tip</label>
            <textarea required rows={3} placeholder="What was the energy like? What should people order or try?" value={comment} onChange={e => setComment(e.target.value)} className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-slate-900 dark:text-white text-sm focus:outline-none focus:border-vybe-lime" />
          </div>
          <button type="submit" disabled={!currentUser} className="w-full py-3.5 rounded-2xl bg-vybe-lime text-black font-display font-extrabold text-sm uppercase tracking-wider shadow-neon-lime hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-60"><Send className="w-4 h-4" /><span>Publish Vibe Review</span></button>
        </form>
      </div>
    </div>
  );
};
