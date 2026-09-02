import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Place } from '../../types';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { VybeScoreBadge } from '../common/VybeScoreBadge';
import { INITIAL_MOODS } from '../../data/initialMoods';
import { GoogleMap } from './GoogleMap';
import { isGoogleMapsConfigured } from '../../lib/env';
import { useGeolocation } from '../../hooks/useGeolocation';
import {
  Sparkles,
  ArrowRight,
  Locate,
} from 'lucide-react';

// Helper component to center map smoothly when selected place changes
const MapController: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom = 14 }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
};

// Generate custom SVG / HTML div icon for Leaflet
function createCustomMarkerIcon(place: Place, isSelected: boolean) {
  const moodObj = INITIAL_MOODS.find(m => m.id === place.primaryMood);
  const emoji = moodObj?.emoji || '📍';
  const color = moodObj?.accentColor || '#CCFF00';

  const html = `
    <div class="custom-map-marker group relative cursor-pointer ${isSelected ? 'scale-125 z-50' : ''}">
      <div class="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-black font-sans shadow-lg transition-all"
           style="background-color: ${color}; border: 2px solid #000; box-shadow: 0 0 15px ${color}88;">
        <span>${emoji}</span>
        <span class="font-mono text-[11px] font-extrabold">${place.features.isFree ? 'FREE' : place.priceLevel}</span>
      </div>
      <div class="w-2 h-2 bg-black rotate-45 mx-auto -mt-1 border-r border-b border-black"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'leaflet-custom-div-icon',
    iconSize: [60, 30],
    iconAnchor: [30, 28]
  });
}

export const VybeMap: React.FC = () => {
  const { filteredPlaces, openPlaceDetail, selectedPlace, setSelectedPlace } = useData();
  const { theme } = useTheme();
  const { location: userLocation, requestLocation, loading: geoLoading } = useGeolocation();
  const [activePreviewPlace, setActivePreviewPlace] = useState<Place | null>(
    filteredPlaces[0]?.place || null
  );

  // Center coordinate (Default to user location or first place or Metropolis Center)
  const userLat = userLocation?.lat != null ? userLocation.lat : null;
  const userLng = userLocation?.lng != null ? userLocation.lng : null;
  const activeLat = activePreviewPlace?.location?.lat != null ? activePreviewPlace.location.lat : null;
  const activeLng = activePreviewPlace?.location?.lng != null ? activePreviewPlace.location.lng : null;
  const defaultCenter: [number, number] = [
    userLat ?? activeLat ?? 40.7185,
    userLng ?? activeLng ?? -73.9925
  ];

  const handleMarkerClick = (place: Place) => {
    setActivePreviewPlace(place);
    setSelectedPlace(place);
  };

  // Render Google Maps if configured, otherwise Leaflet
  if (isGoogleMapsConfigured) {
    return (
      <div className="relative w-full h-[calc(100vh-140px)] min-h-[550px] rounded-3xl overflow-hidden border border-slate-200 dark:border-vybe-dark-border shadow-2xl">
        <GoogleMap
          places={filteredPlaces.map(fp => fp.place)}
          onMarkerClick={handleMarkerClick}
          selectedPlace={selectedPlace}
          userLocation={userLocation}
        />
        {/* Top Floating Map Legend */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/80 dark:bg-vybe-dark-card/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 text-white text-xs font-mono">
          <Sparkles className="w-4 h-4 text-vybe-lime" />
          <span>{filteredPlaces.length} Spots Active on Radar</span>
        </div>
        {/* Location Button */}
        <button
          onClick={requestLocation}
          disabled={geoLoading}
          className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/80 dark:bg-vybe-dark-card/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 text-white text-xs font-mono hover:bg-vybe-lime hover:text-black transition-all"
        >
          <Locate className={`w-4 h-4 ${geoLoading ? 'animate-spin' : ''}`} />
          <span>{geoLoading ? 'Locating...' : 'My Location'}</span>
        </button>
        {/* Bottom Floating Place Preview Drawer */}
        {activePreviewPlace && (
          <div className="absolute bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-10 animate-fadeIn">
            <div
              onClick={() => openPlaceDetail(activePreviewPlace)}
              className="flex items-center gap-4 p-4 rounded-3xl bg-white/95 dark:bg-vybe-dark-card/95 backdrop-blur-xl border border-slate-200 dark:border-vybe-dark-border shadow-2xl cursor-pointer hover:border-vybe-lime transition-all group"
            >
              <img src={activePreviewPlace.images[0]} alt={activePreviewPlace.name} loading="lazy" decoding="async" className="w-24 h-24 rounded-2xl object-cover shrink-0 border border-black/10 dark:border-white/10 group-hover:scale-105 transition-transform" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <VybeScoreBadge score={activePreviewPlace.baseVybeScore} size="sm" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{activePreviewPlace.distanceKm || 1.2} km</span>
                </div>
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white truncate group-hover:text-vybe-lime transition-colors">{activePreviewPlace.name}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{activePreviewPlace.tagline}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-vybe-citrus">{activePreviewPlace.features.isFree ? '100% Free' : activePreviewPlace.priceLevel}</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Explore</span>
                    <ArrowRight className="w-3.5 h-3.5 text-vybe-lime" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Tile layer URL based on dark or light mode
  const tileUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  // Leaflet fallback
  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[550px] rounded-3xl overflow-hidden border border-slate-200 dark:border-vybe-dark-border shadow-2xl">
      
      {/* Real-time Map Canvas */}
      <MapContainer
        center={defaultCenter}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={theme === 'dark' ? darkTileUrl : tileUrl}
        />

        <MapController center={defaultCenter} zoom={14} />

        {/* Markers */}
        {filteredPlaces.map(({ place, scoreInfo }) => {
          const isSelected = selectedPlace?.id === place.id;
          return (
            <Marker
              key={place.id}
              position={[place.location.lat, place.location.lng]}
              icon={createCustomMarkerIcon(place, isSelected)}
              eventHandlers={{
                click: () => handleMarkerClick(place),
              }}
            >
              <Popup className="vybe-leaflet-popup">
                <div className="p-3 w-56 text-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-vybe-lime uppercase">
                      {place.category}
                    </span>
                    <span className="text-xs font-bold text-amber-400">★ {place.rating}</span>
                  </div>
                  <h4 className="font-display font-bold text-sm text-white line-clamp-1 mb-1">
                    {place.name}
                  </h4>
                  <p className="text-xs text-slate-300 line-clamp-1 mb-2">
                    {place.tagline}
                  </p>
                  <button
                    onClick={() => openPlaceDetail(place)}
                    className="w-full py-1.5 rounded-lg bg-vybe-lime text-black font-bold text-xs shadow-neon-lime hover:scale-105 transition-all"
                  >
                    View Vibe
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Top Floating Map Legend */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/80 dark:bg-vybe-dark-card/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 text-white text-xs font-mono">
        <Sparkles className="w-4 h-4 text-vybe-lime" />
        <span>{filteredPlaces.length} Spots Active on Radar</span>
      </div>

      {/* Location Button */}
      <button
        onClick={requestLocation}
        disabled={geoLoading}
        className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/80 dark:bg-vybe-dark-card/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 text-white text-xs font-mono hover:bg-vybe-lime hover:text-black transition-all"
      >
        <Locate className={`w-4 h-4 ${geoLoading ? 'animate-spin' : ''}`} />
        <span>{geoLoading ? 'Locating...' : 'My Location'}</span>
      </button>

      {/* Bottom Floating Place Preview Drawer */}
      {activePreviewPlace && (
        <div className="absolute bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-10 animate-fadeIn">
          <div
            onClick={() => openPlaceDetail(activePreviewPlace)}
            className="flex items-center gap-4 p-4 rounded-3xl bg-white/95 dark:bg-vybe-dark-card/95 backdrop-blur-xl border border-slate-200 dark:border-vybe-dark-border shadow-2xl cursor-pointer hover:border-vybe-lime transition-all group"
          >
            <img
              src={activePreviewPlace.images[0]}
              alt={activePreviewPlace.name}
              loading="lazy"
              decoding="async"
              className="w-24 h-24 rounded-2xl object-cover shrink-0 border border-black/10 dark:border-white/10 group-hover:scale-105 transition-transform"
            />

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <VybeScoreBadge score={activePreviewPlace.baseVybeScore} size="sm" />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {activePreviewPlace.distanceKm || 1.2} km
                </span>
              </div>

              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white truncate group-hover:text-vybe-lime transition-colors">
                {activePreviewPlace.name}
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                {activePreviewPlace.tagline}
              </p>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-vybe-citrus">
                  {activePreviewPlace.features.isFree ? '100% Free' : activePreviewPlace.priceLevel}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Explore</span>
                  <ArrowRight className="w-3.5 h-3.5 text-vybe-lime" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

