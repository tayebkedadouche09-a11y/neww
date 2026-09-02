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
import { Sparkles, ArrowRight, Locate, MapPin } from 'lucide-react';

const MapController: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom = 14 }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
};

function getPlaceMarkerEmoji(place: Place): string {
  const text = `${place.name} ${place.tags.join(' ')}`.toLowerCase();
  if (/mosque|masjid|مسجد|جامع/.test(text)) return '🕌';
  if (/church|eglise|église|كنيسة/.test(text)) return '⛪';
  if (/synagogue|كنيس/.test(text)) return '🕍';
  if (/hospital|clinic|pharmacy|hôpital|clinique|مستشفى|صيدلية/.test(text)) return '🏥';
  if (/hotel|hostel|motel|hôtel|فندق/.test(text)) return '🏨';
  if (/school|university|école|université|مدرسة|جامعة/.test(text)) return '🎓';
  if (/restaurant|food|bakery|مطعم|مخبزة/.test(text)) return '🍽️';
  if (/coffee|cafe|café|قهوة|مقهى/.test(text)) return '☕';
  if (/game|arcade|jeux|gaming|video_arcade|ألعاب/.test(text)) return '🎮';
  if (/cinema|movie|theater|film|cinéma|سينما|مسرح/.test(text)) return '🎬';
  if (/gym|fitness|sport|stadium|pool|tennis|رياضة|ملعب|مسبح/.test(text)) return '🏋️';
  if (/park|garden|playground|nature|حديقة/.test(text)) return '🌳';
  if (/shopping|mall|store|market|boutique|تسوق|سوق/.test(text)) return '🛍️';
  if (/museum|gallery|library|متحف|مكتبة/.test(text)) return '🏛️';
  if (/bar|club|nightlife|music|karaoke|موسيقى/.test(text)) return '🎵';
  if (/airport|station|bus|train|transit|مطار|محطة/.test(text)) return '🚉';
  return '📍';
}

function createCustomMarkerIcon(place: Place, isSelected: boolean) {
  const moodObj = INITIAL_MOODS.find(m => m.id === place.primaryMood);
  const emoji = getPlaceMarkerEmoji(place);
  const color = moodObj?.accentColor || '#CCFF00';
  const imageUrl = place.images.find(image => /^https?:\/\//i.test(image?.trim()))?.trim();
  const fallback = `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:20px;background:${color}">${emoji}</span>`;
  const media = imageUrl
    ? `<img src="${imageUrl.replace(/"/g, '&quot;')}" alt="" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.outerHTML='${fallback.replace(/'/g, "\\'")}'" />`
    : fallback;
  const html = `
    <div class="custom-map-marker group relative cursor-pointer ${isSelected ? 'scale-125 z-50' : ''}" style="width:46px;height:46px;border-radius:14px;overflow:hidden;border:2px solid #000;box-shadow:0 4px 14px rgba(0,0,0,.35);background:#111;">
      ${media}
      <div style="position:absolute;inset:0;border:2px solid ${color};border-radius:12px;pointer-events:none;"></div>
    </div>`;
  return L.divIcon({ html, className: 'leaflet-custom-div-icon', iconSize: [46, 46], iconAnchor: [23, 42] });
}

const PlacePreview: React.FC<{ place: Place; onOpen: (place: Place) => void }> = ({ place, onOpen }) => {
  const imageUrls = place.images.filter(image => /^https?:\/\//i.test(image?.trim())).map(image => image.trim());
  const [imageIndex, setImageIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<number[]>([]);
  const available = imageUrls.map((_, index) => index).filter(index => !failedImages.includes(index));
  const activeIndex = available.includes(imageIndex) ? imageIndex : (available[0] ?? -1);
  const imageUrl = activeIndex >= 0 ? imageUrls[activeIndex] : undefined;
  const hasDistance = typeof place.distanceKm === 'number' && Number.isFinite(place.distanceKm) && place.distanceKm >= 0;
  const emoji = getPlaceMarkerEmoji(place);

  return (
    <div className="absolute bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-10 animate-fadeIn">
      <div onClick={() => onOpen(place)} className="flex items-center gap-4 p-4 rounded-3xl bg-white/95 dark:bg-vybe-dark-card/95 backdrop-blur-xl border border-slate-200 dark:border-vybe-dark-border shadow-2xl cursor-pointer hover:border-vybe-lime transition-all group">
        <div className="w-24 h-24 rounded-2xl shrink-0 overflow-hidden border border-black/10 dark:border-white/10 bg-slate-900 flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt={place.name} loading="lazy" decoding="async" onError={() => setFailedImages(prev => prev.includes(activeIndex) ? prev : [...prev, activeIndex])} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          ) : (
            <span className="text-4xl" aria-label={`${place.name} category icon`}>{emoji}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <VybeScoreBadge score={place.baseVybeScore} size="sm" />
            {hasDistance && <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{place.distanceKm!.toFixed(1)} km</span>}
          </div>
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-white truncate group-hover:text-vybe-lime transition-colors">{place.name}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{place.tagline || place.location.address}</p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-vybe-citrus">{place.features.isFree ? '100% Free' : place.priceLevel}</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 group-hover:translate-x-1 transition-transform"><span>Explore</span><ArrowRight className="w-3.5 h-3.5 text-vybe-lime" /></span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MapOverlay: React.FC<{ count: number; requestLocation: () => void; geoLoading: boolean }> = ({ count, requestLocation, geoLoading }) => (
  <>
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/80 dark:bg-vybe-dark-card/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 text-white text-xs font-mono">
      <Sparkles className="w-4 h-4 text-vybe-lime" /><span>{count} Spots Active on Radar</span>
    </div>
    <button onClick={requestLocation} disabled={geoLoading} className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/80 dark:bg-vybe-dark-card/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 text-white text-xs font-mono hover:bg-vybe-lime hover:text-black transition-all">
      <Locate className={`w-4 h-4 ${geoLoading ? 'animate-spin' : ''}`} /><span>{geoLoading ? 'Locating...' : 'My Location'}</span>
    </button>
  </>
);

export const VybeMap: React.FC = () => {
  const { filteredPlaces, openPlaceDetail, selectedPlace, setSelectedPlace } = useData();
  const { theme } = useTheme();
  const { location: userLocation, requestLocation, loading: geoLoading } = useGeolocation();
  const [activePreviewPlace, setActivePreviewPlace] = useState<Place | null>(filteredPlaces[0]?.place || null);
  const [useGoogle, setUseGoogle] = useState(isGoogleMapsConfigured);

  useEffect(() => { setUseGoogle(isGoogleMapsConfigured); }, []);

  useEffect(() => {
    if (selectedPlace) setActivePreviewPlace(selectedPlace);
    else if (filteredPlaces.length > 0) setActivePreviewPlace(filteredPlaces[0].place);
    else setActivePreviewPlace(null);
  }, [selectedPlace, filteredPlaces]);

  const userLat = userLocation?.lat != null ? userLocation.lat : null;
  const userLng = userLocation?.lng != null ? userLocation.lng : null;
  const activeLat = activePreviewPlace?.location?.lat != null ? activePreviewPlace.location.lat : null;
  const activeLng = activePreviewPlace?.location?.lng != null ? activePreviewPlace.location.lng : null;
  const defaultCenter: [number, number] = [userLat ?? activeLat ?? 20, userLng ?? activeLng ?? 0];
  const defaultZoom = userLat != null || activeLat != null ? 14 : 2;

  const handleMarkerClick = (place: Place) => {
    setActivePreviewPlace(place);
    setSelectedPlace(place);
  };

  const mapShell = 'relative w-full h-[calc(100vh-140px)] min-h-[550px] rounded-3xl overflow-hidden border border-slate-200 dark:border-vybe-dark-border shadow-2xl';

  if (useGoogle) {
    return (
      <div className={mapShell}>
        <GoogleMap places={filteredPlaces.map(fp => fp.place)} onMarkerClick={handleMarkerClick} selectedPlace={selectedPlace} userLocation={userLocation} onError={() => setUseGoogle(false)} />
        <MapOverlay count={filteredPlaces.length} requestLocation={requestLocation} geoLoading={geoLoading} />
        {activePreviewPlace && <PlacePreview place={activePreviewPlace} onOpen={openPlaceDetail} />}
      </div>
    );
  }

  const tileUrl = theme === 'dark' ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  return (
    <div className={mapShell}>
      <MapContainer center={defaultCenter} zoom={defaultZoom} scrollWheelZoom={true} className="w-full h-full z-0">
        <TileLayer attribution='&copy; <a href="https://carto.com/">CARTO</a>' url={theme === 'dark' ? darkTileUrl : tileUrl} />
        <MapController center={defaultCenter} zoom={defaultZoom} />
        {filteredPlaces.map(({ place }) => {
          const isSelected = selectedPlace?.id === place.id;
          return (
            <Marker key={place.id} position={[place.location.lat, place.location.lng]} icon={createCustomMarkerIcon(place, isSelected)} eventHandlers={{ click: () => handleMarkerClick(place) }}>
              <Popup className="vybe-leaflet-popup">
                <div className="p-3 w-56 text-slate-100">
                  <div className="flex items-center justify-between mb-1.5"><span className="text-[10px] font-mono text-vybe-lime uppercase">{place.category}</span><span className="text-xs font-bold text-amber-400">★ {place.rating}</span></div>
                  <h4 className="font-display font-bold text-sm text-white line-clamp-1 mb-1">{place.name}</h4>
                  <p className="text-xs text-slate-300 line-clamp-1 mb-2">{place.tagline || place.location.address}</p>
                  <button onClick={() => openPlaceDetail(place)} className="w-full py-1.5 rounded-lg bg-vybe-lime text-black font-bold text-xs shadow-neon-lime hover:scale-105 transition-all">View Vibe</button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <MapOverlay count={filteredPlaces.length} requestLocation={requestLocation} geoLoading={geoLoading} />
      {activePreviewPlace && <PlacePreview place={activePreviewPlace} onOpen={openPlaceDetail} />}
    </div>
  );
};
