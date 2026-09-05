import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Place, MoodType, FilterState, Collection, VybePlan, PlanItem, PlaceReview } from '../types';
import { calculateVybeScore } from '../hooks/useVybeScore';
import { useGeolocation, GeoLocation } from '../hooks/useGeolocation';
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
  discoveryLoading: boolean; discoveryError: string | null; locationError: string | null; userLocation: GeoLocation | null;
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
  const showToast = useCallback((message: string, emoji = '⚡', type: 'success' | 'info' | 'vibe' = 'vibe') => { const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`; setToasts(prev => [...prev, { id, message, emoji, type }]); setTimeout(() => removeToast(id), 4000); }, [removeToast]);

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
    setDiscoveryLoading(true);
    setDiscoveryError(null);
    discoverPlaces({ userLat: location.lat, userLng: location.lng, radiusKm, searchQuery: activeFilters.searchQuery.trim() || undefined, filters: activeFilters })
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

  // NOTE: remainder of file continued in follow-up if truncated — see full restore
  return null;
};

export const useData = () => { const context = useContext(DataContext); if (!context) throw new Error('useData must be used within DataProvider'); return context; };
