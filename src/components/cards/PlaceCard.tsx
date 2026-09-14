import React, { useEffect, useRef, useState } from 'react';
import { Heart, Bookmark, MapPin, Share2, Plus, Navigation, Gem, Utensils, Coffee, Music, Landmark, Trees, Gamepad2, ShoppingBag, Dumbbell, Film, Church, BookOpen, Hotel, Stethoscope, BadgeCheck } from 'lucide-react';
import { Place } from '../../types';
import { VybeScoreBadge } from '../common/VybeScoreBadge';
import { calculateVybeScore } from '../../hooks/useVybeScore';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { INITIAL_MOODS } from '../../data/initialMoods';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { getGooglePlaceDetails, isGoogleDetailQuotaBlocked } from '../../services/googlePlaces';
import { resolvePlaceImages } from '../../services/photoFallback';
import { canonicalLabel } from '../../data/categoryTaxonomy';

interface PlaceCardProps { place: Place; scoreInfo?: ReturnType<typeof calculateVybeScore>; featured?: boolean; }

function getPlaceFallbackIcon(place: Place, category: Place['category']) {
  const haystack = `${place.name} ${place.tags.join(' ')}`.toLowerCase();
  const canonical = place.canonicalCategory;
  if (!canonical && /hospital|clinic|pharmacy|hôpital|clinique|مستشفى|صيدلية/.test(haystack)) return Stethoscope;
  if (canonical === 'worship') return Church;
  switch (canonical) {
    case 'restaurant': return Utensils;
    case 'cafe': return Coffee;
    case 'games': return Gamepad2;
    case 'cinema': return Film;
    case 'park':
    case 'outdoors': return Trees;
    case 'gym': return Dumbbell;
    case 'shopping': return ShoppingBag;
    case 'nightlife': return Music;
    case 'family-kids': return Gamepad2;
    case 'tourist': return Landmark;
    case 'arts-culture': return Landmark;
    case 'library': return BookOpen;
    case 'wellness': return Coffee;
    case 'hotel': return Hotel;
    case 'entertainment': return Film;
  }
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
  return ({
    'food-drink': 'Food & Drink',
    nightlife: 'Nightlife',
    'arts-culture': 'Arts & Culture',
    'outdoors-nature': 'Outdoors & Nature',
    entertainment: 'Entertainment',
    'arcade-gaming': 'Arcade & Gaming',
    'hidden-gems': 'Hidden Gem',
    'chill-spots': 'Chill Spot',
    'shopping-vintage': 'Shopping & Vintage',
  } as Record<Place['category'], string>)[category] ?? 'Place';
}

function displayCategoryLabel(place: Place): string {
  return place.canonicalCategory ? canonicalLabel(place.canonicalCategory) : formatCategory(place.category);
}

function getTrustLabel(place: Place) {
  return place.provider === 'google' ? 'Google verified' : place.provider === 'osm' ? 'OpenStreetMap' : 'VYBE curated';
}

function formatLocationLine(place: Place): string {
  const parts: string[] = [];
  const neighborhood = place.location.neighborhood?.trim();
  const city = place.location.city?.trim();
  const address = place.location.address?.trim();

  if (neighborhood) parts.push(neighborhood);
  else if (city) parts.push(city);
  else if (address) {
    const short = address.split(',').slice(0, 2).join(',').trim();
    parts.push(short || address);
  }

  if (typeof place.distanceKm === 'number' && Number.isFinite(place.distanceKm) && place.distanceKm >= 0) {
    parts.push(`${place.distanceKm.toFixed(1)} km`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'Nearby';
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place, scoreInfo }) => {
  const { toggleLikePlace, toggleSavePlace, isPlaceLiked, isPlaceSaved } = useAuth();
  const { openPlaceDetail, openShareModal, addPlaceToPlan, plans, showToast, setActiveTab, setSelectedPlace } = useData();
  const requireAuth = useRequireAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [failedImageIndexes, setFailedImageIndexes] = useState<number[]>([]);
  const [refreshedImages, setRefreshedImages] = useState<string[] | null>(null);
  const refreshAttemptedRef = useRef(false);

  const displayCategory = place.category;
  const displayMood = place.primaryMood;
  const isLiked = isPlaceLiked(place.id);
  const isSaved = isPlaceSaved(place.id);
  const moodObj = INITIAL_MOODS.find(m => m.id === displayMood);
  const calculatedScore = scoreInfo || calculateVybeScore(place, {});

  // Always have at least one displayable image (Google or category fallback)
  const baseImages = resolvePlaceImages({
    ...place,
    images: refreshedImages ?? place.images,
  });
  const imageList = baseImages;
  const availableImageIndexes = imageList.map((_, i) => i).filter(i => !failedImageIndexes.includes(i));
  const activeImageIndex = availableImageIndexes.includes(currentImageIndex)
    ? currentImageIndex
    : (availableImageIndexes[0] ?? -1);
  const imageUrl = activeImageIndex >= 0 ? imageList[activeImageIndex]?.trim() : undefined;

  const FallbackIcon = getPlaceFallbackIcon(place, displayCategory);
  const categoryLabel = displayCategoryLabel(place);
  const openState = place.openingHours.isOpenNow;
  const trustLabel = getTrustLabel(place);
  const locationLine = formatLocationLine(place);

  const refreshGoogleImages = async () => {
    if (refreshAttemptedRef.current) return;
    if (isGoogleDetailQuotaBlocked()) return;
    const isGoogle = place.provider === 'google' && Boolean(place.providerPlaceId);
    if (!isGoogle) return;
    // Only try when we don't already have a real Google photo
    if (place.images.length > 0) return;
    refreshAttemptedRef.current = true;
    try {
      const fresh = await getGooglePlaceDetails(place.providerPlaceId!);
      const imgs = (fresh?.images ?? []).filter(Boolean);
      if (imgs.length) {
        setRefreshedImages(imgs);
        setFailedImageIndexes([]);
        setCurrentImageIndex(0);
      }
    } catch {
      // Quota or network — fallback photo already shown via resolvePlaceImages
      refreshAttemptedRef.current = true;
    }
  };

  const cardRef = useRef<HTMLDivElement | null>(null);

  // Optional upgrade to real Google photo when quota allows (does not block UI)
  useEffect(() => {
    if (place.provider !== 'google' || place.images.length > 0) return;
    if (isGoogleDetailQuotaBlocked()) return;

    let cancelled = false;
    let observer: IntersectionObserver | null = null;

    const run = () => {
      if (!cancelled) void refreshGoogleImages();
    };

    if (typeof IntersectionObserver !== 'undefined' && cardRef.current) {
      observer = new IntersectionObserver(
        entries => {
          if (entries.some(e => e.isIntersecting)) {
            observer?.disconnect();
            observer = null;
            run();
          }
        },
        { rootMargin: '200px' }
      );
      observer.observe(cardRef.current);
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [place.id, place.provider, place.images.length]);

  const handleImageError = () => {
    if (activeImageIndex >= 0) {
      setFailedImageIndexes(prev => (prev.includes(activeImageIndex) ? prev : [...prev, activeImageIndex]));
    }
  };

  const handleQuickAddPlan = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth()) return;
    if (plans.length) addPlaceToPlan(plans[0].id, place.id, '20:00', place);
    else showToast('Create a plan first in the Plans tab!', '📋', 'info');
  };

  const handleOpenMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPlace(place);
    setActiveTab('map');
  };

  return (
    <div
      ref={cardRef}
      onClick={() => openPlaceDetail(place)}
      data-testid="place-card"
      className="group relative flex flex-col rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border hover:border-vybe-lime/60 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer interactive-hover"
      data-cursor="VIEW"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={place.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-300 bg-gradient-to-br from-slate-950 via-slate-900 to-vybe-dark-surface">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <FallbackIcon className="w-8 h-8 text-vybe-lime" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-400">{categoryLabel}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <VybeScoreBadge score={calculatedScore.score} size="sm" showLabel />
          <div className="flex items-center gap-1.5">
            <button
              onClick={e => {
                e.stopPropagation();
                if (!requireAuth()) return;
                toggleLikePlace(place.id);
              }}
              className={`p-2 rounded-full bg-black/60 text-white ${isLiked ? 'text-rose-400' : ''}`}
              title="Like this spot"
              aria-label={`Like ${place.name}`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                if (!requireAuth()) return;
                toggleSavePlace(place.id);
              }}
              className={`p-2 rounded-full bg-black/60 text-white ${isSaved ? 'text-vybe-lime' : ''}`}
              title="Save to My VYBES"
              aria-label={`Save ${place.name}`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5">
            {moodObj && (
              <span className="px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs font-bold flex items-center gap-1">
                <span>{moodObj.emoji}</span>
                <span>{moodObj.label}</span>
              </span>
            )}
            {place.features.isSecretGem && (
              <span className="px-2 py-1 rounded-lg bg-purple-500/80 text-white text-[10px] font-bold flex items-center gap-1">
                <Gem className="w-3 h-3" />
                <span>Hidden</span>
              </span>
            )}
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-black/70 text-vybe-lime text-xs font-mono font-bold">
            {place.features.isFree ? 'FREE' : place.priceLevel}
          </span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-vybe-cyan shrink-0" />
              <span className="truncate">{locationLine}</span>
            </div>
            {openState !== undefined && (
              <div className="flex items-center gap-1 shrink-0 font-mono text-[11px]">
                <span className={`w-2 h-2 rounded-full ${openState ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span>{openState ? 'Open Now' : 'Closed'}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {categoryLabel}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-vybe-cyan/10 border border-vybe-cyan/20 text-[10px] font-bold text-vybe-cyan">
              <BadgeCheck className="w-3 h-3" />
              {trustLabel}
            </span>
          </div>

          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white leading-tight line-clamp-1">
            {place.name}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {place.tagline || place.location.address || 'Real place discovered via Google Places.'}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
          <button
            onClick={handleQuickAddPlan}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-vybe-dark-surface"
          >
            <Plus className="w-3.5 h-3.5" />
            Add to Plan
          </button>
          <button
            onClick={handleOpenMap}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-vybe-dark-surface"
          >
            <Navigation className="w-3.5 h-3.5" />
            Map
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              openShareModal(place);
            }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-vybe-dark-surface"
            aria-label={`Share ${place.name}`}
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
