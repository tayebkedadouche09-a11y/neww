import React, { useState } from 'react';
import { 
  Compass, 
  MapPin, 
  Calendar, 
  Bookmark, 
  Flame, 
  Search, 
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  Plus,
  Share2,
  X
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../common/ThemeToggle';

export const Navbar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    filters, 
    setFilters, 
    openShareModal, 
    setIsAuthModalOpen,
    setAuthModalMode,
    discover
  } = useData();
  const { currentUser, isDemoMode } = useAuth();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/5 dark:border-white/10 bg-white/80 dark:bg-[#090A0F]/85 backdrop-blur-xl transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveTab('explore')} 
            className="flex items-center gap-2 group text-left focus:outline-none"
            data-cursor="VYBE"
          >
            <div className="w-10 h-10 rounded-2xl bg-black dark:bg-white text-vybe-lime dark:text-black flex items-center justify-center font-black text-xl shadow-neon-lime transition-transform group-hover:scale-105 group-hover:rotate-6">
              V
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
                  VYBE
                </span>
                <span className="w-2 h-2 rounded-full bg-vybe-lime animate-pulse"></span>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-vybe-lime">
                FIND YOUR NEXT VIBE
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5 ml-4">
            <button
              onClick={() => setActiveTab('explore')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'explore'
                  ? 'bg-black text-white dark:bg-vybe-lime dark:text-black shadow-neon-lime'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-vybe-dark-surface'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Explore</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'map'
                  ? 'bg-black text-white dark:bg-vybe-lime dark:text-black shadow-neon-lime'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-vybe-dark-surface'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Map View</span>
            </button>

            <button
              onClick={() => setActiveTab('plan')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'plan'
                  ? 'bg-black text-white dark:bg-vybe-lime dark:text-black shadow-neon-lime'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-vybe-dark-surface'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Outing Plans</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'saved'
                  ? 'bg-black text-white dark:bg-vybe-lime dark:text-black shadow-neon-lime'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-vybe-dark-surface'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>My VYBES</span>
            </button>

            {currentUser?.isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-vybe-pink text-white shadow-neon-pink'
                    : 'text-vybe-pink/80 hover:bg-vybe-pink/10'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin</span>
              </button>
            )}
          </nav>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          
          {/* Quick Search Input */}
          <div className="relative hidden md:block">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search rooftops, ramen, arcades..."
                value={filters.searchQuery}
                onChange={e => {
                  setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
                  if (activeTab !== 'explore' && activeTab !== 'map') {
                    setActiveTab('explore');
                  }
                }}
                onBlur={() => discover()}
                className="w-56 lg:w-72 pl-10 pr-8 py-2 rounded-full text-xs bg-slate-100 dark:bg-vybe-dark-surface border border-slate-200 dark:border-slate-200 dark:border-vybe-dark-border text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-vybe-lime focus:ring-1 focus:ring-vybe-lime transition-all"
              />
              {filters.searchQuery && (
                <button
                  onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                  className="absolute right-3 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Share Story Card Button */}
          <button
            onClick={() => openShareModal()}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-vybe-citrus/15 text-vybe-citrus hover:bg-vybe-citrus hover:text-white border border-vybe-citrus/30 transition-all"
            title="Generate Shareable Story Card"
            data-cursor="SHARE"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Vibe</span>
          </button>

          {/* Vibe Streak Pill (player context) */}
          {currentUser && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 dark:text-orange-400 text-xs font-mono font-bold"
              title={`${currentUser.vibeStreakDays} Day Discovery Streak`}
            >
              <Flame className="w-4 h-4 fill-orange-500 animate-pulse text-orange-500" />
              <span>{currentUser.vibeStreakDays}d Streak</span>
            </div>
          )}

          {/* Demo mode badge */}
          {isDemoMode && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-vybe-lime/10 border border-vybe-lime/40 text-vybe-lime text-xs font-mono font-bold"
              title="You are exploring in Guest/Demo mode — sign in to keep your data across devices"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>DEMO</span>
            </div>
          )}

          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Unauthenticated: Sign In + Create Account entry points */}
          {!currentUser ? (
            <>
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-slate-100 dark:bg-vybe-dark-surface text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-vybe-dark-border hover:border-vybe-lime transition-all"
                data-testid="navbar-signin"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setAuthModalMode('register');
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-vybe-lime text-black border border-vybe-lime shadow-neon-lime hover:scale-105 transition-all"
                data-testid="navbar-signup"
              >
                Create Account
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setActiveTab('profile');
              }}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-slate-100 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border hover:border-vybe-lime transition-all group"
              data-cursor="PROFILE"
              data-testid="navbar-avatar"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-vybe-lime"
              />
              <span className="hidden xl:inline text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-vybe-lime transition-colors">
                @{currentUser.username}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

