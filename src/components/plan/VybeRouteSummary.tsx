import React, { useMemo } from 'react';
import { Clock3, MapPin, Navigation, Route, Timer } from 'lucide-react';
import { useData } from '../../context/DataContext';

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earthRadius = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export const VybeRouteSummary: React.FC = () => {
  const { activePlan, places } = useData();

  const stops = useMemo(() => {
    if (!activePlan) return [];
    return [...activePlan.items]
      .sort((a, b) => a.order - b.order)
      .map(item => ({ item, place: places.find(place => place.id === item.placeId) }))
      .filter((entry): entry is { item: typeof activePlan.items[number]; place: NonNullable<typeof entry.place> } => Boolean(entry.place));
  }, [activePlan, places]);

  const route = useMemo(() => {
    let distanceKm = 0;
    for (let i = 1; i < stops.length; i += 1) distanceKm += haversineKm(stops[i - 1].place.location, stops[i].place.location);
    const travelMinutes = Math.round(distanceKm / 0.45);
    return { distanceKm, travelMinutes };
  }, [stops]);

  if (!activePlan || stops.length < 2) return null;

  const googleRoute = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${stops[0].place.location.lat},${stops[0].place.location.lng}`)}&destination=${encodeURIComponent(`${stops[stops.length - 1].place.location.lat},${stops[stops.length - 1].place.location.lng}`)}&waypoints=${encodeURIComponent(stops.slice(1, -1).map(stop => `${stop.place.location.lat},${stop.place.location.lng}`).join('|'))}`;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8" aria-label="Outing route summary">
      <div className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-vybe-cyan"><Route className="w-3.5 h-3.5" /> SMART ROUTE</span>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mt-1">Your outing, connected</h3>
          </div>
          <a href={googleRoute} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-vybe-lime text-black text-xs font-bold hover:scale-105 transition-transform"><Navigation className="w-3.5 h-3.5" /> Open full route</a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="text-[10px] font-mono text-slate-500">STOPS</span><p className="font-display font-bold text-base text-slate-900 dark:text-white mt-1">{stops.length}</p></div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="text-[10px] font-mono text-slate-500">ROUTE</span><p className="font-display font-bold text-base text-slate-900 dark:text-white mt-1">{route.distanceKm.toFixed(1)} km</p></div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="text-[10px] font-mono text-slate-500">TRAVEL</span><p className="font-display font-bold text-base text-slate-900 dark:text-white mt-1">~{route.travelMinutes} min</p></div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border"><span className="text-[10px] font-mono text-slate-500">PACE</span><p className="font-display font-bold text-base text-vybe-lime mt-1">Balanced</p></div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {stops.map((stop, index) => (
            <React.Fragment key={stop.item.id}>
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-vybe-dark-surface text-slate-800 dark:text-slate-200 font-bold"><span className="w-5 h-5 rounded-lg bg-black text-vybe-lime dark:bg-vybe-lime dark:text-black flex items-center justify-center text-[10px]">{index + 1}</span>{stop.place.name}</span>
              {index < stops.length - 1 && <span className="text-slate-400" aria-hidden="true">→</span>}
            </React.Fragment>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-slate-500 flex items-center gap-2"><Timer className="w-3.5 h-3.5" /> Travel time is an estimate from straight-line distance; real traffic can be different.</p>
      </div>
    </section>
  );
};
