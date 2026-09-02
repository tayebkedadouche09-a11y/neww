import React from 'react';
import { Sparkles, MapPin, ArrowRight, Heart, Bookmark, Star, Flame } from 'lucide-react';
import { Place } from '../../types';
import { VybeScoreBadge } from '../common/VybeScoreBadge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useRequireAuth } from '../../hooks/useRequireAuth';

export const FeaturedHeroCard: React.FC<{ place: Place }> = ({ place }) => {
  const { toggleLikePlace, toggleSavePlace, isPlaceLiked, isPlaceSaved } = useAuth();
  const { openPlaceDetail } = useData();
  const requireAuth = useRequireAuth();

  const isLiked = isPlaceLiked(place.id);
  const isSaved = isPlaceSaved(place.id);

  return (
    <div
      onClick={() => openPlaceDetail(place)}
      className="relative rounded-3xl overflow-hidden cursor-pointer group bg-black border border-white/15 shadow-2xl transition-all hover:border-vybe-lime/80 max-w-7xl mx-auto my-8"
      data-cursor="TOP PICK"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
        
        {/* Visual Media Column */}
        <div className="lg:col-span-7 relative h-72 lg:h-auto overflow-hidden">
          <img
            src={place.images[0]}
            alt={place.name}
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
          
          {/* Floating Vibe Badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-vybe-lime border border-vybe-lime/40 text-xs font-mono font-bold">
              <Flame className="w-3.5 h-3.5 fill-vybe-lime text-vybe-lime animate-pulse" />
              <span>#1 TRENDING VYBE OF THE DAY</span>
            </div>
          </div>
        </div>

        {/* Editorial Text Column */}
        <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between space-y-6 text-white bg-gradient-to-br from-black via-vybe-dark-card to-black">
          <div className="space-y-4">
            
            <div className="flex items-center justify-between gap-3">
              <VybeScoreBadge score={place.baseVybeScore} size="lg" showLabel />
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); if (!requireAuth()) return; toggleLikePlace(place.id); }}
                  className={`p-2.5 rounded-full transition-all ${
                    isLiked ? 'bg-rose-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (!requireAuth()) return; toggleSavePlace(place.id); }}
                  className={`p-2.5 rounded-full transition-all ${
                    isSaved ? 'bg-vybe-lime text-black' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-black' : ''}`} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-vybe-cyan font-mono">
                <MapPin className="w-3.5 h-3.5" />
                <span>{place.location.neighborhood} · {place.distanceKm} km away</span>
              </div>
              <h2 className="font-display font-extrabold text-2xl sm:text-4xl text-white group-hover:text-vybe-lime transition-colors leading-tight">
                {place.name}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                {place.description}
              </p>
            </div>

            {/* Tags Pills */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {place.tags.map(tag => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg bg-white/10 text-slate-200 text-xs font-semibold"
                >
                  #{tag}
                </span>
              ))}
            </div>

          </div>

          {/* CTA Row */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-white">{place.rating}</span>
              <span>({place.reviewCount} vibes)</span>
            </div>

            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-display font-bold text-xs group-hover:bg-vybe-lime transition-colors">
              <span>View Full Experience</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

