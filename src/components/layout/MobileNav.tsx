import React from 'react';
import { Compass, MapPin, Calendar, Bookmark, User, PlusCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, setIsAuthModalOpen, setAuthModalMode } = useData();
  const { currentUser } = useAuth();

  const handleTab = (tab: 'explore' | 'map' | 'plan' | 'saved' | 'profile') => {
    if (tab === 'profile' && !currentUser) {
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div data-testid="mobile-nav" className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#090A0F]/95 backdrop-blur-2xl border-t border-slate-200 dark:border-white/10 px-2 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto">
        <button
          onClick={() => handleTab('explore')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'explore'
              ? 'text-black dark:text-vybe-lime scale-105 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px]">Explore</span>
        </button>

        <button
          onClick={() => handleTab('map')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'map'
              ? 'text-black dark:text-vybe-lime scale-105 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span className="text-[10px]">Map</span>
        </button>

        <button
          onClick={() => handleTab('plan')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'plan'
              ? 'text-black dark:text-vybe-lime scale-105 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px]">Plans</span>
        </button>

        <button
          onClick={() => handleTab('saved')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'saved'
              ? 'text-black dark:text-vybe-lime scale-105 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Bookmark className="w-5 h-5" />
          <span className="text-[10px]">Saved</span>
        </button>

        <button
          onClick={() => handleTab('profile')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
            activeTab === 'profile'
              ? 'text-black dark:text-vybe-lime scale-105 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Profile</span>
        </button>
      </div>
    </div>
  );
};

