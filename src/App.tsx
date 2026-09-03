import React from "react";
import { MapPin } from "lucide-react";
import { Navbar } from "./components/layout/Navbar";
import { MobileNav } from "./components/layout/MobileNav";
import { Footer } from "./components/layout/Footer";
import { ExploreExperience } from "./components/explore/ExploreExperience";
import { FilterBar } from "./components/discovery/FilterBar";
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
import { VybeCommandCenter } from "./components/vybe/VybeCommandCenter";
import { useData } from "./context/DataContext";

const SelectedPlaceMapAction: React.FC = () => {
  const { activeTab, setActiveTab, selectedPlace, isDetailOpen, setIsDetailOpen } = useData();

  if (!selectedPlace || !isDetailOpen || activeTab === "map") return null;

  const openOnMap = () => {
    setIsDetailOpen(false);
    setActiveTab("map");
  };

  return (
    <button
      type="button"
      onClick={openOnMap}
      aria-label={`Show ${selectedPlace.name} on the map`}
      className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[60] inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-vybe-lime text-black font-display font-extrabold text-sm shadow-neon-lime border-2 border-black/10 hover:scale-105 active:scale-95 transition-all"
    >
      <MapPin className="w-4 h-4" />
      <span>View {selectedPlace.name} on Map</span>
    </button>
  );
};

export const App: React.FC = () => {
  const { activeTab } = useData();

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7FB] dark:bg-[#090A0F] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <CustomCursor />
      <Navbar />
      <ModeBadge />
      <VybeCommandCenter />

      <main className="flex-1">
        {activeTab === "explore" && <ExploreExperience />}

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
      <SelectedPlaceMapAction />
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
