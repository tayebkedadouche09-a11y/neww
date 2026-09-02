import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Place, 
  MoodType, 
  CategoryType, 
  FilterState, 
  Collection, 
  VybePlan, 
  PlanItem,
  PlaceReview,
  PriceLevel,
  TimeDuration,
  CompanionType
} from '../types';
import { calculateVybeScore } from '../hooks/useVybeScore';
import { useGeolocation, GeoLocation } from '../hooks/useGeolocation';
import { useAuth } from './AuthContext';
import { dataMode, LOCAL_STORAGE_KEYS } from '../lib/dataMode';
import { isGoogleMapsConfigured } from '../lib/env';
import { newUuid } from '../services/mappers';
import { placesService } from '../services/placesService';
import { collectionsService } from '../services/collectionsService';
import { plansService } from '../services/plansService';
import { reviewsService } from '../services/reviewsService';
import { discoverPlaces } from '../services/discoveryService';

export type ActiveTab = 'explore' | 'map' | 'plan' | 'saved' | 'profile' | 'admin';

export interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'vibe';
  message: string;
  emoji?: string;
}

interface DataContextType {
  places: Place[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeHeroMood: MoodType | null;
  setActiveHeroMood: (mood: MoodType | null) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  
  // Discovery
  discoveryLoading: boolean;
  discoveryError: string | null;
  locationError: string | null;
  userLocation: GeoLocation | null;
  requestLocationAndDiscover: () => void;
  discover: () => void;

  // Modals
  selectedPlace: Place | null;
  setSelectedPlace: (place: Place | null) => void;
  isDetailOpen: boolean;
  setIsDetailOpen: (open: boolean) => void;
  openPlaceDetail: (place: Place) => void;
  
  isReviewModalOpen: boolean;
  setIsReviewModalOpen: (open: boolean) => void;
  isShareModalOpen: boolean;
  setIsShareModalOpen: (open: boolean) => void;
  shareTargetPlace: Place | null;
  openShareModal: (place?: Place) => void;
  
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'register' | 'profile' | 'forgot';
  setAuthModalMode: (mode: 'login' | 'register' | 'profile' | 'forgot') => void;
  
  // Plans
  plans: VybePlan[];
  activePlan: VybePlan | null;
  setActivePlan: (plan: VybePlan | null) => void;
  createPlan: (title: string, mood: MoodType, targetBudgetUsd?: number) => VybePlan;
  addPlaceToPlan: (planId: string, placeId: string, customTime?: string) => void;
  removePlaceFromPlan: (planId: string, planItemId: string) => void;
  updatePlanItem: (planId: string, planItemId: string, updates: { startTime?: string; customNote?: string; durationMinutes?: number }) => void;
  deletePlan: (planId: string) => void;

  // Collections
  collections: Collection[];
  createCollection: (name: string, emoji: string, color: string, description?: string) => Collection;
  addPlaceToCollection: (collectionId: string, placeId: string) => void;
  removePlaceFromCollection: (collectionId: string, placeId: string) => void;
  deleteCollection: (collectionId: string) => void;

  // Reviews & Likes
  addReview: (placeId: string, review: Omit<PlaceReview, 'id' | 'createdAt' | 'likesCount'>) => void;
  
  // Admin & Place Management
  addPlace: (place: Omit<Place, 'id' | 'rating' | 'reviewCount' | 'baseVybeScore' | 'reviews'>) => Place;
  updatePlace: (placeId: string, updates: Partial<Place>) => void;
  deletePlace: (placeId: string) => void;

  // Filtered & Scored Places
  filteredPlaces: Array<{ place: Place; scoreInfo: ReturnType<typeof calculateVybeScore> }>;

  // Toasts
  toasts: ToastNotification[];
  showToast: (message: string, emoji?: string, type?: 'success' | 'info' | 'vibe') => void;
  removeToast: (id: string) => void;
}

const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  moods: [],
  categories: [],
  priceLevels: [],
  maxBudget: undefined,
  maxDistanceKm: undefined,
  duration: undefined,
  companion: undefined,
  onlyOpenNow: false,
  onlyFree: false,
  onlyHiddenGems: false,
  onlyLateNight: false,
  sortBy: 'vybe-score'
};

const INITIAL_COLLECTIONS: Collection[] = [
  {
    id: 'col-1',
    userId: 'u-1',
    name: 'Weekend Hype & Sunsets',
    description: 'Golden hour rooftops, neon arcades & late night street tacos',
    emoji: '🌆',
    color: '#CCFF00',
    isPublic: true,
    placeIds: ['place-1', 'place-2', 'place-15'],
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 'col-2',
    userId: 'u-1',
    name: 'Lo-Fi Chill & Matcha Nooks',
    description: 'Best spots to read, draw or listen to ambient vinyl',
    emoji: '🍵',
    color: '#00F0FF',
    isPublic: true,
    placeIds: ['place-3', 'place-12', 'place-16'],
    createdAt: '2025-01-12T14:00:00Z',
    updatedAt: '2025-01-18T16:00:00Z'
  },
  {
    id: 'col-3',
    userId: 'u-1',
    name: 'Date Night Magic',
    description: 'Aesthetic speakeasies, pottery workshops & LED glowing kayaks',
    emoji: '✨',
    color: '#FF007F',
    isPublic: false,
    placeIds: ['place-4', 'place-5', 'place-11', 'place-18'],
    createdAt: '2025-01-14T19:00:00Z',
    updatedAt: '2025-01-20T21:00:00Z'
  }
];

const INITIAL_PLANS: VybePlan[] = [
  {
    id: 'plan-1',
    userId: 'u-1',
    title: 'Epic Friday Night Outing',
    date: 'Tonight',
    mood: 'party',
    targetBudgetUsd: 65,
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    isPublic: true,
    createdAt: '2025-01-20T18:00:00Z',
    items: [
      {
        id: 'item-1',
        placeId: 'place-15',
        startTime: '19:00',
        durationMinutes: 60,
        customNote: 'Fuel up on al pastor tacos & fresh agua fresca 🌮',
        order: 1
      },
      {
        id: 'item-2',
        placeId: 'place-2',
        startTime: '20:30',
        durationMinutes: 90,
        customNote: 'DDR battle and Mario Kart tournament with the squad 🕹️',
        order: 2
      },
      {
        id: 'item-3',
        placeId: 'place-1',
        startTime: '22:30',
        durationMinutes: 120,
        customNote: 'Rooftop cocktail lounge under city lights 🌃',
        order: 3
      }
    ]
  }
];

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, sessionMode } = useAuth();
  const geo = useGeolocation();
  // Places state
  const [places, setPlaces] = useState<Place[]>([]);

  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  // Navigation & Mood
  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');
  const [activeHeroMood, setActiveHeroMood] = useState<MoodType | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Modals
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTargetPlace, setShareTargetPlace] = useState<Place | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'profile' | 'forgot'>('login');

  // Collections & Plans
  const [collections, setCollections] = useState<Collection[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.collections);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse collections', e);
      }
    }
    return INITIAL_COLLECTIONS;
  });

  const [plans, setPlans] = useState<VybePlan[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.plans);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse plans', e);
      }
    }
    return INITIAL_PLANS;
  });

  const [activePlan, setActivePlan] = useState<VybePlan | null>(plans[0] || null);

  // Toasts
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Sync to local storage — LOCAL DEMO MODE ONLY. In 'supabase' mode the
  // database is the source of truth and localStorage is not written.
  useEffect(() => {
    if (dataMode === 'local') localStorage.setItem(LOCAL_STORAGE_KEYS.places, JSON.stringify(places));
  }, [places]);

  useEffect(() => {
    if (dataMode === 'local') localStorage.setItem(LOCAL_STORAGE_KEYS.collections, JSON.stringify(collections));
  }, [collections]);

  useEffect(() => {
    if (dataMode === 'local') localStorage.setItem(LOCAL_STORAGE_KEYS.plans, JSON.stringify(plans));
  }, [plans]);

  // Stable identities: these are effect dependencies below. Recreating them
  // every render would re-run effects on every render (an effect depending on
  // showToast would refetch data in an endless loop).
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, emoji = '⚡', type: 'success' | 'info' | 'vibe' = 'vibe') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts(prev => [...prev, { id, message, emoji, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  // ---------------------------------------------------------------------------
  // Discovery is driven by the user's real location and Google Places.
  // ---------------------------------------------------------------------------
  const discover = useCallback(() => {
    if (!isGoogleMapsConfigured) {
      setDiscoveryError('Google Places is not configured. Add a valid Google Maps JavaScript API key.');
      setPlaces([]);
      return;
    }
    setDiscoveryLoading(true);
    setDiscoveryError(null);
    const userLat = geo.location?.lat;
    const userLng = geo.location?.lng;
    if (userLat === undefined || userLng === undefined) {
      console.log('[discovery] No browser location available — discovery cannot run.');
    } else {
      console.log(`[discovery] location=(${userLat.toFixed(5)}, ${userLng.toFixed(5)})`);
    }

    discoverPlaces({
      userLat,
      userLng,
      radiusKm: 5,
      searchQuery: filters.searchQuery.trim() || undefined,
      filters: filters,
    })
      .then(result => {
        console.log(`[discovery] DataContext places.length: ${result.length}`);
        setPlaces(result);
      })
      .catch(err => {
        console.error('[DataContext] Discovery failed:', err);
        setPlaces([]);
        const message = err instanceof Error ? err.message : 'Unable to load places right now.';
        setDiscoveryError(message);
        showToast(message, '⚠️', 'info');
      })
      .finally(() => setDiscoveryLoading(false));
  }, [geo.location, filters, showToast]);

  const requestLocationAndDiscover = useCallback(() => {
    geo.requestLocation();
  }, [geo.requestLocation]);

  useEffect(() => {
    if (isGoogleMapsConfigured && !geo.location && !geo.loading && !geo.error) {
      geo.requestLocation();
    }
  }, [geo.location, geo.loading, geo.error, geo.requestLocation]);

  // Trigger discovery when geo location resolves
  useEffect(() => {
    if (geo.location && isGoogleMapsConfigured) {
      discover();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.location]);

  // Real-time search: run discovery (Google Places) as the user types,
  // debounced, so real results appear instead of filtering stale demo data.
  const searchQuery = filters.searchQuery;
  const shouldSearchLive = isGoogleMapsConfigured;
  useEffect(() => {
    if (!shouldSearchLive || searchQuery.trim() === '') return;
    const timer = setTimeout(() => {
      discover();
    }, 450);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // ---------------------------------------------------------------------------
  // PLACE LOADING: in production the Explore/Map feed is driven ONLY by
  // discoverPlaces() (Google Places first, verified Supabase catalog as a
  // supplement). The raw places catalog is deliberately NOT dumped into state:
  // that path used to surface seeded demo rows and re-fetch on every render,
  // clobbering live discovery results. Local demo mode keeps INITIAL_PLACES.
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // USER-SPECIFIC DATA: when a real user is authenticated, load their
  // collections and plans. Places are loaded by discovery (see above).
  // ---------------------------------------------------------------------------
  const realUserId = dataMode === 'supabase' && sessionMode === 'auth' ? currentUser?.id ?? null : null;

  useEffect(() => {
    if (!realUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const [remoteCollections, remotePlans] = await Promise.all([
          collectionsService.list(realUserId),
          plansService.list(realUserId)
        ]);
        if (cancelled) return;
        setCollections(remoteCollections);
        setPlans(remotePlans);
        setActivePlan(prev => remotePlans.find(p => p.id === prev?.id) ?? remotePlans[0] ?? null);
      } catch (e) {
        console.error('[DataContext] User data hydration failed', e);
        showToast('Could not load your data from the server', '⚠️', 'info');
      }
    })();
    return () => { cancelled = true; };
  }, [realUserId]);


  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setActiveHeroMood(null);
  };

  const openPlaceDetail = (place: Place) => {
    setSelectedPlace(place);
    setIsDetailOpen(true);
  };

  const openShareModal = (place?: Place) => {
    setShareTargetPlace(place || selectedPlace || (places.length > 0 ? places[0] : null));
    setIsShareModalOpen(true);
  };

  // Plan Management
  const createPlan = (title: string, mood: MoodType, targetBudgetUsd = 50) => {
    const newPlan: VybePlan = {
      id: dataMode === 'supabase' ? newUuid() : `plan-${Date.now()}`,
      userId: currentUser?.id || 'u-1',
      title,
      date: 'Upcoming Outing',
      mood,
      targetBudgetUsd,
      isPublic: true,
      createdAt: new Date().toISOString(),
      items: []
    };
    setPlans(prev => [newPlan, ...prev]);
    setActivePlan(newPlan);
    if (realUserId) void plansService.create(newPlan).catch(e => console.error('Plan create sync failed', e));
    showToast(`Created new VYBE Plan: "${title}"`, '📋', 'success');
    return newPlan;
  };

  const addPlaceToPlan = (planId: string, placeId: string, customTime = '20:00') => {
    const plan = plans.find(p => p.id === planId);
    const place = places.find(p => p.id === placeId);
    if (!plan || !place) return;

    // Check if already in plan
    if (plan.items.some(item => item.placeId === placeId)) {
      showToast(`${place.name} is already in this plan!`, 'ℹ️', 'info');
      return;
    }

    const newItem: PlanItem = {
      id: dataMode === 'supabase' ? newUuid() : `item-${Date.now()}`,
      placeId,
      startTime: customTime,
      durationMinutes: 90,
      customNote: `Experience ${place.name} (${place.tagline})`,
      order: plan.items.length + 1
    };

    const updatedPlans = plans.map(p => {
      if (p.id === planId) {
        return {
          ...p,
          items: [...p.items, newItem]
        };
      }
      return p;
    });

    setPlans(updatedPlans);
    if (activePlan?.id === planId) {
      setActivePlan(updatedPlans.find(p => p.id === planId) || null);
    }
    if (realUserId) void plansService.addItem(planId, newItem).catch(e => console.error('Plan item sync failed', e));
    showToast(`Added "${place.name}" to VYBE Plan!`, '🚀', 'success');
  };

  const removePlaceFromPlan = (planId: string, planItemId: string) => {
    const updatedPlans = plans.map(p => {
      if (p.id === planId) {
        return {
          ...p,
          items: p.items.filter(item => item.id !== planItemId)
        };
      }
      return p;
    });
    setPlans(updatedPlans);
    if (activePlan?.id === planId) {
      setActivePlan(updatedPlans.find(p => p.id === planId) || null);
    }
    if (realUserId) void plansService.removeItem(planItemId).catch(e => console.error('Plan item remove sync failed', e));
    showToast('Removed item from plan', '🗑️', 'info');
  };

  const updatePlanItem = (
    planId: string, 
    planItemId: string, 
    updates: { startTime?: string; customNote?: string; durationMinutes?: number }
  ) => {
    const updatedPlans = plans.map(p => {
      if (p.id === planId) {
        return {
          ...p,
          items: p.items.map(item => item.id === planItemId ? { ...item, ...updates } : item)
        };
      }
      return p;
    });
    setPlans(updatedPlans);
    if (activePlan?.id === planId) {
      setActivePlan(updatedPlans.find(p => p.id === planId) || null);
    }
    if (realUserId) void plansService.updateItem(planItemId, updates).catch(e => console.error('Plan item update sync failed', e));
  };

  const deletePlan = (planId: string) => {
    setPlans(prev => prev.filter(p => p.id !== planId));
    if (activePlan?.id === planId) {
      setActivePlan(plans.find(p => p.id !== planId) || null);
    }
    if (realUserId) void plansService.remove(planId).catch(e => console.error('Plan delete sync failed', e));
    showToast('Plan deleted', '🗑️', 'info');
  };

  // Collection Management
  const createCollection = (name: string, emoji: string, color: string, description = '') => {
    const nowIso = new Date().toISOString();
    const newCol: Collection = {
      id: dataMode === 'supabase' ? newUuid() : `col-${Date.now()}`,
      userId: currentUser?.id || 'u-1',
      name,
      description,
      emoji,
      color,
      isPublic: true,
      placeIds: [],
      createdAt: nowIso,
      updatedAt: nowIso
    };
    setCollections(prev => [newCol, ...prev]);
    if (realUserId) void collectionsService.create(newCol).catch(e => console.error('Collection create sync failed', e));
    showToast(`Created collection: ${emoji} ${name}`, '✨', 'success');
    return newCol;
  };

  const addPlaceToCollection = (collectionId: string, placeId: string) => {
    const col = collections.find(c => c.id === collectionId);
    const place = places.find(p => p.id === placeId);
    if (!col || !place) return;

    if (col.placeIds.includes(placeId)) {
      showToast(`Already saved in "${col.name}"`, 'ℹ️', 'info');
      return;
    }

    setCollections(prev =>
      prev.map(c => (c.id === collectionId ? { ...c, placeIds: [...c.placeIds, placeId], updatedAt: new Date().toISOString() } : c))
    );
    if (realUserId) void collectionsService.addPlace(collectionId, placeId).catch(e => console.error('Collection item sync failed', e));
    showToast(`Saved to "${col.name}"!`, col.emoji || '💖', 'success');
  };

  const removePlaceFromCollection = (collectionId: string, placeId: string) => {
    setCollections(prev =>
      prev.map(c => (c.id === collectionId ? { ...c, placeIds: c.placeIds.filter(id => id !== placeId) } : c))
    );
    if (realUserId) void collectionsService.removePlace(collectionId, placeId).catch(e => console.error('Collection item remove sync failed', e));
    showToast('Removed from collection', '🗑️', 'info');
  };

  const deleteCollection = (collectionId: string) => {
    setCollections(prev => prev.filter(c => c.id !== collectionId));
    if (realUserId) void collectionsService.remove(collectionId).catch(e => console.error('Collection delete sync failed', e));
    showToast('Collection deleted', '🗑️', 'info');
  };

  // Review Management
  const addReview = (placeId: string, reviewData: Omit<PlaceReview, 'id' | 'createdAt' | 'likesCount'>) => {
    const target = places.find(p => p.id === placeId);
    if (!target) return;

    const newReview: PlaceReview = {
      ...reviewData,
      id: dataMode === 'supabase' ? newUuid() : `rev-${Date.now()}`,
      createdAt: 'Just now',
      likesCount: 0
    };

    const newAvgRating = Number(
      (
        (target.rating * target.reviewCount + reviewData.rating) /
        (target.reviewCount + 1)
      ).toFixed(1)
    );

    const updatedPlace: Place = {
      ...target,
      reviews: [newReview, ...target.reviews],
      rating: newAvgRating,
      reviewCount: target.reviewCount + 1
    };

    setPlaces(prev => prev.map(p => (p.id === placeId ? updatedPlace : p)));

    // Keep the open detail modal in sync with the new review
    setSelectedPlace(cur => (cur && cur.id === placeId ? updatedPlace : cur));

    if (realUserId) {
      void reviewsService.create({
        placeId,
        userId: reviewData.userId,
        rating: reviewData.rating,
        vibeRating: reviewData.vibeRating,
        moodTags: reviewData.moodTags,
        comment: reviewData.comment,
        id: newReview.id
      }).catch(e => console.error('Review sync failed', e));
    }

    showToast('Your vibe review was published!', '🌟', 'success');
  };

  // Admin & Place Management
  const addPlace = (placeData: Omit<Place, 'id' | 'rating' | 'reviewCount' | 'baseVybeScore' | 'reviews'>) => {
    const newPlace: Place = {
      ...placeData,
      id: dataMode === 'supabase' ? newUuid() : `place-${Date.now()}`,
      rating: 4.8,
      reviewCount: 1,
      baseVybeScore: 92,
      reviews: []
    };
    setPlaces(prev => [newPlace, ...prev]);
    if (realUserId) void placesService.create(newPlace).catch(e => console.error('Place create sync failed', e));
    showToast(`Added new place: "${newPlace.name}"`, '🎉', 'success');
    return newPlace;
  };

  const updatePlace = (placeId: string, updates: Partial<Place>) => {
    setPlaces(prev =>
      prev.map(p => (p.id === placeId ? { ...p, ...updates } : p))
    );
    if (selectedPlace?.id === placeId) {
      setSelectedPlace(prev => (prev ? { ...prev, ...updates } : null));
    }
    if (realUserId) void placesService.update(placeId, updates).catch(e => console.error('Place update sync failed', e));
    showToast('Place updated successfully!', '✏️', 'success');
  };

  const deletePlace = (placeId: string) => {
    setPlaces(prev => prev.filter(p => p.id !== placeId));
    if (selectedPlace?.id === placeId) {
      setSelectedPlace(null);
      setIsDetailOpen(false);
    }
    if (realUserId) void placesService.remove(placeId).catch(e => console.error('Place delete sync failed', e));
    showToast('Place removed from platform', '🗑️', 'info');
  };

  // Filter and Score Calculation
  // Live discovery (Google Places / Supabase) already applied the search query
  // server/API-side with real relevance ranking — re-applying a raw substring
  // match here would drop relevant results (e.g. "Starbucks" for "coffee").
  // Local demo data has no discovery engine, so the substring filter applies.
  const liveDiscoveryActive = isGoogleMapsConfigured;
  const filteredPlaces = useMemo(() => {
    const effectiveMoods = activeHeroMood
      ? [activeHeroMood, ...filters.moods.filter(m => m !== activeHeroMood)]
      : filters.moods;

    const result = places
      .filter(place => {
        // Search Query
        if (!liveDiscoveryActive && filters.searchQuery.trim()) {
          const query = filters.searchQuery.toLowerCase();
          const matchName = place.name.toLowerCase().includes(query);
          const matchTagline = place.tagline.toLowerCase().includes(query);
          const matchDesc = place.description.toLowerCase().includes(query);
          const matchNeighbourhood = place.location.neighborhood.toLowerCase().includes(query);
          const matchTags = place.tags.some(t => t.toLowerCase().includes(query));
          if (!matchName && !matchTagline && !matchDesc && !matchNeighbourhood && !matchTags) {
            return false;
          }
        }

        // Moods filter
        if (effectiveMoods.length > 0) {
          const hasMood = effectiveMoods.includes(place.primaryMood) || 
            place.secondaryMoods.some(m => effectiveMoods.includes(m));
          if (!hasMood) return false;
        }

        // Categories filter
        if (filters.categories.length > 0) {
          if (!filters.categories.includes(place.category)) return false;
        }

        // Price filter
        if (filters.priceLevels.length > 0) {
          if (!filters.priceLevels.includes(place.priceLevel)) return false;
        }

        // Max Budget
        if (filters.maxBudget !== undefined && !place.features.isFree) {
          if (place.approxCostUsd > filters.maxBudget) return false;
        }

        // Companion
        if (filters.companion) {
          if (!place.suitableFor.includes(filters.companion)) return false;
        }

        // Toggles
        if (filters.onlyOpenNow && !place.openingHours.isOpenNow) return false;
        if (filters.onlyFree && !place.features.isFree) return false;
        if (filters.onlyHiddenGems && !place.features.isSecretGem) return false;
        if (filters.onlyLateNight && !place.features.isLateNight) return false;

        return true;
      })
      .map(place => {
        const scoreInfo = calculateVybeScore(place, {
          selectedMoods: effectiveMoods,
          budget: filters.maxBudget || (filters.priceLevels.length === 1 ? filters.priceLevels[0] : undefined),
          duration: filters.duration,
          companion: filters.companion
        });
        return { place, scoreInfo };
      })
      .sort((a, b) => {
        if (filters.sortBy === 'vybe-score') {
          return b.scoreInfo.score - a.scoreInfo.score;
        }
        if (filters.sortBy === 'rating') {
          return b.place.rating - a.place.rating;
        }
        if (filters.sortBy === 'price-asc') {
          return a.place.approxCostUsd - b.place.approxCostUsd;
        }
        if (filters.sortBy === 'distance') {
          return (a.place.distanceKm || 0) - (b.place.distanceKm || 0);
        }
        if (filters.sortBy === 'trending') {
          return (b.place.isTrending ? 1 : 0) - (a.place.isTrending ? 1 : 0);
        }
        return b.scoreInfo.score - a.scoreInfo.score;
      });
    // SAFE DIAGNOSTIC: count surviving client-side filters + VYBE ranking.
    // VYBE only re-ranks here — it never removes places for missing optional
    // Google fields (no score threshold cutoff is applied).
    console.log(`[discovery] filteredResultsCount: ${result.length}`);
    return result;
  }, [places, filters, activeHeroMood, liveDiscoveryActive]);

  return (
    <DataContext.Provider
      value={{
        places,
        activeTab,
        setActiveTab,
        activeHeroMood,
        setActiveHeroMood,
         filters,
         setFilters,
         resetFilters,
         discoveryLoading,
        discoveryError,
        locationError: geo.error,
         userLocation: geo.location,
         requestLocationAndDiscover,
         discover,
        selectedPlace,
        setSelectedPlace,
        isDetailOpen,
        setIsDetailOpen,
        openPlaceDetail,
        isReviewModalOpen,
        setIsReviewModalOpen,
        isShareModalOpen,
        setIsShareModalOpen,
        shareTargetPlace,
        openShareModal,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        plans,
        activePlan,
        setActivePlan,
        createPlan,
        addPlaceToPlan,
        removePlaceFromPlan,
        updatePlanItem,
        deletePlan,
        collections,
        createCollection,
        addPlaceToCollection,
        removePlaceFromCollection,
        deleteCollection,
        addReview,
        addPlace,
        updatePlace,
        deletePlace,
        filteredPlaces,
        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
