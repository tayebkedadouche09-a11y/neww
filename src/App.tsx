import React, { useMemo, useRef } from "react";
import { Navbar } from "./components/layout/Navbar";
import { MobileNav } from "./components/layout/MobileNav";
import { Footer } from "./components/layout/Footer";
import { HeroMoodSelector } from "./components/discovery/HeroMoodSelector";
import { IHaveDiscoveryWizard } from "./components/discovery/IHaveDiscoveryWizard";
import { FilterBar } from "./components/discovery/FilterBar";
import { PlaceCard } from "./components/cards/PlaceCard";
import { FeaturedHeroCard } from "./components/cards/FeaturedHeroCard";
import { PlaceDetailModal } from "./components/place/PlaceDetailModal";
import { ReviewModal } from "./components/place/ReviewModal";
import { ShareStoryModal } from "./components/share/ShareStoryModal";
import { AuthModal } from "./components/auth/AuthModal";
import { ToastContainer } from "./components/common/ToastContainer";
import { CustomCursor } from "./components/common/CustomCursor";
import { ModeBadge } from "./components/common/ModeBadge";
import { VybeMap } from "./components/map/VybeMap";
import { VybePlanBuilder } from "./components/plan/VybePlanBuilder";
import { CollectionsView } from "./components/profile/CollectionsView";
import { ProfileView } from "./components/profile/ProfileView";
import { AdminPortal } from "./components/admin/AdminPortal";
import { useData } from "./context/DataContext";
import { calculateVybeScore } from "./hooks/useVybeScore";
import {
  Sparkles,
  MapPin,
  Gem,
  Moon,
  ArrowRight,
} from "lucide-react";

export const App: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    filteredPlaces,
    places,
    activeHeroMood,
    filters,
    userLocation,
    locationError,
    discoveryError,
    discoveryLoading,
    discover,
    requestLocationAndDiscover,
  } = useData();

  const resultsRef = useRef<HTMLDivElement>(null);
  const wizardRef = useRef<HTMLDivElement>(null);

  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToWizard = () => {
    wizardRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const topFeaturedPlace = places.find((p) => p.isFeatured) || places[0];
  const hiddenGems = places.filter((p) => p.features.isSecretGem);
  const freePlaces = places.filter((p) => p.features.isFree);
  const lateNightPlaces = places.filter((p) => p.features.isLateNight);
  const activePlaceType = filters.searchQuery.trim();

  // Mood/companion preferences are ranking signals. Explicit discovery targets
  // and toggle filters remain hard filters, while discovered places stay visible
  // whenever the softer VYBE signals do not produce a perfect intersection.
  const relaxedDiscoveryPlaces = useMemo(() => {
    if (filteredPlaces.length > 0 || places.length === 0) return [];

    const effectiveMoods = activeHeroMood
      ? [activeHeroMood, ...filters.moods.filter(m => m !== activeHeroMood)]
      : filters.moods;

    return places
      .map(place => ({
        place,
        scoreInfo: calculateVybeScore(place, {
          selectedMoods: effectiveMoods,
          budget: filters.maxBudget || (filters.priceLevels.length === 1 ? filters.priceLevels[0] : undefined),
          duration: filters.duration,
          companion: filters.companion,
        }),
      }))
      .sort((a, b) => b.scoreInfo.score - a.scoreInfo.score);
  }, [filteredPlaces, places, activeHeroMood, filters]);

  const displayPlaces = filteredPlaces.length > 0 ? filteredPlaces : relaxedDiscoveryPlaces;

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7FB] dark:bg-[#090A0F] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <CustomCursor />
      <Navbar />
      <ModeBadge />

      <main className="flex-1">
        {activeTab === "explore" && (
          <div className="space-y-12">
            {/* Explore controls and discovery target live in one shared state. */}
            <HeroMoodSelector onScrollToWizard={scrollToWizard} />

            <div ref={wizardRef}>
              <IHaveDiscoveryWizard onResultsReady={scrollToResults} />
            </div>

            <div ref={resultsRef}>
              <FilterBar />
            </div>

            <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-vybe-lime uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ALGORITHMIC RECOMMENDATIONS</span>
                  </div>
                  <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
                    {activePlaceType
                      ? `Top ${activePlaceType} Matches Near You`
                      : activeHeroMood
                        ? `Matches for ${activeHeroMood.toUpperCase()} Vibe`
                        : "Top Vibe Matches Near You"}
                  </h2>
                </div>

                <button onClick={() => setActiveTab("map")} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-vybe-lime transition-colors self-start sm:self-auto">
                  <MapPin className="w-3.5 h-3.5 text-vybe-cyan" />
                  <span>View All on Interactive Map</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {displayPlaces.length === 0 ? (
                <div className="p-16 text-center rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border space-y-3">
                  <span className="text-4xl">🛸</span>
                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                    {userLocation
                      ? discoveryError ?? "No real places found for your current discovery setup."
                      : locationError === "DENIED"
                        ? "Location permission denied — VYBE needs it to find real places."
                        : "Enable location to discover real places near you."}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {userLocation
                      ? discoveryError
                        ? "The live place provider rejected the request. Check the provider quota/API configuration, then try again."
                        : "Adjust your discovery target or preferences, or broaden the search distance."
                      : "VYBE discovers real spots around you after location access is enabled."}
                  </p>
                  {userLocation && discoveryError && (
                    <button onClick={discover} disabled={discoveryLoading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-300 dark:border-vybe-dark-border text-slate-700 dark:text-slate-200 font-bold text-sm hover:border-vybe-lime hover:text-vybe-lime transition disabled:opacity-60">
                      <Sparkles className="w-4 h-4" />
                      {discoveryLoading ? "Searching…" : "Try again"}
                    </button>
                  )}
                  {!userLocation && (
                    <button onClick={requestLocationAndDiscover} disabled={discoveryLoading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vybe-lime text-slate-900 font-bold text-sm hover:brightness-110 transition disabled:opacity-60">
                      <MapPin className="w-4 h-4" />
                      {discoveryLoading ? "Locating…" : "Use my location"}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {relaxedDiscoveryPlaces.length > 0 && filteredPlaces.length === 0 && !discoveryError && (
                    <div className="rounded-2xl border border-vybe-cyan/20 bg-vybe-cyan/5 px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-bold text-vybe-cyan">VYBE relaxed the soft match.</span> Showing the discovered places and ranking them by your selected time, budget, company and vibes.
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayPlaces.map(({ place, scoreInfo }) => (
                      <PlaceCard key={place.id} place={place} scoreInfo={scoreInfo} />
                    ))}
                  </div>
                </>
              )}
            </section>

            {topFeaturedPlace && (
              <section className="px-4 sm:px-6 lg:px-8">
                <FeaturedHeroCard place={topFeaturedPlace} />
              </section>
            )}

            {hiddenGems.length > 0 && (
              <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400"><Gem className="w-5 h-5" /></div>
                    <div>
                      <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">Secret Hidden Gems</h2>
                      <p className="text-xs text-slate-500">Unmarked doors, rooftop green havens & speakeasies</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hiddenGems.slice(0, 3).map(place => <PlaceCard key={place.id} place={place} />)}
                </div>
              </section>
            )}

            {freePlaces.length > 0 && (
              <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-vybe-lime/20 text-slate-900 dark:text-vybe-lime"><Sparkles className="w-5 h-5" /></div>
                  <div>
                    <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">Free Things To Do ($0)</h2>
                    <p className="text-xs text-slate-500">Zero budget, maximum spontaneous fun</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {freePlaces.slice(0, 3).map(place => <PlaceCard key={place.id} place={place} />)}
                </div>
              </section>
            )}

            {lateNightPlaces.length > 0 && (
              <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400"><Moon className="w-5 h-5" /></div>
                  <div>
                    <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">Late Night Energy (Open after 1AM)</h2>
                    <p className="text-xs text-slate-500">Subterranean arcades, 24h ramen & techno basements</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {lateNightPlaces.slice(0, 3).map(place => <PlaceCard key={place.id} place={place} />)}
                </div>
              </section>
            )}

            <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
              <div onClick={() => setActiveTab("map")} className="relative rounded-3xl p-8 sm:p-12 overflow-hidden cursor-pointer bg-gradient-to-r from-slate-950 via-vybe-dark-card to-black text-white border border-white/10 shadow-2xl hover:border-vybe-lime/60 transition-all group">
                <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-vybe-cyan/20 rounded-full blur-3xl pointer-events-none" />
                <div className="relative max-w-xl space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-vybe-cyan font-mono text-xs font-bold"><MapPin className="w-3.5 h-3.5" /><span>INTERACTIVE CITY RADAR</span></div>
                  <h3 className="font-display font-black text-3xl sm:text-4xl leading-tight">Explore All Vibes on the Interactive Map</h3>
                  <p className="text-sm text-slate-300">Switch to radar mode to see walking distances, custom emoji markers, live open statuses, and geo-clusters.</p>
                  <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-vybe-lime text-black font-display font-extrabold text-xs uppercase tracking-wider shadow-neon-lime group-hover:scale-105 transition-all"><span>Open Map Radar</span><ArrowRight className="w-4 h-4" /></div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "map" && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 animate-fadeIn">
            <FilterBar />
            <VybeMap />
          </div>
        )}

        {activeTab === "plan" && <VybePlanBuilder />}
        {activeTab === "saved" && <CollectionsView />}
        {activeTab === "profile" && <ProfileView />}
        {activeTab === "admin" && <AdminPortal />}
      </main>

      <PlaceDetailModal />
      <ReviewModal />
      <ShareStoryModal />
      <AuthModal />
      <ToastContainer />
      <MobileNav />
      <Footer />
    </div>
  );
};

export default App;
