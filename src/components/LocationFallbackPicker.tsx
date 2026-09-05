import { MapPin, Navigation } from 'lucide-react';
import { DEFAULT_VYBE_LOCATION, VYBE_LOCATION_PRESETS, type VybeLocationPreset } from '../data/locationPresets';

interface LocationFallbackPickerProps {
  onSelect: (location: VybeLocationPreset) => void;
  onUseCurrentLocation?: () => void;
  loading?: boolean;
}

export function LocationFallbackPicker({ onSelect, onUseCurrentLocation, loading = false }: LocationFallbackPickerProps) {
  return (
    <section className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-white">Choose where you want to explore</h2>
          <p className="mt-1 text-sm text-white/60">
            Location access is optional. Pick a city and VYBE will discover real places there.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {VYBE_LOCATION_PRESETS.map((location) => {
              const isDefault = location.id === DEFAULT_VYBE_LOCATION.id;
              return (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => onSelect(location)}
                  disabled={loading}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Explore ${location.label}`}
                >
                  {location.label}{isDefault ? ' • Default' : ''}
                </button>
              );
            })}
            {onUseCurrentLocation && (
              <button
                type="button"
                onClick={onUseCurrentLocation}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Navigation className="h-4 w-4" aria-hidden="true" />
                Use my location
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
