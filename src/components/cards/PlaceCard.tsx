import React, { useState } from 'react';
import {
  Heart,
  Bookmark,
  MapPin,
  Clock,
  Share2,
  Plus,
  Sparkles,
  ArrowUpRight,
  Gem,
} from 'lucide-react';
import { Place } from '../../types';
import { VybeScoreBadge } from '../common/VybeScoreBadge';
import { calculateVybeScore } from '../../hooks/useVybeScore';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { INITIAL_MOODS } from '../../data/initialMoods';
import { useRequireAuth } from '../../hooks/useRequireAuth';

interface PlaceCardProps {
  place: Place;
  scoreInfo?: ReturnType<typeof calculateVybeScore>;
  featured?: boolean;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place, scoreInfo }) => {
  const { toggleLikePlace, toggleSavePlace, isPlaceLiked, isPlaceSaved } = useAuth();
  const { openPlaceDetail, openShareModal, addPlaceToPlan, plans, showToast } = useData();
  const requireAuth = useRequireAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  const isLiked = isPlaceLiked(place.id);
  const isSaved = isPlaceSaved(place.id);
  const moodObj = INITIAL_MOODS.find(m => m.id === place.primaryMood);
  const calculatedScore = scoreInfo || calculateVybeScore(place, {});
  const imageUrl = place.images[currentImageIndex]?.trim();
  const hasDistance = typeof place.distanceKm === 'number' && Number.isFinite(place.distanceKm) && place.distanceKm >= 0;
  const locationLabel = place.location.neighborhood?.trim() || place.location.address?.trim();
  const openState = place.openingHours.isOpenNow;

  const handleQuickAddPlan = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    if (plans.length > 0) {
      addPlaceToPlan(plans[0].id, place.id);
    } else {
      showToast('Create a plan first in the Plans tab!', '📋', 'info');
    }
  };

  return (
    <div
      onClick={() => openPlaceDetail(place)}
      data-testid="place-card"
      className="group relative flex flex-col rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border hover:border-vybe-lime/60 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer interactive-hover"
      data-cursor="VIEW"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
        {imageUrl && !imageFailed ? (
          <img
            src={imageUrl}
            alt={place.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-900" aria-label="No place photo available">
            <MapPin className="w-8 h-8 opacity-60" />
            <span className="text-[11px] font-mono uppercase tracking-wider">No photo available</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <VybeScoreBadge score={calculatedScore.score} size="sm" showLabel />
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!requireAuth()) return;
                toggleLikePlace(place.id);
              }}
              className={`p-2 rounded-full backdrop-blur-md transition-all ${isLiked ? 'bg-rose-500 text-white shadow-neon-pink scale-110' : 'bg-black/60 text-white hover:bg-black/80 hover:text-rose-400'}`}
              title={isLiked ? 'Liked' : 'Like this spot'}
              aria-label={isLiked ? `Unlike ${place.name}` : `Like ${place.name}`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-white' : ''}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!requireAuth()) return;
                toggleSavePlace(place.id);
              }}
              className={`p-2 rounded-full backdrop-blur-md transition-all ${isSaved ? 'bg-vybe-lime text-black shadow-neon-lime scale-110' : 'bg-black/60 text-white hover:bg-black/80 hover:text-vybe-lime'}`}
              title={isSaved ? 'Saved to My VYBES' : 'Save to My VYBES'}
              aria-label={isSaved ? `Unsave ${place.name}` : `Save ${place.name}`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-black' : ''}`} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5">
            {moodObj && (
              <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1 border border-white/10">
                <span>{moodObj.emoji}</span>
                <span>{moodObj.label}</span>
              </span>
            )}
            {place.features.isSecretGem && (
              <span className="px-2 py-1 rounded-lg bg-purple-500/80 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
                <Gem className="w-3 h-3" />
                <span>Hidden</span>
              </span>
            )}
          </div>

          <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-vybe-lime text-xs font-mono font-bold border border-vybe-lime/30">
            {place.features.isFree ? 'FREE' : place.priceLevel}
          </span>
        </div>

        {place.images.length > 1 && !imageFailed && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
            {place.images.map((_, idx) => (
              <button
                key={idx}
                aria-label={`Show photo ${idx + 1} of ${place.images.length}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(idx);
                  setImageFailed(false);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-vybe-lime w-4' : 'bg-white/40'}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-vybe-cyan shrink-0" />
              <span className="truncate">
                {locationLabel || 'Location unavailable'}
                {hasDistance ? ` · ${place.distanceKm!.toFixed(1)} km` : ''}
              </span>
            </div>
            {openState !== undefined && (
              <div className="flex items-center gap-1 shrink-0 font-mono text-[11px]">
                <span className={`w-2 h-2 rounded-full ${openState ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className={openState ? 'text-emerald-500 dark:text-emerald-400 font-bold' : 'text-slate-400'}>
                  {openState ? 'Open Now' : 'Closed'}
                </span>
              </div>
            )}
          </div>

          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white group-hover:text-vybe-lime transition-colors leading-tight line-clamp-1">
            {place.name}
          </h3>

          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {place.tagline || place.location.address || 'Real place discovered via Google Places.'}
          </p>
        </div>

        {calculatedScore.reasons.length > 0 ? (
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-vybe-lime shrink-0" />
            <span className="truncate font-medium">{calculatedScore.reasons[0]}</span>
          </div>
        ) : (
          place.estimatedDuration && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>Est. {place.estimatedDuration}</span>
            </div>
          )
        )}

        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
          <button
            onClick={handleQuickAddPlan}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-vybe-dark-surface hover:bg-vybe-lime hover:text-black dark:hover:bg-vybe-lime dark:hover:text-black transition-all"
            title="Add to current outing plan"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add to Plan</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openShareModal(place);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
              title="Share Place Card"
              aria-label={`Share ${place.name}`}
            >
              <Share2 className="w-4 h-4" />
            </button>
            <span className="flex items-center text-xs font-bold text-slate-900 dark:text-white group-hover:translate-x-1 transition-transform" aria-hidden="true">
              <ArrowUpRight className="w-4 h-4 text-vybe-lime" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
