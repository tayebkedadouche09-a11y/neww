import React, { useEffect, useState } from 'react';
import { CloudSun, RefreshCw } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { fetchWeather, VYBEWeather } from '../../services/weatherService';

export const VybeWeatherPill: React.FC = () => {
  const { userLocation } = useData();
  const [weather, setWeather] = useState<VYBEWeather | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!userLocation) return;
    setLoading(true);
    const next = await fetchWeather(userLocation.lat, userLocation.lng);
    setWeather(next);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, [userLocation?.lat, userLocation?.lng]);
  if (!userLocation || !weather) return null;

  return <div className="fixed top-[5.5rem] right-4 sm:right-6 z-20 hidden sm:flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/90 dark:bg-vybe-dark-card/90 border border-slate-200 dark:border-vybe-dark-border shadow-lg backdrop-blur-xl text-[11px] font-bold text-slate-700 dark:text-slate-200">
    <CloudSun className="w-3.5 h-3.5 text-vybe-cyan" /><span>{weather.emoji} {Math.round(weather.temperatureC)}°C · {weather.label}</span><button type="button" onClick={() => void refresh()} disabled={loading} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Refresh weather"><RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /></button>
  </div>;
};
