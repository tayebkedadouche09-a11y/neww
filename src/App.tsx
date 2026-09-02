import React, { useRef } from "react";
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
import {
  Sparkles,
  MapPin,
  Flame,
  Gem,
  Moon,
  ArrowRight,
  Compass,
} from "lucide-react";

export const App: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    filteredPlaces,
    places,
    activeHeroMood,
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

  // Top featured place
  const topFeaturedPlace = places.find((p) => p.isFeatured) || places[0];

  // Hidden gems subset
  const hiddenGems = places.filter((p) => p.features.isSecretGem);

  // Free things subset
  const freePlaces = places.filter((p) => p.features.isFree);

  // Late night subset
  const lateNightPlaces = places.filter((p) => p.features.isLateNight);

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7FB] dark:bg-[#090A0F] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Magnetic Custom Trailing Cursor */}
      <CustomCursor />

      {/* Main Top Navigation */}
      <Navbar />

      {/* Local demo mode indicator (Phase 10) */}
      <ModeBadge />

      {/* Main Body View Switching */}
      <main className="flex-1">
        {/* EXPLORE FEED TAB */}
        {activeTab === "explore" && (
          <div className="space-y-12">
            {/* 1. Interactive Hero & 12-Mood Matrix */}
            <HeroMoodSelector onScrollToWizard={scrollToWizard} />

            {/* 2. "I Have..." Discovery Engine Section */}
            <div ref={wizardRef}>
              <IHaveDiscoveryWizard onResultsReady={scrollToResults} />
            </div>

            {/* 3. Filter Bar & Quick Toggles */}
            <div ref={resultsRef}>
              <FilterBar />
            </div>

            {/* 4. Results Grid: Scored Recommendations */}
            <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-vybe-lime uppercase">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ALGORITHMIC RECOMMENDATIONS</span>
                  </div>
                  <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
                    {activeHeroMood
                      ? `Matches for ${activeHeroMood.toUpperCase()} Vibe`
                      : "Top Vibe Matches Near You"}
                  </h2>
                </div>

                <button
                  onClick={() => setActiveTab("map")}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-vybe-lime transition-colors self-start sm:self-auto"
                >
                  <MapPin className="w-3.5 h-3.5 text-vybe-cyan" />
                  <span>View All on Interactive Map</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {filteredPlaces.length === 0 ? (
                <div className="p-16 text-center rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border space-y-3">
                  <span className="text-4xl">🛸</span>
                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                    {userLocation
                      ? discoveryError ?? "No real places found for your current filters."
                      : locationError === "DENIED"
                        ? "Location permission denied — VYBE needs it to find real places."
                        : "Enable location to discover real places near you."}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {userLocation
                      ? discoveryError
                        ? "Google Places request failed — verify this site's origin is allowed in the Google Maps API key HTTP-referrer settings."
                        : "Try broadening your budget, clearing the search, or widening the radius."
                      : "VYBE discovers real spots around you via Google Places — nothing is fetched until we know where you are."}
                  </p>
                  {userLocation && discoveryError && (
                    <button
                      onClick={discover}
                      disabled={discoveryLoading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-300 dark:border-vybe-dark-border text-slate-700 dark:text-slate-200 font-bold text-sm hover:border-vybe-lime hover:text-vybe-lime transition disabled:opacity-60"
                    >
                      <Sparkles className="w-4 h-4" />
                      {discoveryLoading ? "Searching…" : "Try again"}
                    </button>
                  )}
                  {!userLocation && (
                    <button
                      onClick={requestLocationAndDiscover}
                      disabled={discoveryLoading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vybe-lime text-slate-900 font-bold text-sm hover:brightness-110 transition disabled:opacity-60"
                    >
                      <MapPin className="w-4 h-4" />
                      {discoveryLoading ? "Locating…" : "Use my location"}
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPlaces.map(({ place, scoreInfo }) => (
                    <PlaceCard
                      key={place.id}
                      place={place}
                      scoreInfo={scoreInfo}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* 5. Centerpiece Highlight: #1 Trending Spot */}
            {topFeaturedPlace && (
              <section className="px-4 sm:px-6 lg:px-8">
                <FeaturedHeroCard place={topFeaturedPlace} />
              </section>
            )}

            {/* 6. Curated Stream: Secret Hidden Gems */}
            {hiddenGems.length > 0 && (
              <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                      <Gem className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
                        Secret Hidden Gems
                      </h2>
                      <p className="text-xs text-slate-500">
                        Unmarked doors, rooftop green havens & speakeasies
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hiddenGems.slice(0, 3).map((place) => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              </section>
            )}

            {/* 7. Curated Stream: 100% Free Adventures */}
            {freePlaces.length > 0 && (
              <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-vybe-lime/20 text-slate-900 dark:text-vybe-lime">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
                        Free Things To Do ($0)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Zero budget, maximum spontaneous fun
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {freePlaces.slice(0, 3).map((place) => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              </section>
            )}

            {/* 8. Curated Stream: Late Night Outings */}
            {lateNightPlaces.length > 0 && (
              <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
                        Late Night Energy (Open after 1AM)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Subterranean arcades, 24h ramen & techno basements
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {lateNightPlaces.slice(0, 3).map((place) => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              </section>
            )}

            {/* 9. Interactive Map Promo Banner */}
            <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
              <div
                onClick={() => setActiveTab("map")}
                className="relative rounded-3xl p-8 sm:p-12 overflow-hidden cursor-pointer bg-gradient-to-r from-slate-950 via-vybe-dark-card to-black text-white border border-white/10 shadow-2xl hover:border-vybe-lime/60 transition-all group"
              >
                <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-vybe-cyan/20 rounded-full blur-3xl pointer-events-none" />
                <div className="relative max-w-xl space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-vybe-cyan font-mono text-xs font-bold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>INTERACTIVE CITY RADAR</span>
                  </div>
                  <h3 className="font-display font-black text-3xl sm:text-4xl leading-tight">
                    Explore All Vibes on the Interactive Map
                  </h3>
                  <p className="text-sm text-slate-300">
                    Switch to radar mode to see walking distances, custom emoji
                    markers, live open statuses, and geo-clusters.
                  </p>
                  <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-vybe-lime text-black font-display font-extrabold text-xs uppercase tracking-wider shadow-neon-lime group-hover:scale-105 transition-all">
                    <span>Open Map Radar</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* MAP VIEW TAB */}
        {activeTab === "map" && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 animate-fadeIn">
            <FilterBar />
            <VybeMap />
          </div>
        )}

        {/* PLANS TAB */}
        {activeTab === "plan" && <VybePlanBuilder />}

        {/* SAVED TAB (MY VYBES) */}
        {activeTab === "saved" && <CollectionsView />}

        {/* PROFILE TAB */}
        {activeTab === "profile" && <ProfileView />}

        {/* ADMIN TAB */}
        {activeTab === "admin" && <AdminPortal />}
      </main>

      {/* Global Modals */}
      <PlaceDetailModal />
      <ReviewModal />
      <ShareStoryModal />
      <AuthModal />

      {/* Toast Notification Stream */}
      <ToastContainer />

      {/* Mobile Sticky Bottom Navigation */}
      <MobileNav />

      {/* Editorial Footer */}
      <Footer />
    </div>
  );
};
export default App;
