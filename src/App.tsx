import React, { useEffect, useRef } from "react";
import { ArrowRight, Lock, MapPin } from "lucide-react";
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
import { VybeMap } from "./components/map/VybeMap";
import { VybePlanBuilder } from "./components/plan/VybePlanBuilder";
import { VybeRouteSummary } from "./components/plan/VybeRouteSummary";
import { CollectionsView } from "./components/profile/CollectionsView";
import { ProfileView } from "./components/profile/ProfileView";
import { AdminPortal } from "./components/admin/AdminPortal";
import { VybeCommandCenter } from "./components/vybe/VybeCommandCenter";
import { VybeDailyDrop } from "./components/vybe/VybeDailyDrop";
import { VybeSquadVote } from "./components/vybe/VybeSquadVote";
import { VybeAiConcierge } from "./components/vybe/VybeAiConcierge";
import { VybeSurpriseMe } from "./components/vybe/VybeSurpriseMe";
import { VybeCheckIn } from "./components/vybe/VybeCheckIn";
import { VybeProgressCard } from "./components/vybe/VybeProgressCard";
import { VybeWeatherPill } from "./components/vybe/VybeWeatherPill";
import { useData } from "./context/DataContext";
import { useAuth } from "./context/AuthContext";

const SelectedPlaceMapAction: React.FC = () => {
  const { activeTab, setActiveTab, selectedPlace, isDetailOpen, setIsDetailOpen } = useData();
  if (!selectedPlace || !isDetailOpen || activeTab === "map") return null;
  const openOnMap = () => { setIsDetailOpen(false); setActiveTab("map"); };
  return (
    <button type="button" onClick={openOnMap} aria-label={`Show ${selectedPlace.name} on the map`} className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-vybe-lime text-black font-display font-extrabold text-sm shadow-neon-lime border-2 border-black/10 hover:scale-105 active:scale-95 transition-all">
      <MapPin className="w-4 h-4" /><span>View {selectedPlace.name} on Map</span>
    </button>
  );
};

const RealAccountRequired: React.FC<{ title: string; body: string }> = ({ title, body }) => {
  const { setIsAuthModalOpen, setAuthModalMode } = useData();
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center animate-fadeIn">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-black text-vybe-lime flex items-center justify-center shadow-neon-lime"><Lock className="w-7 h-7" /></div>
      <h1 className="mt-6 font-display font-black text-3xl text-slate-900 dark:text-white">{title}</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{body}</p>
      <button type="button" onClick={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-vybe-lime text-black font-display font-black text-sm shadow-neon-lime hover:scale-105 transition-all">
        Sign in to continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export const App: React.FC = () => {
  const { activeTab, isDetailOpen, setIsDetailOpen } = useData();
  const { currentUser, loading: authLoading } = useAuth();
  const privateReady = !!currentUser && !authLoading;
  const previousTabRef = useRef(activeTab);

  useEffect(() => {
    if (previousTabRef.current !== activeTab && activeTab !== 'explore' && isDetailOpen) {
      setIsDetailOpen(false);
    }
    previousTabRef.current = activeTab;
  }, [activeTab, isDetailOpen, setIsDetailOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7FB] dark:bg-[#090A0F] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <CustomCursor />
      <Navbar />
      <VybeWeatherPill />
      <VybeCommandCenter />
      <VybeAiConcierge />
      <VybeSurpriseMe />
      <main className="flex-1">
        {activeTab === "explore" && <><ExploreExperience /><VybeDailyDrop /><VybeSquadVote /></>}
        {activeTab === "map" && <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 animate-fadeIn"><FilterBar /><VybeMap /></div>}
        {activeTab === "plan" && (privateReady ? <><VybePlanBuilder /><VybeRouteSummary /></> : <RealAccountRequired title="Your plans are private" body="Sign in to create, save, edit and share real VYBE itineraries." />)}
        {activeTab === "saved" && (privateReady ? <CollectionsView /> : <RealAccountRequired title="Your saved VYBES are private" body="Sign in to access your real saved collections and places." />)}
        {activeTab === "profile" && (privateReady ? <><ProfileView /><VybeProgressCard /></> : <RealAccountRequired title="Your VYBE profile" body="Sign in to manage your real profile, likes, saves and plans." />)}
        {activeTab === "admin" && (privateReady && currentUser.isAdmin ? <AdminPortal /> : <RealAccountRequired title="Admin access required" body="This area is restricted to authenticated VYBE administrators." />)}
      </main>
      <PlaceDetailModal />
      <VybeCheckIn />
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
