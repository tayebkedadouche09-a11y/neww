import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Place, MoodType, FilterState, Collection, VybePlan, PlanItem, PlaceReview } from '../types';
import { calculateVybeScore } from '../hooks/useVybeScore';
import { useGeolocation, GeoLocation } from '../hooks/useGeolocation';
import { useAuth } from './AuthContext';
import { dataMode, LOCAL_STORAGE_KEYS } from '../lib/dataMode';
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
  discoveryLoading: boolean; discoveryError: string | null; locationError: string | null; userLocation: GeoLocation | null;
  requestLocationAndDiscover: () => void; discover: (overrideFilters?: FilterState) => void; discoverAtLocation: (location: GeoLocation, overrideFilters?: FilterState) => void;
  selectedPlace: Place | null; setSelectedPlace: (place: Place | null) => void; isDetailOpen: boolean; setIsDetailOpen: (open: boolean) => void;
  openPlaceDetail: (place: Place) => void; isReviewModalOpen: boolean; setIsReviewModalOpen: (open: boolean) => void;
  isShareModalOpen: boolean; setIsShareModalOpen: (open: boolean) => void; shareTargetPlace: Place | null; openShareModal: (place?: Place) => void;
  isAuthModalOpen: boolean; setIsAuthModalOpen: (open: boolean) => void; authModalMode: 'login' | 'register' | 'profile' | 'forgot'; setAuthModalMode: (mode: 'login' | 'register' | 'profile' | 'forgot') => void;
  plans: VybePlan[]; activePlan: VybePlan | null; setActivePlan: (plan: VybePlan | null) => void;
  createPlan: (title: string, mood: MoodType, targetBudgetUsd?: number) => VybePlan;
  addPlaceToPlan: (planId: string, placeId: string, customTime?: string) => void; removePlaceFromPlan: (planId: string, planItemId: string) => void;
  updatePlanItem: (planId: string, planItemId: string, updates: { startTime?: string; customNote?: string; durationMinutes?: number }) => void; deletePlan: (planId: string) => void;
  collections: Collection[]; createCollection: (name: string, emoji: string, color: string, description?: string) => Collection;
  addPlaceToCollection: (collectionId: string, placeId: string) => void; removePlaceFromCollection: (collectionId: string, placeId: string) => void; deleteCollection: (collectionId: string) => void;
  addReview: (placeId: string, review: Omit<PlaceReview, 'id' | 'createdAt' | 'likesCount'>) => void;
  addPlace: (place: Omit<Place, 'id' | 'rating' | 'reviewCount' | 'baseVybeScore' | 'reviews'>) => Place; updatePlace: (placeId: string, updates: Partial<Place>) => void; deletePlace: (placeId: string) => void;
  filteredPlaces: Array<{ place: Place; scoreInfo: ReturnType<typeof calculateVybeScore> }>;
  toasts: ToastNotification[]; showToast: (message: string, emoji?: string, type?: 'success' | 'info' | 'vibe') => void; removeToast: (id: string) => void;
}

const DEFAULT_FILTERS: FilterState = { searchQuery: '', moods: [], categories: [], priceLevels: [], maxBudget: undefined, maxDistanceKm: undefined, duration: undefined, companion: undefined, onlyOpenNow: false, onlyFree: false, onlyHiddenGems: false, onlyLateNight: false, sortBy: 'vybe-score' };
const INITIAL_COLLECTIONS: Collection[] = [
  { id: 'col-1', userId: 'u-1', name: 'Weekend Hype & Sunsets', description: 'Golden hour rooftops, neon arcades & late night street tacos', emoji: '🌆', color: '#CCFF00', isPublic: true, placeIds: ['place-1', 'place-2', 'place-15'], createdAt: '2025-01-10T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z' },
  { id: 'col-2', userId: 'u-1', name: 'Lo-Fi Chill & Matcha Nooks', description: 'Best spots to read, draw or listen to ambient vinyl', emoji: '🍵', color: '#00F0FF', isPublic: true, placeIds: ['place-3', 'place-12', 'place-16'], createdAt: '2025-01-12T14:00:00Z', updatedAt: '2025-01-18T16:00:00Z' },
  { id: 'col-3', userId: 'u-1', name: 'Date Night Magic', description: 'Aesthetic speakeasies, pottery workshops & LED glowing kayaks', emoji: '✨', color: '#FF007F', isPublic: false, placeIds: ['place-4', 'place-5', 'place-11', 'place-18'], createdAt: '2025-01-14T19:00:00Z', updatedAt: '2025-01-20T21:00:00Z' }
];
const INITIAL_PLANS: VybePlan[] = [{ id: 'plan-1', userId: 'u-1', title: 'Epic Friday Night Outing', date: 'Tonight', mood: 'party', targetBudgetUsd: 65, coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', isPublic: true, createdAt: '2025-01-20T18:00:00Z', items: [
  { id: 'item-1', placeId: 'place-15', startTime: '19:00', durationMinutes: 60, customNote: 'Fuel up on al pastor tacos & fresh agua fresca 🌮', order: 1 },
  { id: 'item-2', placeId: 'place-2', startTime: '20:30', durationMinutes: 90, customNote: 'DDR battle and Mario Kart tournament with the squad 🕹️', order: 2 },
  { id: 'item-3', placeId: 'place-1', startTime: '22:30', durationMinutes: 120, customNote: 'Rooftop cocktail lounge under city lights 🌃', order: 3 }
] }];

const DataContext = createContext<DataContextType | undefined>(undefined);
export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, sessionMode } = useAuth();
  const geo = useGeolocation();
  const [places, setPlaces] = useState<Place[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
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
  const [collections, setCollections] = useState<Collection[]>(() => { const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.collections); if (saved) { try { return JSON.parse(saved); } catch (e) { console.error('Failed to parse collections', e); } } return INITIAL_COLLECTIONS; });
  const [plans, setPlans] = useState<VybePlan[]>(() => { const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.plans); if (saved) { try { return JSON.parse(saved); } catch (e) { console.error('Failed to parse plans', e); } } return INITIAL_PLANS; });
  const [activePlan, setActivePlan] = useState<VybePlan | null>(plans[0] || null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const deepLinkHandledRef = useRef<string | null>(null);

  useEffect(() => { if (dataMode === 'local') localStorage.setItem(LOCAL_STORAGE_KEYS.places, JSON.stringify(places)); }, [places]);
  useEffect(() => { if (dataMode === 'local') localStorage.setItem(LOCAL_STORAGE_KEYS.collections, JSON.stringify(collections)); }, [collections]);
  useEffect(() => { if (dataMode === 'local') localStorage.setItem(LOCAL_STORAGE_KEYS.plans, JSON.stringify(plans)); }, [plans]);
  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  const showToast = useCallback((message: string, emoji = '⚡', type: 'success' | 'info' | 'vibe' = 'vibe') => { const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`; setToasts(prev => [...prev, { id, message, emoji, type }]); setTimeout(() => removeToast(id), 4000); }, [removeToast]);

  const discoverAtLocation = useCallback((location: GeoLocation, overrideFilters?: FilterState) => {
    const activeFilters = overrideFilters ?? filters;
    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return;
    setDiscoveryLoading(true);
    setDiscoveryError(null);
    discoverPlaces({ userLat: location.lat, userLng: location.lng, radiusKm: 5, searchQuery: activeFilters.searchQuery.trim() || undefined, filters: activeFilters })
      .then(result => { setPlaces(result); })
      .catch(err => { console.error('[DataContext] Discovery failed:', err); setPlaces([]); const message = err instanceof Error ? err.message : 'Unable to load places right now.'; setDiscoveryError(message); showToast(message, '⚠️', 'info'); })
      .finally(() => setDiscoveryLoading(false));
  }, [filters, showToast]);

  const discover = useCallback((overrideFilters?: FilterState) => {
    if (!geo.location) { console.log('[discovery] Waiting for browser location.'); return; }
    discoverAtLocation(geo.location, overrideFilters);
  }, [geo.location, discoverAtLocation]);

  const requestLocationAndDiscover = useCallback(() => { geo.requestLocation(); }, [geo.requestLocation]);
  useEffect(() => { if (!geo.location && !geo.loading && !geo.error) geo.requestLocation(); }, [geo.location, geo.loading, geo.error, geo.requestLocation]);
  useEffect(() => { if (geo.location) discover(); }, [geo.location]);

  const realUserId = dataMode === 'supabase' && sessionMode === 'auth' ? currentUser?.id ?? null : null;
  useEffect(() => {
    if (!realUserId) return; let cancelled = false;
    (async () => { try { const [remoteCollections, remotePlans] = await Promise.all([collectionsService.list(realUserId), plansService.list(realUserId)]); if (cancelled) return; setCollections(remoteCollections); setPlans(remotePlans); setActivePlan(prev => remotePlans.find(p => p.id === prev?.id) ?? remotePlans[0] ?? null); } catch (e) { console.error('[DataContext] User data hydration failed', e); } })();
    return () => { cancelled = true; };
  }, [realUserId]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get('place');
    const planId = params.get('plan');
    const collectionId = params.get('collection');
    const routeKey = placeId ? `place:${placeId}` : planId ? `plan:${planId}` : collectionId ? `collection:${collectionId}` : null;
    if (!routeKey || deepLinkHandledRef.current === routeKey) return;

    const resolveDeepLink = async () => {
      if (placeId) {
        const localPlace = places.find(item => item.id === placeId);
        if (localPlace) {
          if (cancelled) return;
          deepLinkHandledRef.current = routeKey;
          setSelectedPlace(localPlace);
          setIsDetailOpen(true);
          setActiveTab('explore');
          return;
        }
        try {
          let publicPlace: Place | null = null;
          if (placeId.startsWith('google:')) {
            const providerId = placeId.slice('google:'.length);
            if (providerId) publicPlace = await getGooglePlaceDetails(providerId);
          } else if (dataMode === 'supabase') {
            publicPlace = await placesService.getPublic(placeId);
          }
          if (!publicPlace || cancelled) return;
          deepLinkHandledRef.current = routeKey;
          setPlaces(prev => prev.some(item => item.id === publicPlace!.id) ? prev : [publicPlace!, ...prev]);
          setSelectedPlace(publicPlace);
          setIsDetailOpen(true);
          setActiveTab('explore');
        } catch (error) {
          console.warn('[DataContext] Public place deep link could not be resolved', error);
        }
        return;
      }

      if (planId) {
        const localPlan = plans.find(item => item.id === planId);
        if (localPlan) {
          if (cancelled) return;
          deepLinkHandledRef.current = routeKey;
          setActivePlan(localPlan);
          setActiveTab('plan');
          return;
        }
        if (dataMode === 'supabase') {
          try {
            const publicPlan = await plansService.getPublic(planId);
            if (!publicPlan || cancelled) return;
            deepLinkHandledRef.current = routeKey;
            setPlans(prev => [publicPlan, ...prev.filter(item => item.id !== publicPlan.id)]);
            setActivePlan(publicPlan);
            setActiveTab('plan');
          } catch (error) {
            console.warn('[DataContext] Public plan deep link could not be resolved', error);
          }
        }
        return;
      }

      if (collectionId) {
        const localCollection = collections.find(item => item.id === collectionId);
        if (localCollection) {
          if (cancelled) return;
          deepLinkHandledRef.current = routeKey;
          setActiveTab('saved');
          return;
        }
        if (dataMode === 'supabase') {
          try {
            const publicCollection = await collectionsService.getPublic(collectionId);
            if (!publicCollection || cancelled) return;
            deepLinkHandledRef.current = routeKey;
            setCollections(prev => [publicCollection, ...prev.filter(item => item.id !== publicCollection.id)]);
            setActiveTab('saved');
          } catch (error) {
            console.warn('[DataContext] Public collection deep link could not be resolved', error);
          }
        }
      }
    };

    void resolveDeepLink();
    return () => { cancelled = true; };
  }, [places, plans, collections]);

  const resetFilters = () => { setFilters(DEFAULT_FILTERS); setActiveHeroMood(null); };
  const openPlaceDetail = (place: Place) => { setSelectedPlace(place); setIsDetailOpen(true); };
  const openShareModal = (place?: Place) => { setShareTargetPlace(place || selectedPlace || null); setIsShareModalOpen(true); };

  const createPlan = (title: string, mood: MoodType, targetBudgetUsd = 50) => { const newPlan: VybePlan = { id: dataMode === 'supabase' ? newUuid() : `plan-${Date.now()}`, userId: currentUser?.id || 'u-1', title, date: 'Upcoming Outing', mood, targetBudgetUsd, isPublic: true, createdAt: new Date().toISOString(), items: [] }; setPlans(prev => [newPlan, ...prev]); setActivePlan(newPlan); if (realUserId) void plansService.create(newPlan).catch(e => console.error(e)); return newPlan; };
  const addPlaceToPlan = (planId: string, placeId: string, customTime = '20:00') => { const plan = plans.find(p => p.id === planId); const place = places.find(p => p.id === placeId); if (!plan || !place || plan.items.some(item => item.placeId === placeId)) return; const newItem: PlanItem = { id: dataMode === 'supabase' ? newUuid() : `item-${Date.now()}`, placeId, startTime: customTime, durationMinutes: 90, customNote: `Experience ${place.name} (${place.tagline})`, order: plan.items.length + 1 }; const updatedPlans = plans.map(p => p.id === planId ? { ...p, items: [...p.items, newItem] } : p); setPlans(updatedPlans); setActivePlan(prev => prev?.id === planId ? updatedPlans.find(p => p.id === planId) || null : prev); if (realUserId) void plansService.addItem(planId, newItem).catch(e => console.error(e)); };
  const removePlaceFromPlan = (planId: string, planItemId: string) => { const updatedPlans = plans.map(p => p.id === planId ? { ...p, items: p.items.filter(item => item.id !== planItemId) } : p); setPlans(updatedPlans); if (activePlan?.id === planId) setActivePlan(updatedPlans.find(p => p.id === planId) || null); if (realUserId) void plansService.removeItem(planItemId).catch(e => console.error(e)); };
  const updatePlanItem = (planId: string, planItemId: string, updates: { startTime?: string; customNote?: string; durationMinutes?: number }) => { const updatedPlans = plans.map(p => p.id === planId ? { ...p, items: p.items.map(item => item.id === planItemId ? { ...item, ...updates } : item) } : p); setPlans(updatedPlans); if (activePlan?.id === planId) setActivePlan(updatedPlans.find(p => p.id === planId) || null); if (realUserId) void plansService.updateItem(planItemId, updates).catch(e => console.error(e)); };
  const deletePlan = (planId: string) => { setPlans(prev => { const nextPlans = prev.filter(p => p.id !== planId); if (activePlan?.id === planId) setActivePlan(nextPlans[0] || null); return nextPlans; }); if (realUserId) void plansService.remove(planId).catch(e => console.error(e)); };
  const createCollection = (name: string, emoji: string, color: string, description = '') => { const nowIso = new Date().toISOString(); const newCol: Collection = { id: dataMode === 'supabase' ? newUuid() : `col-${Date.now()}`, userId: currentUser?.id || 'u-1', name, description, emoji, color, isPublic: true, placeIds: [], createdAt: nowIso, updatedAt: nowIso }; setCollections(prev => [newCol, ...prev]); if (realUserId) void collectionsService.create(newCol).catch(e => console.error(e)); return newCol; };
  const addPlaceToCollection = (collectionId: string, placeId: string) => { const col = collections.find(c => c.id === collectionId); if (!col || !places.some(p => p.id === placeId) || col.placeIds.includes(placeId)) return; setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, placeIds: [...c.placeIds, placeId], updatedAt: new Date().toISOString() } : c)); if (realUserId) void collectionsService.addPlace(collectionId, placeId).catch(e => console.error(e)); };
  const removePlaceFromCollection = (collectionId: string, placeId: string) => { setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, placeIds: c.placeIds.filter(id => id !== placeId) } : c)); if (realUserId) void collectionsService.removePlace(collectionId, placeId).catch(e => console.error(e)); };
  const deleteCollection = (collectionId: string) => { setCollections(prev => prev.filter(c => c.id !== collectionId)); if (realUserId) void collectionsService.remove(collectionId).catch(e => console.error(e)); };
  const addReview = (placeId: string, reviewData: Omit<PlaceReview, 'id' | 'createdAt' | 'likesCount'>) => { const target = places.find(p => p.id === placeId); if (!target) return; const newReview: PlaceReview = { ...reviewData, id: dataMode === 'supabase' ? newUuid() : `rev-${Date.now()}`, createdAt: 'Just now', likesCount: 0 }; const updatedPlace = { ...target, reviews: [newReview, ...target.reviews], rating: Number(((target.rating * target.reviewCount + reviewData.rating) / (target.reviewCount + 1)).toFixed(1)), reviewCount: target.reviewCount + 1 }; setPlaces(prev => prev.map(p => p.id === placeId ? updatedPlace : p)); setSelectedPlace(cur => cur?.id === placeId ? updatedPlace : cur); if (realUserId) void reviewsService.create({ placeId, userId: reviewData.userId, rating: reviewData.rating, vibeRating: reviewData.vibeRating, moodTags: reviewData.moodTags, comment: reviewData.comment, id: newReview.id }).catch(e => console.error(e)); };
  const addPlace = (placeData: Omit<Place, 'id' | 'rating' | 'reviewCount' | 'baseVybeScore' | 'reviews'>) => { const newPlace: Place = { ...placeData, id: dataMode === 'supabase' ? newUuid() : `place-${Date.now()}`, rating: 4.8, reviewCount: 1, baseVybeScore: 92, reviews: [] }; setPlaces(prev => [newPlace, ...prev]); if (realUserId) void placesService.create(newPlace).catch(e => console.error(e)); return newPlace; };
  const updatePlace = (placeId: string, updates: Partial<Place>) => { setPlaces(prev => prev.map(p => p.id === placeId ? { ...p, ...updates } : p)); if (selectedPlace?.id === placeId) setSelectedPlace(prev => prev ? { ...prev, ...updates } : null); if (realUserId) void placesService.update(placeId, updates).catch(e => console.error(e)); };
  const deletePlace = (placeId: string) => { setPlaces(prev => prev.filter(p => p.id !== placeId)); if (selectedPlace?.id === placeId) { setSelectedPlace(null); setIsDetailOpen(false); } if (realUserId) void placesService.remove(placeId).catch(e => console.error(e)); };

  const filteredPlaces = useMemo(() => {
    const effectiveMoods = activeHeroMood ? [activeHeroMood, ...filters.moods.filter(m => m !== activeHeroMood)] : filters.moods;
    return places
      .filter(place => {
        if (filters.categories.length && !filters.categories.includes(place.category)) return false;
        if (filters.priceLevels.length && !filters.priceLevels.includes(place.priceLevel)) return false;
        if (filters.onlyOpenNow && place.openingHours.isOpenNow !== true) return false;
        if (filters.onlyFree && !place.features.isFree) return false;
        if (filters.onlyHiddenGems && !place.features.isSecretGem) return false;
        if (filters.onlyLateNight && !place.features.isLateNight) return false;
        if (filters.maxDistanceKm !== undefined && (place.distanceKm === undefined || place.distanceKm > filters.maxDistanceKm)) return false;
        return true;
      })
      .map(place => ({ place, scoreInfo: calculateVybeScore(place, { selectedMoods: effectiveMoods, budget: filters.maxBudget || (filters.priceLevels.length === 1 ? filters.priceLevels[0] : undefined), duration: filters.duration, companion: filters.companion }) }))
      .sort((a, b) => {
        if (filters.sortBy === 'rating') return b.place.rating - a.place.rating;
        if (filters.sortBy === 'price-asc') return a.place.approxCostUsd - b.place.approxCostUsd;
        if (filters.sortBy === 'distance') return (a.place.distanceKm || 0) - (b.place.distanceKm || 0);
        if (filters.sortBy === 'trending') return (b.place.isTrending ? 1 : 0) - (a.place.isTrending ? 1 : 0);
        return b.scoreInfo.score - a.scoreInfo.score;
      });
  }, [places, filters, activeHeroMood]);

  return <DataContext.Provider value={{ places, activeTab, setActiveTab, activeHeroMood, setActiveHeroMood, filters, setFilters, resetFilters, discoveryLoading, discoveryError, locationError: geo.error, userLocation: geo.location, requestLocationAndDiscover, discover, discoverAtLocation, selectedPlace, setSelectedPlace, isDetailOpen, setIsDetailOpen, openPlaceDetail, isReviewModalOpen, setIsReviewModalOpen, isShareModalOpen, setIsShareModalOpen, shareTargetPlace, openShareModal, isAuthModalOpen, setIsAuthModalOpen, authModalMode, setAuthModalMode, plans, activePlan, setActivePlan, createPlan, addPlaceToPlan, removePlaceFromPlan, updatePlanItem, deletePlan, collections, createCollection, addPlaceToCollection, removePlaceFromCollection, deleteCollection, addReview, addPlace, updatePlace, deletePlace, filteredPlaces, toasts, showToast, removeToast }}>{children}</DataContext.Provider>;
};

export const useData = () => { const context = useContext(DataContext); if (!context) throw new Error('useData must be used within DataProvider'); return context; };
