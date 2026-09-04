export interface VYBEWeather {
  temperatureC: number;
  precipitationMm: number;
  windKmh: number;
  weatherCode: number;
  isRainy: boolean;
  label: string;
  emoji: string;
  recommendation: 'indoor' | 'outdoor' | 'balanced';
}

const DEFAULT_WEATHER: VYBEWeather = {
  temperatureC: 23.5,
  precipitationMm: 0,
  windKmh: 10,
  weatherCode: 0,
  isRainy: false,
  label: 'Pleasant weather',
  emoji: '✨',
  recommendation: 'balanced',
};

function classify(code: number, precipitationMm: number, temperatureC: number): VYBEWeather {
  const rainy = precipitationMm > 0.1 || [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
  const windy = [0, 1, 2, 3].includes(code) && temperatureC >= 10;
  if (rainy) return { temperatureC, precipitationMm, windKmh: 0, weatherCode: code, isRainy: true, label: 'Rain nearby', emoji: '🌧️', recommendation: 'indoor' };
  if (temperatureC >= 28) return { temperatureC, precipitationMm, windKmh: 0, weatherCode: code, isRainy: false, label: 'Warm & sunny', emoji: '☀️', recommendation: 'outdoor' };
  return { temperatureC, precipitationMm, windKmh: windy ? 12 : 8, weatherCode: code, isRainy: false, label: 'Pleasant & clear', emoji: '✨', recommendation: 'balanced' };
}

export async function fetchWeather(lat: number, lng: number, signal?: AbortSignal): Promise<VYBEWeather> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return DEFAULT_WEATHER;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&current=temperature_2m,precipitation,weather_code,wind_speed_10m`;
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Weather service unavailable');
    const json = await response.json() as { current?: { temperature_2m?: number; precipitation?: number; weather_code?: number; wind_speed_10m?: number } };
    const current = json.current;
    if (!current || typeof current.temperature_2m !== 'number') return DEFAULT_WEATHER;
    const base = classify(current.weather_code ?? 0, current.precipitation ?? 0, current.temperature_2m);
    return { ...base, windKmh: typeof current.wind_speed_10m === 'number' ? current.wind_speed_10m : base.windKmh };
  } catch {
    return DEFAULT_WEATHER;
  } finally {
    window.clearTimeout(timeout);
  }
}
