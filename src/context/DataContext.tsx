import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Place, MoodType, FilterState, Collection, VybePlan, PlanItem, PlaceReview } from '../types';
import { calculateVybeScore } from '../hooks/useVybeScore';
import { useGeolocation, GeoLocation, LocationSource } from '../hooks/useGeolocation';
import { useAuth } from './AuthContext';
import { dataMode } from '../lib/dataMode';
import { newUuid } from '../services/mappers';
import { placesService } from '../services/placesService';
import { collectionsService } from '../services/collectionsService';
import { plansService } from '../services/plansService';
import { reviewsService } from '../services/reviewsService';
import { discoverPlaces } from '../services/discoveryService';
import { getGooglePlaceDetails } from '../services/googlePlaces';

export type ActiveTab = 'explore' | 'map' | 'plan' | 'saved' | 'profile' | 'admin';
export interface ToastNotification { id: string; type: 'success' | 'info' | 'vibe'; message: string; emoji?: string; }
interface DataContextType {
  places: Place[]; activeTab: ActiveTab; setActiveTab: (tab: ActiveTab) => void;
  activeHeroMood: MoodType | null; setActiveHeroMood: (mood: MoodType | null) => void;
  filters: FilterState; setFilters: React.Dispatch<React.SetStateAction<FilterState>>; resetFilters: () => void;
  discoveryLoading: boolean; discoveryError: string | null; locationError: string | null; userLocation: GeoLocation | null; locationLabel: string | null; locationSource: LocationSource;
  requestLocationAndDiscover: () => void; discover: (overrideFilters?: FilterState) => void; discoverAtLocation: (location: GeoLocation, overrideFilters?: FilterState) => void;
  selectedPlace: Place | null; setSelectedPlace: (place: Place | null) => void; isDetailOpen: boolean; setIsDetailOpen: (open: boolean) => void;
  openPlaceDetail: (place: Place) => void; isReviewModalOpen: boolean; setIsReviewModalOpen: (open: boolean) => void;
  isShareModalOpen: boolean; setIsShareModalOpen: (open: boolean) => void; shareTargetPlace: Place | null; openShareModal: (place?: Place) => void;
  isAuthModalOpen: boolean; setIsAuthModalOpen: (open: boolean) => void; authModalMode: 'login' | 'register' | 'profile' | 'forgot'; setAuthModalMode: (mode: 'login' | 'register' | 'profile' | 'forgot') => void;
  plans: VybePlan[]; activePlan: VybePlan | null; setActivePlan: (plan: VybePlan | null) => void;
  createPlan: (title: string, mood: MoodType, targetBudgetUsd?: number) => VybePlan;
  addPlaceToPlan: (planId: string, placeId: string, customTime?: string, placeOverride?: Place) => void; removePlaceFromPlan: (planId: string, planItemId: string) => void;
  updatePlanItem: (planId: string, planItemId: string, updates: { startTime?: string; customNote?: string; durationMinutes?: number }) => void; deletePlan: (planId: string) => void;
  collections: Collection[]; createCollection: (name: string, emoji: string, color: string, description?: string) => Collection;
  addPlaceToCollection: (collectionId: string, placeId: string) => void; removePlaceFromCollection: (collectionId: string, placeId: string) => void; deleteCollection: (collectionId: string) => void;
  addReview: (placeId: string, review: Omit<PlaceReview, 'id' | 'createdAt' | 'likesCount'>) => void;
  addPlace: (place: Omit<Place, 'id' | 'rating' | 'reviewCount' | 'baseVybeScore' | 'reviews'>) => Place; updatePlace: (placeId: string, updates: Partial<Place>) => void; deletePlace: (placeId: string) => void;
  filteredPlaces: Array<{ place: Place; scoreInfo: ReturnType<typeof calculateVybeScore> }>;
  toasts: ToastNotification[]; showToast: (message: string, emoji?: string, type?: 'success' | 'info' | 'vibe') => void; removeToast: (id: string) => void;
}

const DEFAULT_FILTERS: FilterState = { searchQuery: '', moods: [], categories: [], priceLevels: [], maxBudget: undefined, maxDistanceKm: undefined, duration: undefined, companion: undefined, onlyOpenNow: false, onlyFree: false, onlyHiddenGems: false, onlyLateNight: false, sortBy: 'vybe-score' };

const DataContext = createContext<DataContextType | undefined>(undefined);
export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, sessionMode } = useAuth();
  const geo = useGeolocation();
  const [places, setPlaces] = useState<Place[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const discoveryRequestIdRef = useRef(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');
  const [activeHeroMood, setActiveHeroMood] = useState<MoodType | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTargetPlace, setShareTargetPlace] = useState<Place | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'profile' | 'forgot'>('login');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [plans, setPlans] = useState<VybePlan[]>([]);
  const [activePlan, setActivePlan] = useState<VybePlan | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const deepLinkHandledRef = useRef<string | null>(null);
  type GoogleHydrationState = { status: 'pending' | 'success' | 'failed'; nextAttemptAt: number };
  const googleHydrationStateRef = useRef<Map<string, GoogleHydrationState>>(new Map());
  const GOOGLE_HYDRATION_SUCCESS_COOLDOWN_MS = 10_000;
  const GOOGLE_HYDRATION_FAILURE_COOLDOWN_MS = 60_000;

  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  const showToast = useCallback((message: string, emoji = '⚡', type: 'success' | 'info' | 'vibe' = 'vibe') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts(prev => [...prev, { id, message, emoji, type }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  useEffect(() => {
    const handleActionFailed = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      if (detail?.message) showToast(detail.message, '⚠️', 'info');
    };
    window.addEventListener('vybe:action-failed', handleActionFailed);
    return () => window.removeEventListener('vybe:action-failed', handleActionFailed);
  }, [showToast]);

  const discoverAtLocation = useCallback((location: GeoLocation, overrideFilters?: FilterState) => {
    const activeFilters = overrideFilters ?? filters;
    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return;
    const radiusKm = (location.accuracy ?? 0) >= 15_000 ? 20 : 5;
    const requestId = ++discoveryRequestIdRef.current;
    setDiscoveryLoading(true);
    setDiscoveryError(null);
    discoverPlaces({ userLat: location.lat, userLng: location.lng, radiusKm, searchQuery: activeFilters.searchQuery.trim() || undefined, filters: activeFilters })
      .then(result => {
        if (requestId !== discoveryRequestIdRef.current) return;
        setPlaces(result);
      })
      .catch(err => {
        if (requestId !== discoveryRequestIdRef.current) return;
        console.error('[DataContext] Discovery failed:', err);
        setPlaces([]);
        const message = err instanceof Error ? err.message : 'Unable to load places right now.';
        setDiscoveryError(message);
        showToast(message, '⚠️', 'info');
      })
      .finally(() => {
        if (requestId === discoveryRequestIdRef.current) setDiscoveryLoading(false);
      });
  }, [filters, showToast]);

  const discover = useCallback((overrideFilters?: FilterState) => {
    if (!geo.location) { console.log('[discovery] Waiting for browser location.'); return; }
    discoverAtLocation(geo.location, overrideFilters);
  }, [geo.location, discoverAtLocation]);

  const requestLocationAndDiscover = useCallback(() => { geo.requestLocation(); }, [geo.requestLocation]);
  useEffect(() => { if (!geo.location && !geo.loading && !geo.error) geo.requestLocation(); }, [geo.location, geo.loading, geo.error, geo.requestLocation]);
  useEffect(() => { if (geo.location) discover(); }, [geo.location]);

  const realUserId = sessionMode === 'auth' ? currentUser?.id ?? null : null;
  useEffect(() => {
    let cancelled = false;
    if (!realUserId) {
      setCollections([]);
      setPlans([]);
      setActivePlan(null);
      return () => { cancelled = true; };
    }
    (async () => {
      try {
        const [remoteCollections, remotePlans] = await Promise.all([collectionsService.list(realUserId), plansService.list(realUserId)]);
        if (cancelled) return;
        setCollections(remoteCollections);
        setPlans(remotePlans);
        setActivePlan(prev => remotePlans.find(p => p.id === prev?.id) ?? remotePlans[0] ?? null);
      } catch (e) {
        console.error('[DataContext] User data hydration failed', e);
        if (!cancelled) { setCollections([]); setPlans([]); setActivePlan(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [realUserId]);

  useEffect(() => {
    let cancelled = false;
    const now = Date.now();
    const referencedIds = [...new Set([
      ...plans.flatMap(plan => plan.items.map(item => item.placeId)),
      ...collections.flatMap(collection => collection.placeIds),
    ])];
    const missingGoogleIds = referencedIds
      .filter(id => id.startsWith('google:'))
      .filter(id => !places.some(place => place.id === id))
      .map(id => id.slice('google:'.length))
      .filter(Boolean)
      .filter(providerId => {
        const state = googleHydrationStateRef.current.get(providerId);
        if (!state) return true;
        if (state.status === 'pending') return false;
        return state.nextAttemptAt <= now;
      });
    if (missingGoogleIds.length === 0) return;
    missingGoogleIds.forEach(providerId => {
      googleHydrationStateRef.current.set(providerId, { status: 'pending', nextAttemptAt: now + GOOGLE_HYDRATION_SUCCESS_COOLDOWN_MS });
    });
    void Promise.all(missingGoogleIds.map(async providerId => {
      try {
        const place = await getGooglePlaceDetails(providerId);
        googleHydrationStateRef.current.set(providerId, { status: 'success', nextAttemptAt: Date.now() + GOOGLE_HYDRATION_SUCCESS_COOLDOWN_MS });
        return place;
      } catch (error) {
        googleHydrationStateRef.current.set(providerId, { status: 'failed', nextAttemptAt: Date.now() + GOOGLE_HYDRATION_FAILURE_COOLDOWN_MS });
        console.warn('[DataContext] failed to rehydrate Google place', providerId, error);
        return null;
      }
    })).then(results => {
      if (cancelled) return;
      const restored = results.filter((place): place is Place => Boolean(place));
      if (!restored.length) return;
      setPlaces(prev => {
        const byId = new Map(prev.map(place => [place.id, place]));
        restored.forEach(place => byId.set(place.id, place));
        return [...byId.values()];
      });
    });
    return () => { cancelled = true; };
  }, [plans, collections, places]);

  const resetFilters = () => { setFilters(DEFAULT_FILTERS); setActiveHeroMood(null); };
  const openPlaceDetail = (place: Place) => { setSelectedPlace(place); setIsDetailOpen(true); };
  const openShareModal = (place?: Place) => { setShareTargetPlace(place || selectedPlace || null); setIsShareModalOpen(true); };
  const rollbackToast = (message: string) => { showToast(message, '⚠️', 'info'); };

  const createPlan = (title: string, mood: MoodType, targetBudgetUsd = 50) => {
    const newPlan: VybePlan = { id: newUuid(), userId: currentUser?.id || '', title, date: 'Upcoming Outing', mood, targetBudgetUsd, isPublic: true, createdAt: new Date().toISOString(), items: [] };
    if (!realUserId) return newPlan;
    setPlans(prev => [newPlan, ...prev]);
    setActivePlan(newPlan);
    void plansService.create(newPlan).catch(e => {
      console.error('[VYBE] create plan failed', e);
      setPlans(prev => prev.filter(p => p.id !== newPlan.id));
      setActivePlan(prev => prev?.id === newPlan.id ? null : prev);
      rollbackToast(`Could not create “${title}”. Please try again.`);
    });
    return newPlan;
  };

  const addPlaceToPlan = (planId: string, placeId: string, customTime = '20:00', placeOverride?: Place) => {
    const plan = plans.find(p => p.id === planId);
    const place = places.find(p => p.id === placeId) ?? placeOverride;
    if (!realUserId || !plan || plan.userId !== realUserId || !place || plan.items.some(item => item.placeId === placeId)) return;
    const newItem: PlanItem = { id: newUuid(), placeId, startTime: customTime, durationMinutes: 90, customNote: `Experience ${place.name} (${place.tagline})`, order: plan.items.length + 1 };
    const updatedPlans = plans.map(p => p.id === planId ? { ...p, items: [...p.items, newItem] } : p);
    setPlans(updatedPlans);
    setActivePlan(prev => prev?.id === planId ? updatedPlans.find(p => p.id === planId) || null : prev);
    if (placeOverride && !places.some(p => p.id === placeOverride.id)) setPlaces(prev => [placeOverride, ...prev]);
    void plansService.addItem(planId, newItem).catch(e => {
      console.error('[VYBE] add plan item failed', e);
      setPlans(plans);
      setActivePlan(prev => prev?.id === planId ? plans.find(p => p.id === planId) || null : prev);
      rollbackToast(`Could not add ${place.name} to your plan. Please try again.`);
    });
  };

  const removePlaceFromPlan = (planId: string, planItemId: string) => {
    const plan = plans.find(p => p.id === planId);
    const removedItem = plan?.items.find(item => item.id === planItemId);
    if (!realUserId || !plan || plan.userId !== realUserId) return;
    const updatedPlans = plans.map(p => p.id === planId ? { ...p, items: p.items.filter(item => item.id !== planItemId) } : p);
    setPlans(updatedPlans);
    if (activePlan?.id === planId) setActivePlan(updatedPlans.find(p => p.id === planId) || null);
    void plansService.removeItem(planItemId).catch(e => {
      console.error('[VYBE] remove plan item failed', e);
      if (removedItem) {
        const restoredPlans = plans.map(p => p.id === planId ? { ...p, items: [...p.items, removedItem].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) } : p);
        setPlans(restoredPlans);
        if (activePlan?.id === planId) setActivePlan(restoredPlans.find(p => p.id === planId) || null);
      }
      rollbackToast('Could not remove that stop. Please try again.');
    });
  };

  const updatePlanItem = (planId: string, planItemId: string, updates: { startTime?: string; customNote?: string; durationMinutes?: number }) => {
    const plan = plans.find(p => p.id === planId);
    if (!realUserId || !plan || plan.userId !== realUserId) return;
    const updatedPlans = plans.map(p => p.id === planId ? { ...p, items: p.items.map(item => item.id === planItemId ? { ...item, ...updates } : item) } : p);
    setPlans(updatedPlans);
    if (activePlan?.id === planId) setActivePlan(updatedPlans.find(p => p.id === planId) || null);
    void plansService.updateItem(planItemId, updates).catch(e => {
      console.error('[VYBE] update plan item failed', e);
      setPlans(plans);
      if (activePlan?.id === planId) setActivePlan(plans.find(p => p.id === planId) || null);
      rollbackToast('Could not save that change. Please try again.');
    });
  };

  const deletePlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!realUserId || !plan || plan.userId !== realUserId) return;
    setPlans(prev => {
      const nextPlans = prev.filter(p => p.id !== planId);
      if (activePlan?.id === planId) setActivePlan(nextPlans[0] || null);
      return nextPlans;
    });
    void plansService.remove(planId).catch(e => {
      console.error('[VYBE] delete plan failed', e);
      setPlans(prev => prev.some(p => p.id === planId) ? prev : [plan, ...prev]);
      rollbackToast('Could not delete that plan. Please try again.');
    });
  };

  const createCollection = (name: string, emoji: string, color: string, description = '') => {
    const nowIso = new Date().toISOString();
    const newCol: Collection = { id: newUuid(), userId: currentUser?.id || '', name, description, emoji, color, isPublic: true, placeIds: [], createdAt: nowIso, updatedAt: nowIso };
    if (!realUserId) return newCol;
    setCollections(prev => [newCol, ...prev]);
    void collectionsService.create(newCol).catch(e => {
      console.error('[VYBE] create collection failed', e);
      setCollections(prev => prev.filter(c => c.id !== newCol.id));
      rollbackToast(`Could not create “${name}”. Please try again.`);
    });
    return newCol;
  };

  const addPlaceToCollection = (collectionId: string, placeId: string) => {
    const col = collections.find(c => c.id === collectionId);
    const place = places.find(p => p.id === placeId);
    if (!realUserId || !col || col.userId !== realUserId || !place || col.placeIds.includes(placeId)) return;
    setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, placeIds: [...c.placeIds, placeId], updatedAt: new Date().toISOString() } : c));
    void collectionsService.addPlace(collectionId, placeId).catch(e => {
      console.error('[VYBE] add collection item failed', e);
      setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, placeIds: c.placeIds.filter(id => id !== placeId), updatedAt: new Date().toISOString() } : c));
      rollbackToast(`Could not add ${place.name} to the collection. Please try again.`);
    });
  };

  const removePlaceFromCollection = (collectionId: string, placeId: string) => {
    const col = collections.find(c => c.id === collectionId);
    if (!realUserId || !col || col.userId !== realUserId) return;
    setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, placeIds: c.placeIds.filter(id => id !== placeId) } : c));
    void collectionsService.removePlace(collectionId, placeId).catch(e => {
      console.error('[VYBE] remove collection item failed', e);
      setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, placeIds: c.placeIds.includes(placeId) ? c.placeIds : [...c.placeIds, placeId] } : c));
      rollbackToast('Could not remove that spot. Please try again.');
    });
  };

  const deleteCollection = (collectionId: string) => {
    const col = collections.find(c => c.id === collectionId);
    if (!realUserId || !col || col.userId !== realUserId) return;
    setCollections(prev => prev.filter(c => c.id !== collectionId));
    void collectionsService.remove(collectionId).catch(e => {
      console.error('[VYBE] delete collection failed', e);
      setCollections(prev => prev.some(c => c.id === collectionId) ? prev : [col, ...prev]);
      rollbackToast('Could not delete that collection. Please try again.');
    });
  };

  const addReview = (placeId: string, reviewData: Omit<PlaceReview, 'id' | 'createdAt' | 'likesCount'>) => {
    const target = places.find(p => p.id === placeId);
    if (!realUserId || !target || reviewData.userId !== realUserId) return;
    const newReview: PlaceReview = { ...reviewData, id: newUuid(), createdAt: 'Just now', likesCount: 0 };
    const updatedPlace = { ...target, reviews: [newReview, ...target.reviews], rating: Number(((target.rating * target.reviewCount + reviewData.rating) / (target.reviewCount + 1)).toFixed(1)), reviewCount: target.reviewCount + 1 };
    setPlaces(prev => prev.map(p => p.id === placeId ? updatedPlace : p));
    if (selectedPlace?.id === placeId) setSelectedPlace(updatedPlace);
    void reviewsService.create({ placeId, userId: reviewData.userId, rating: reviewData.rating, vibeRating: reviewData.vibeRating, moodTags: reviewData.moodTags, comment: reviewData.comment, id: newReview.id }).catch(e => {
      console.error('[VYBE] add review failed', e);
      setPlaces(prev => prev.map(p => p.id === placeId ? target : p));
      if (selectedPlace?.id === placeId) setSelectedPlace(target);
      rollbackToast('Could not post your review. Please try again.');
    });
  };

  const addPlace = (placeData: Omit<Place, 'id' | 'rating' | 'reviewCount' | 'baseVybeScore' | 'reviews'>) => {
    const newPlace: Place = { ...placeData, id: newUuid(), rating: 0, reviewCount: 0, baseVybeScore: 70, reviews: [] };
    setPlaces(prev => [newPlace, ...prev]);
    if (dataMode === 'supabase') void placesService.create(newPlace).catch(e => console.error('[VYBE] add place failed', e));
    return newPlace;
  };

  const updatePlace = (placeId: string, updates: Partial<Place>) => {
    setPlaces(prev => prev.map(p => p.id === placeId ? { ...p, ...updates } : p));
    if (selectedPlace?.id === placeId) setSelectedPlace(prev => prev ? { ...prev, ...updates } : null);
    if (dataMode === 'supabase') void placesService.update(placeId, updates).catch(e => console.error('[VYBE] update place failed', e));
  };

  const deletePlace = (placeId: string) => {
    setPlaces(prev => prev.filter(p => p.id !== placeId));
    if (selectedPlace?.id === placeId) { setSelectedPlace(null); setIsDetailOpen(false); }
    if (dataMode === 'supabase') void placesService.remove(placeId).catch(e => console.error('[VYBE] delete place failed', e));
  };

  const filteredPlaces = useMemo(() => {
    const effectiveMoods = filters.moods.length ? filters.moods : (activeHeroMood ? [activeHeroMood] : []);
    return places
      .map(place => ({ place, scoreInfo: calculateVybeScore(place, { selectedMoods: effectiveMoods, budget: filters.maxBudget || (filters.priceLevels.length === 1 ? filters.priceLevels[0] : undefined), duration: filters.duration, companion: filters.companion }) }))
      .sort((a, b) => b.scoreInfo.score - a.scoreInfo.score);
  }, [places, filters.moods, filters.priceLevels, filters.maxBudget, filters.duration, filters.companion, activeHeroMood]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get('place');
    if (!placeId || deepLinkHandledRef.current === placeId) return;
    deepLinkHandledRef.current = placeId;
    const existing = places.find(p => p.id === placeId);
    if (existing) { openPlaceDetail(existing); return; }
    if (placeId.startsWith('google:')) {
      void getGooglePlaceDetails(placeId.slice('google:'.length)).then(place => {
        if (place) { setPlaces(prev => prev.some(p => p.id === place.id) ? prev : [place, ...prev]); openPlaceDetail(place); }
      }).catch(() => showToast('That place could not be loaded.', '⚠️', 'info'));
    }
  }, [places]);

  const value: DataContextType = {
    places, activeTab, setActiveTab, activeHeroMood, setActiveHeroMood, filters, setFilters, resetFilters,
    discoveryLoading, discoveryError, locationError: geo.error, userLocation: geo.location, locationLabel: geo.locationLabel, locationSource: geo.locationSource,
    requestLocationAndDiscover, discover, discoverAtLocation,
    selectedPlace, setSelectedPlace, isDetailOpen, setIsDetailOpen, openPlaceDetail,
    isReviewModalOpen, setIsReviewModalOpen, isShareModalOpen, setIsShareModalOpen, shareTargetPlace, openShareModal,
    isAuthModalOpen, setIsAuthModalOpen, authModalMode, setAuthModalMode,
    plans, activePlan, setActivePlan, createPlan, addPlaceToPlan, removePlaceFromPlan, updatePlanItem, deletePlan,
    collections, createCollection, addPlaceToCollection, removePlaceFromCollection, deleteCollection,
    addReview, addPlace, updatePlace, deletePlace, filteredPlaces, toasts, showToast, removeToast,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};
