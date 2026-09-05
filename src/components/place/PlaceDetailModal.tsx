import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Clock, Heart, Bookmark, Share2, Plus, Star, Sparkles, ExternalLink, Navigation, MessageSquarePlus, Gem, BadgeCheck as BadgeCheckIcon } from 'lucide-react';
import { Place } from '../../types';
import { VybeScoreBadge } from '../common/VybeScoreBadge';
import { calculateVybeScore } from '../../hooks/useVybeScore';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { INITIAL_MOODS } from '../../data/initialMoods';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { getGoogleMapsPlaceUrl, getGooglePlaceDetails } from '../../services/googlePlaces';
import { canonicalLabel } from '../../data/categoryTaxonomy';

function getPlaceFallbackEmoji(place: Place): string {
  const canonical = place.canonicalCategory;
  if (canonical === 'worship') {
    const text = `${place.name} ${place.tags.join(' ')}`.toLowerCase();
    if (/church|eglise|église|كنيسة/.test(text)) return '⛪';
    if (/synagogue/.test(text)) return '🕍';
    if (/temple|hindu|hindou|معبد/.test(text)) return '🛕';
    return '🕌';
  }
  switch (canonical) {
    case 'restaurant': return '🍽️';
    case 'cafe': return '☕';
    case 'games': return '🎮';
    case 'cinema': return '🎬';
    case 'park':
    case 'outdoors': return '🌳';
    case 'gym': return '🏋️';
    case 'shopping': return '🛍️';
    case 'nightlife': return '🎵';
    case 'family-kids': return '🎪';
    case 'tourist': return '🏛️';
    case 'arts-culture': return '🎭';
    case 'library': return '📚';
    case 'wellness': return '🧘';
    case 'hotel': return '🏨';
    case 'entertainment': return '🎡';
  }
  switch (place.category) {
    case 'food-drink': return '🍽️';
    case 'nightlife': return '🎵';
    case 'arcade-gaming': return '🎮';
    case 'outdoors-nature': return '🌳';
    case 'entertainment': return '🎬';
    case 'arts-culture': return '🏛️';
    case 'shopping-vintage': return '🛍️';
    case 'chill-spots': return '☕';
    default: return '📍';
  }
}

export const PlaceDetailModal: React.FC = () => {
  const { selectedPlace, isDetailOpen, setIsDetailOpen, openShareModal, plans, addPlaceToPlan, setIsReviewModalOpen, collections, addPlaceToCollection, showToast, setActiveTab, setSelectedPlace } = useData();
  const { toggleLikePlace, toggleSavePlace, isPlaceLiked, isPlaceSaved } = useAuth();
  const requireAuth = useRequireAuth();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<number[]>([]);
  const refreshAttemptedRef = useRef(false);
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || '');
  const [selectedCollectionId, setSelectedCollectionId] = useState(collections[0]?.id || '');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsDetailOpen(false); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsDetailOpen]);

  useEffect(() => {
    // Fresh gallery state every time a different place is opened.
    setActiveImageIndex(0);
    setFailedImages([]);
    refreshAttemptedRef.current = false;
    if (!isDetailOpen || !selectedPlace) return;
    const providerId = selectedPlace.providerPlaceId || (selectedPlace.id.startsWith('google:') ? selectedPlace.id.slice('google:'.length) : '');
    const isGoogle = selectedPlace.provider === 'google' || Boolean(providerId);
    if (!isGoogle || !providerId || selectedPlace.images.some(image => /^https?:\/\//i.test(image?.trim()))) return;
    let cancelled = false;
    void getGooglePlaceDetails(providerId).then(freshPlace => {
      if (cancelled || !freshPlace) return;
      const images = freshPlace.images?.filter(Boolean) ?? [];
      if (!images.length) return;
      setSelectedPlace({ ...selectedPlace, ...freshPlace, images });
    }).catch(error => console.warn('[PlaceDetailModal] photo hydration failed', providerId, error));
    return () => { cancelled = true; };
  }, [isDetailOpen, selectedPlace?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (plans.length && !plans.some(plan => plan.id === selectedPlanId)) setSelectedPlanId(plans[0].id);
    if (collections.length && !collections.some(collection => collection.id === selectedCollectionId)) setSelectedCollectionId(collections[0].id);
  }, [plans, collections, selectedPlanId, selectedCollectionId]);

  if (!isDetailOpen || !selectedPlace) return null;

  const isLiked = isPlaceLiked(selectedPlace.id);
  const isSaved = isPlaceSaved(selectedPlace.id);
  const moodObj = INITIAL_MOODS.find(m => m.id === selectedPlace.primaryMood);
  const detailScore = calculateVybeScore(selectedPlace, {});
  const imageUrls = selectedPlace.images.filter(image => /^https?:\/\//i.test(image?.trim())).map(image => image.trim());
  // failedImages holds ORIGINAL indexes into imageUrls (never re-derived ones).
  const availableIndexes = imageUrls.map((_, index) => index).filter(index => !failedImages.includes(index));
  const activeImageIndexSafe = availableIndexes.includes(activeImageIndex) ? activeImageIndex : (availableIndexes[0] ?? -1);
  const activeImage = activeImageIndexSafe >= 0 ? imageUrls[activeImageIndexSafe] : undefined;
  const hasDistance = typeof selectedPlace.distanceKm === 'number' && Number.isFinite(selectedPlace.distanceKm) && selectedPlace.distanceKm >= 0;
  const distanceText = hasDistance ? `${selectedPlace.distanceKm!.toFixed(1)} km away` : 'Distance unavailable';

  // One photo may never take the modal down: a failed image is skipped, and if
  // every photo fails for a Google place we refresh details once (covers
  // expired photo URLs) before showing the graceful emoji placeholder.
  const handleHeroImageError = async () => {
    if (activeImageIndexSafe < 0) return;
    if (refreshAttemptedRef.current) {
      setFailedImages(prev => prev.includes(activeImageIndexSafe) ? prev : [...prev, activeImageIndexSafe]);
      return;
    }
    refreshAttemptedRef.current = true;
    const providerId = selectedPlace.providerPlaceId || (selectedPlace.id.startsWith('google:') ? selectedPlace.id.slice('google:'.length) : '');
    const isGoogle = selectedPlace.provider === 'google' || Boolean(providerId);
    if (isGoogle && providerId) {
      try {
        const freshPlace = await getGooglePlaceDetails(providerId);
        const freshImages = freshPlace?.images?.filter(Boolean) ?? [];
        if (freshImages.length && freshImages.some(img => /^https?:\/\//i.test(img?.trim()))) {
          setSelectedPlace({ ...selectedPlace, ...freshPlace, images: freshImages });
          setFailedImages([]);
          setActiveImageIndex(0);
          return;
        }
      } catch (error) {
        console.warn('[PlaceDetailModal] Google photo refresh failed', providerId, error);
      }
    }
    setFailedImages(prev => prev.includes(activeImageIndexSafe) ? prev : [...prev, activeImageIndexSafe]);
  };

  const handleAddPlan = () => {
    if (!requireAuth()) return;
    const targetPlanId = selectedPlanId || plans[0]?.id;
    if (targetPlanId) { addPlaceToPlan(targetPlanId, selectedPlace.id); return; }
    showToast('Create an outing plan first.', '📋', 'info');
    setActiveTab('plan');
  };
  const handleSaveCollection = () => {
    if (!requireAuth()) return;
    if (selectedCollectionId) { addPlaceToCollection(selectedCollectionId, selectedPlace.id); return; }
    showToast('Create a collection first.', '📁', 'info');
    setActiveTab('saved');
  };
  const openInAppMap = () => { setIsDetailOpen(false); setActiveTab('map'); setSelectedPlace(selectedPlace); showToast(`${selectedPlace.name} is centered on the VYBE map`, '📍', 'success'); };
  const openGoogleMaps = () => {
    if (selectedPlace.providerPlaceId) { window.open(getGoogleMapsPlaceUrl(selectedPlace.providerPlaceId), '_blank'); return; }
    const query = encodeURIComponent(`${selectedPlace.name} ${selectedPlace.location.address} ${selectedPlace.location.city}`);
    window.open(`https://maps.google.com/?q=${query}`, '_blank');
  };

  return (
    <div data-testid="place-detail-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-xl animate-fadeIn cursor-pointer" onClick={() => setIsDetailOpen(false)}>
      <div className="relative w-full max-w-4xl rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col cursor-default" onClick={e => e.stopPropagation()}>
        <button onClick={() => setIsDetailOpen(false)} aria-label="Close place details" className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/70 hover:bg-black text-white backdrop-blur-md transition-all shadow-lg hover:scale-110"><X className="w-5 h-5" /></button>
        <div className="overflow-y-auto flex-1">
          <div className="relative w-full h-80 sm:h-96 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-vybe-dark-surface">
            {activeImage ? <img src={activeImage} alt={selectedPlace.name} decoding="async" className="w-full h-full object-cover transition-opacity duration-300" onError={() => void handleHeroImageError()} /> : <div className="w-full h-full flex flex-col items-center justify-center gap-3" aria-label={`${selectedPlace.name} photo placeholder`}><span className="text-6xl">{moodObj?.emoji ?? getPlaceFallbackEmoji(selectedPlace)}</span><span className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-[10px] font-mono uppercase tracking-[0.2em]">No photo yet — explore this vibe in person</span></div>}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />
            <div className="absolute top-4 left-4 flex items-center gap-2 z-10"><VybeScoreBadge score={detailScore.score} size="lg" showLabel />{moodObj && <span className="px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-bold border border-white/10 flex items-center gap-1.5"><span>{moodObj.emoji}</span><span>{moodObj.label} Vibe</span></span>}</div>
            {availableIndexes.length > 1 && <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 overflow-x-auto no-scrollbar z-10">{availableIndexes.map(idx => <button key={idx} type="button" onClick={() => setActiveImageIndex(idx)} aria-label={`Show photo ${idx + 1} of ${imageUrls.length}`} className={`shrink-0 w-16 h-12 rounded-xl overflow-hidden border-2 transition-all ${idx === activeImageIndexSafe ? 'border-vybe-lime scale-105 shadow-neon-lime' : 'border-white/30 opacity-70 hover:opacity-100'}`}><img src={imageUrls[idx]} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /></button>)}</div>}
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
              <div><div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono mb-1"><MapPin className="w-3.5 h-3.5 text-vybe-cyan" /><span>{selectedPlace.location.neighborhood || selectedPlace.location.city || selectedPlace.location.address}</span><span>·</span><span className="font-bold text-slate-700 dark:text-slate-200">{distanceText}</span></div><h2 className="font-display font-extrabold text-2xl sm:text-4xl text-slate-900 dark:text-white">{selectedPlace.name}</h2><p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1 font-medium">{selectedPlace.tagline}</p></div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => { if (!requireAuth()) return; toggleLikePlace(selectedPlace.id); }} className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-xs border transition-all ${isLiked ? 'bg-rose-500 text-white border-rose-500 shadow-neon-pink' : 'bg-slate-100 dark:bg-vybe-dark-surface text-slate-700 dark:text-slate-300 border-slate-200 dark:border-vybe-dark-border hover:text-rose-500'}`}><Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} /><span>{isLiked ? 'Liked' : 'Like'}</span></button>
                <button type="button" onClick={() => { if (!requireAuth()) return; toggleSavePlace(selectedPlace.id); }} className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-xs border transition-all ${isSaved ? 'bg-vybe-lime text-black border-vybe-lime shadow-neon-lime' : 'bg-slate-100 dark:bg-vybe-dark-surface text-slate-700 dark:text-slate-300 border-slate-200 dark:border-vybe-dark-border hover:text-vybe-lime'}`}><Bookmark className={`w-4 h-4 ${isSaved ? 'fill-black' : ''}`} /><span>{isSaved ? 'Saved' : 'Save'}</span></button>
                <button type="button" onClick={() => openShareModal(selectedPlace)} aria-label="Share place" className="p-2.5 rounded-2xl bg-slate-100 dark:bg-vybe-dark-surface text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-vybe-dark-border hover:text-vybe-citrus transition-all"><Share2 className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="text-xs text-slate-400 font-mono">ESTIMATED COST</span><p className="font-display font-bold text-base text-slate-900 dark:text-white mt-1">{selectedPlace.features.isFree ? '100% FREE' : selectedPlace.approxCostUsd > 0 ? `~$${Math.round(selectedPlace.approxCostUsd)} (${selectedPlace.priceLevel})` : selectedPlace.priceLevel}</p></div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="text-xs text-slate-400 font-mono">IDEAL DURATION</span><p className="font-display font-bold text-base text-slate-900 dark:text-white mt-1">{selectedPlace.estimatedDuration || 'Flexible'}</p></div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="text-xs text-slate-400 font-mono">STATUS NOW</span><p className="font-display font-bold text-base mt-1 flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${selectedPlace.openingHours.isOpenNow === true ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} /><span className={selectedPlace.openingHours.isOpenNow === true ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}>{selectedPlace.openingHours.isOpenNow === undefined ? 'Status unavailable' : selectedPlace.openingHours.isOpenNow ? 'Open Now' : 'Closed'}</span></p></div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="text-xs text-slate-400 font-mono">SUITABLE FOR</span><p className="font-display font-bold text-base text-slate-900 dark:text-white mt-1 capitalize">{selectedPlace.suitableFor.join(', ') || 'Everyone'}</p></div>
            </div>            <div className="space-y-3"><h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">About the Vibe</h3><p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">{selectedPlace.description || 'A real place discovered through VYBE.'}</p></div>            {(selectedPlace.canonicalCategory || (selectedPlace.secondaryCategories && selectedPlace.secondaryCategories.length > 0) || selectedPlace.relevance) && <div className="p-5 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border space-y-3"><div className="flex items-center justify-between gap-3"><h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Place identity & match evidence</h3><span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${selectedPlace.relevance?.decision === 'ACCEPT' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'}`}>{selectedPlace.relevance?.decision === 'ACCEPT' ? 'Relevant match' : 'Identity only'}</span></div>{selectedPlace.canonicalCategory && <div className="text-xs text-slate-700 dark:text-slate-300 flex flex-wrap items-center gap-2"><span>Primary identity:</span><strong className="font-black text-slate-900 dark:text-white">{canonicalLabel(selectedPlace.canonicalCategory)}</strong>{selectedPlace.provider === 'google' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-vybe-cyan/10 border border-vybe-cyan/20 text-vybe-cyan font-bold"><BadgeCheckIcon className="w-3 h-3"/>Google provider-verified</span>}{selectedPlace.provider === 'osm' && <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold">OpenStreetMap</span>}</div>}{(selectedPlace.secondaryCategories && selectedPlace.secondaryCategories.length > 0) && <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"><span className="font-bold">Also offers:</span>{selectedPlace.secondaryCategories.map(secondary => <span key={secondary} className="px-2 py-0.5 rounded-md bg-vybe-lime/10 border border-vybe-lime/25 text-vybe-lime font-bold">{canonicalLabel(secondary)}</span>)}</div>}{selectedPlace.provider === 'google' && (selectedPlace.providerPrimaryType || (selectedPlace.providerTypes && selectedPlace.providerTypes.length > 0)) && <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">provider types: {selectedPlace.providerPrimaryType || (selectedPlace.providerTypes || []).slice(0, 6).join(', ')}</div>}{selectedPlace.relevance && <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2"><div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-1"><span>identity confidence: {Math.round((selectedPlace.relevance.providerIdentityConfidence || 0) * 100)}%</span>{selectedPlace.relevance.categoryMatch !== 'N/A' && <span>category: {selectedPlace.relevance.categoryMatch}</span>}{selectedPlace.relevance.intentMatch !== 'N/A' && <span>intent: {selectedPlace.relevance.intentMatch}</span>}</div><div className="flex flex-wrap gap-1.5">{selectedPlace.relevance.reasons.map(reason => <span key={reason} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-vybe-dark-card border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">{reason}</span>)}</div></div>}</div>}            <div className="space-y-3"><h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">Highlights & Features</h3><div className="flex flex-wrap gap-2">{selectedPlace.tags.map(tag => <span key={tag} className="px-3 py-1 rounded-xl bg-vybe-lime/10 text-slate-900 dark:text-vybe-lime border border-vybe-lime/30 text-xs font-semibold">#{tag}</span>)}{selectedPlace.features.isSecretGem && <span className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs font-semibold flex items-center gap-1"><Gem className="w-3.5 h-3.5"/> Secret Gem</span>}{selectedPlace.features.isOutdoor && <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">🌿 Open Air / Outdoor</span>}{selectedPlace.features.isLateNight && <span className="px-3 py-1 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/30 text-xs font-semibold">🌙 Late Night Spot</span>}{selectedPlace.features.isPetFriendly && <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold">🐾 Dog Friendly</span>}</div></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><div className="space-y-2"><h4 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5"><Clock className="w-4 h-4 text-vybe-lime"/><span>Opening Timetable</span></h4><div className="text-xs space-y-1 font-mono text-slate-600 dark:text-slate-300"><div className="flex justify-between"><span>Mon - Thu:</span><span>{selectedPlace.openingHours.monday || '—'}</span></div><div className="flex justify-between"><span>Friday:</span><span>{selectedPlace.openingHours.friday || '—'}</span></div><div className="flex justify-between"><span>Saturday:</span><span>{selectedPlace.openingHours.saturday || '—'}</span></div><div className="flex justify-between"><span>Sunday:</span><span>{selectedPlace.openingHours.sunday || '—'}</span></div></div></div><div className="space-y-3 flex flex-col justify-between"><div><h4 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5"><Navigation className="w-4 h-4 text-vybe-cyan"/><span>Location & Directions</span></h4><p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{selectedPlace.location.address}</p></div><button type="button" onClick={openInAppMap} className="w-full py-2.5 px-4 rounded-xl bg-vybe-lime text-black font-display font-bold text-xs flex items-center justify-center gap-2 shadow-neon-lime hover:scale-[1.02] transition-all"><MapPin className="w-4 h-4"/> View on VYBE Map</button><button type="button" onClick={openGoogleMaps} className="w-full py-2.5 px-4 rounded-xl bg-black text-white dark:bg-white dark:text-black font-display font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] transition-all"><ExternalLink className="w-4 h-4"/> Open in Navigation / Maps</button></div></div>

            <div className="p-5 rounded-2xl bg-gradient-to-r from-vybe-lime/10 via-vybe-cyan/10 to-transparent border border-vybe-lime/30 space-y-4"><div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-vybe-lime"/><h4 className="font-display font-bold text-sm text-slate-900 dark:text-white">Add To Itinerary or Custom Collection</h4></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="flex items-center gap-2"><select aria-label="Select outing plan" value={selectedPlanId} onChange={e=>setSelectedPlanId(e.target.value)} className="flex-1 bg-white dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white"><option value="">Select a plan</option>{plans.map(p=><option key={p.id} value={p.id}>Plan: {p.title}</option>)}</select><button type="button" onClick={handleAddPlan} className="px-4 py-2 rounded-xl bg-vybe-lime text-black font-bold text-xs shadow-neon-lime hover:scale-105 transition-all shrink-0">Add to Plan</button></div><div className="flex items-center gap-2"><select aria-label="Select collection" value={selectedCollectionId} onChange={e=>setSelectedCollectionId(e.target.value)} className="flex-1 bg-white dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white"><option value="">Select a collection</option>{collections.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}</select><button type="button" onClick={handleSaveCollection} className="px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black font-bold text-xs hover:scale-105 transition-all shrink-0">Save</button></div></div></div>

            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10"><div className="flex items-center justify-between"><div><h3 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2"><span>Vibe Check & Community Reviews</span><span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-vybe-dark-surface font-mono">{selectedPlace.reviews.length}</span></h3><div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400"/><span className="font-bold text-slate-800 dark:text-white">{selectedPlace.rating}</span><span>average rating from youth explorers</span></div></div><button type="button" onClick={()=>{if(!requireAuth())return;setIsReviewModalOpen(true);}} className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-vybe-citrus/15 text-vybe-citrus hover:bg-vybe-citrus hover:text-white font-bold text-xs border border-vybe-citrus/40 transition-all"><MessageSquarePlus className="w-4 h-4"/><span>Leave Vibe Review</span></button></div>{selectedPlace.reviews.length===0?<div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface/50 border border-slate-200 dark:border-vybe-dark-border space-y-2"><span className="text-3xl">✨</span><p className="font-display font-bold text-slate-800 dark:text-white text-sm">Be the first to rate this vibe!</p><p className="text-xs text-slate-500">Share your experience, tips, and photos with the community.</p></div>:<div className="space-y-3">{selectedPlace.reviews.map(rev=><div key={rev.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border space-y-2"><div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><img src={rev.userAvatar} alt={rev.userName} loading="lazy" decoding="async" className="w-8 h-8 rounded-full object-cover border border-vybe-lime"/><div><p className="font-display font-bold text-xs text-slate-900 dark:text-white">{rev.userName}</p><p className="text-[10px] text-slate-400">{rev.createdAt}</p></div></div><div className="flex items-center gap-1 text-xs text-amber-400 font-bold"><Star className="w-3.5 h-3.5 fill-amber-400"/><span>{rev.rating}.0</span></div></div><p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">"{rev.comment}"</p><div className="flex items-center gap-2 pt-1">{rev.moodTags.map(tag=><span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono">#{tag}</span>)}</div></div>)}</div>}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
