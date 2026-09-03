import React, { useState } from 'react';
import { Heart, Bookmark, MapPin, Clock, Share2, Plus, Sparkles, ArrowUpRight, Gem, Utensils, Coffee, Music, Landmark, Trees, Gamepad2, ShoppingBag, Dumbbell, Film, Church, Waves, BookOpen, Hotel, Stethoscope } from 'lucide-react';
import { Place } from '../../types';
import { VybeScoreBadge } from '../common/VybeScoreBadge';
import { calculateVybeScore } from '../../hooks/useVybeScore';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { INITIAL_MOODS } from '../../data/initialMoods';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { classifyPlace } from '../../services/googlePlacesAdapter';

interface PlaceCardProps { place: Place; scoreInfo?: ReturnType<typeof calculateVybeScore>; featured?: boolean; }

function getPlaceFallbackIcon(place: Place, category: Place['category']) {
  const haystack = `${place.name} ${place.tags.join(' ')}`.toLowerCase();
  if (/mosque|masjid|مسجد|جامع|mosquée|mosquee/.test(haystack)) return Church;
  if (/church|église|eglise|كنيسة/.test(haystack)) return Church;
  if (/hospital|clinic|pharmacy|hôpital|clinique|مستشفى|صيدلية/.test(haystack)) return Stethoscope;
  if (/hotel|hôtel|hostel|فندق/.test(haystack)) return Hotel;
  if (/book|library|livre|bibliothèque|مكتبة/.test(haystack)) return BookOpen;
  if (/coffee|café|cafe|قهوة|مقهى/.test(haystack)) return Coffee;
  if (/restaurant|food|bakery|dessert|مطعم|مخبزة|حلويات/.test(haystack)) return Utensils;
  if (/music|concert|karaoke|live|musique|موسيقى/.test(haystack)) return Music;
  if (/cinema|movie|theater|film|cinéma|سينما|مسرح/.test(haystack)) return Film;
  if (/game|arcade|gaming|gamer|playstation|xbox|jeux|video game|ألعاب/.test(haystack)) return Gamepad2;
  if (/gym|fitness|sport|stadium|pool|swimming|tennis|رياضة|ملعب|مسبح/.test(haystack)) return Dumbbell;
  switch (category) {
    case 'food-drink': return Utensils;
    case 'nightlife': return Music;
    case 'arts-culture': return Landmark;
    case 'outdoors-nature': return Trees;
    case 'entertainment': return Film;
    case 'arcade-gaming': return Gamepad2;
    case 'shopping-vintage': return ShoppingBag;
    case 'chill-spots': return Coffee;
    case 'hidden-gems': return Landmark;
    default: return MapPin;
  }
}

function formatCategory(category: Place['category']): string {
  const labels: Record<Place['category'], string> = {
    'food-drink': 'Food & Drink', nightlife: 'Nightlife', 'arts-culture': 'Arts & Culture', 'outdoors-nature': 'Outdoors & Nature', entertainment: 'Entertainment', 'arcade-gaming': 'Arcade & Gaming', 'hidden-gems': 'Hidden Gem', 'chill-spots': 'Chill Spot', 'shopping-vintage': 'Shopping & Vintage'
  };
  return labels[category] ?? 'Place';
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place, scoreInfo }) => {
  const { toggleLikePlace, toggleSavePlace, isPlaceLiked, isPlaceSaved } = useAuth();
  const { openPlaceDetail, openShareModal, addPlaceToPlan, plans, showToast } = useData();
  const requireAuth = useRequireAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [failedImageIndexes, setFailedImageIndexes] = useState<number[]>([]);

  // Re-apply the same source-of-truth classifier used by Google discovery.
  // This protects Explorer when a cached/legacy Place has a stale category.
  const classified = classifyPlace(place.tags, place.name);
  const displayCategory = classified.category;
  const displayMood = classified.mood;
  const isLiked = isPlaceLiked(place.id);
  const isSaved = isPlaceSaved(place.id);
  const moodObj = INITIAL_MOODS.find(m => m.id === displayMood);
  const calculatedScore = scoreInfo || calculateVybeScore({ ...place, category: displayCategory, primaryMood: displayMood }, {});
  const availableImageIndexes = place.images.map((_, index) => index).filter(index => !failedImageIndexes.includes(index));
  const activeImageIndex = availableImageIndexes.includes(currentImageIndex) ? currentImageIndex : (availableImageIndexes[0] ?? -1);
  const imageUrl = activeImageIndex >= 0 ? place.images[activeImageIndex]?.trim() : undefined;
  const FallbackIcon = getPlaceFallbackIcon(place, displayCategory);
  const hasDistance = typeof place.distanceKm === 'number' && Number.isFinite(place.distanceKm) && place.distanceKm >= 0;
  const locationLabel = place.location.neighborhood?.trim() || place.location.address?.trim();
  const openState = place.openingHours.isOpenNow;

  const handleQuickAddPlan = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    if (plans.length > 0) addPlaceToPlan(plans[0].id, place.id);
    else showToast('Create a plan first in the Plans tab!', '📋', 'info');
  };

  return (
    <div onClick={() => openPlaceDetail({ ...place, category: displayCategory, primaryMood: displayMood })} data-testid="place-card" className="group relative flex flex-col rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border hover:border-vybe-lime/60 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer interactive-hover" data-cursor="VIEW">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
        {imageUrl ? <img src={imageUrl} alt={place.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" onError={() => { if (activeImageIndex >= 0) setFailedImageIndexes(prev => prev.includes(activeImageIndex) ? prev : [...prev, activeImageIndex]); }} /> :
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-300 bg-gradient-to-br from-slate-950 via-slate-900 to-vybe-dark-surface" aria-label={`${place.name} category icon`}>
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner"><FallbackIcon className="w-8 h-8 text-vybe-lime" strokeWidth={1.7} /></div>
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-400">{formatCategory(displayCategory)}</span>
          </div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <VybeScoreBadge score={calculatedScore.score} size="sm" showLabel />
          <div className="flex items-center gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); if (!requireAuth()) return; toggleLikePlace(place.id); }} className={`p-2 rounded-full backdrop-blur-md transition-all ${isLiked ? 'bg-rose-500 text-white shadow-neon-pink scale-110' : 'bg-black/60 text-white hover:bg-black/80 hover:text-rose-400'}`} title={isLiked ? 'Liked' : 'Like this spot'} aria-label={isLiked ? `Unlike ${place.name}` : `Like ${place.name}`}><Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-white' : ''}`} /></button>
            <button onClick={(e) => { e.stopPropagation(); if (!requireAuth()) return; toggleSavePlace(place.id); }} className={`p-2 rounded-full backdrop-blur-md transition-all ${isSaved ? 'bg-vybe-lime text-black shadow-neon-lime scale-110' : 'bg-black/60 text-white hover:bg-black/80 hover:text-vybe-lime'}`} title={isSaved ? 'Saved to My VYBES' : 'Save to My VYBES'} aria-label={isSaved ? `Unsave ${place.name}` : `Save ${place.name}`}><Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-black' : ''}`} /></button>
          </div>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5">{moodObj && <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1 border border-white/10"><span>{moodObj.emoji}</span><span>{moodObj.label}</span></span>}{place.features.isSecretGem && <span className="px-2 py-1 rounded-lg bg-purple-500/80 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1"><Gem className="w-3 h-3" /><span>Hidden</span></span>}</div>
          <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-vybe-lime text-xs font-mono font-bold border border-vybe-lime/30">{place.features.isFree ? 'FREE' : place.priceLevel}</span>
        </div>
        {availableImageIndexes.length > 1 && <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">{availableImageIndexes.map(idx => <button key={idx} aria-label={`Show photo ${idx + 1} of ${place.images.length}`} onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === activeImageIndex ? 'bg-vybe-lime w-4' : 'bg-white/40'}`} />)}</div>}
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-1 min-w-0"><MapPin className="w-3.5 h-3.5 text-vybe-cyan shrink-0" /><span className="truncate">🇩🇿 Algeria · {locationLabel || 'Location unavailable'}{hasDistance ? ` · ${place.distanceKm!.toFixed(1)} km` : ''}</span></div>
            {openState !== undefined && <div className="flex items-center gap-1 shrink-0 font-mono text-[11px]"><span className={`w-2 h-2 rounded-full ${openState ? 'bg-emerald-400' : 'bg-rose-400'}`} /><span className={openState ? 'text-emerald-500 dark:text-emerald-400 font-bold' : 'text-slate-400'}>{openState ? 'Open Now' : 'Closed'}</span></div>}
          </div>
          <div className="flex items-center gap-2"><span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{formatCategory(displayCategory)}</span></div>
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white group-hover:text-vybe-lime transition-colors leading-tight line-clamp-1">{place.name}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">{place.tagline || place.location.address || 'Real place discovered via Google Places.'}</p>
        </div>
        {calculatedScore.reasons.length > 0 ? <div className="p-2 rounded-xl bg-slate-100 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-vybe-lime shrink-0" /><span className="truncate font-medium">{calculatedScore.reasons[0]}</span></div> : place.estimatedDuration && <div className="flex items-center gap-2 text-xs text-slate-500 font-mono"><Clock className="w-3.5 h-3.5" /><span>Est. {place.estimatedDuration}</span></div>}
        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
          <button onClick={handleQuickAddPlan} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-vybe-dark-surface hover:bg-vybe-lime hover:text-black dark:hover:bg-vybe-lime dark:hover:text-black transition-all" title="Add to current outing plan"><Plus className="w-3.5 h-3.5" /><span>Add to Plan</span></button>
          <div className="flex items-center gap-1"><button onClick={(e) => { e.stopPropagation(); openShareModal(place); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors" title="Share Place Card" aria-label={`Share ${place.name}`}><Share2 className="w-4 h-4" /></button><span className="flex items-center text-xs font-bold text-slate-900 dark:text-white group-hover:translate-x-1 transition-transform" aria-hidden="true"><ArrowUpRight className="w-4 h-4 text-vybe-lime" /></span></div>
        </div>
      </div>
    </div>
  );
};
