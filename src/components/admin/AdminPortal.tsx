import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Edit, 
  Trash2, 
  Flame, 
  Star, 
  Sparkles, 
  Check, 
  X,
  MapPin,
  DollarSign,
  Layers
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Place, CategoryType, MoodType, PriceLevel } from '../../types';
import { INITIAL_CATEGORIES } from '../../data/initialCategories';
import { INITIAL_MOODS } from '../../data/initialMoods';

export const AdminPortal: React.FC = () => {
  const { places, addPlace, updatePlace, deletePlace, showToast } = useData();

  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryType>('food-drink');
  const [primaryMood, setPrimaryMood] = useState<MoodType>('hungry');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [priceLevel, setPriceLevel] = useState<PriceLevel>('$$');
  const [approxCost, setApproxCost] = useState(20);
  const [imageUrl, setImageUrl] = useState('');
  const [isSecretGem, setIsSecretGem] = useState(false);
  const [isLateNight, setIsLateNight] = useState(false);
  const [isOutdoor, setIsOutdoor] = useState(false);

  const resetForm = () => {
    setName('');
    setTagline('');
    setDescription('');
    setCategory('food-drink');
    setPrimaryMood('hungry');
    setAddress('');
    setNeighborhood('');
    setPriceLevel('$$');
    setApproxCost(20);
    setImageUrl('');
    setIsSecretGem(false);
    setIsLateNight(false);
    setIsOutdoor(false);
    setIsAddingPlace(false);
    setEditingPlaceId(null);
  };

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const img = imageUrl.trim() || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80';

    if (editingPlaceId) {
      updatePlace(editingPlaceId, {
        name,
        tagline,
        description,
        category,
        primaryMood,
        priceLevel,
        approxCostUsd: Number(approxCost),
        location: {
          address: address || 'Downtown Metropolis',
          neighborhood: neighborhood || 'Central City',
          city: 'Metropolis',
          lat: 40.7185 + (Math.random() - 0.5) * 0.05,
          lng: -73.9925 + (Math.random() - 0.5) * 0.05
        },
        images: [img],
        features: {
          isFree: priceLevel === 'free',
          isOutdoor,
          isIndoor: !isOutdoor,
          hasFood: true,
          hasAlcohol: false,
          isLateNight,
          isSecretGem,
          isPetFriendly: true,
          isWifiFriendly: true,
          isPhotoSpot: true,
          isAccessible: true
        }
      });
      showToast(`Updated place "${name}"`, '✏️', 'success');
    } else {
      addPlace({
        name,
        tagline,
        description,
        category,
        primaryMood,
        secondaryMoods: ['chill', 'creative'],
        location: {
          address: address || 'Downtown Metropolis',
          neighborhood: neighborhood || 'Central City',
          city: 'Metropolis',
          lat: 40.7185 + (Math.random() - 0.5) * 0.05,
          lng: -73.9925 + (Math.random() - 0.5) * 0.05
        },
        priceLevel,
        approxCostUsd: Number(approxCost),
        images: [img],
        tags: ['New Spot', 'Community Pick'],
        estimatedDuration: '1h - 2h',
        openingHours: {
          monday: '10:00 - 22:00',
          tuesday: '10:00 - 22:00',
          wednesday: '10:00 - 22:00',
          thursday: '10:00 - 22:00',
          friday: '10:00 - 00:00',
          saturday: '10:00 - 00:00',
          sunday: '10:00 - 20:00',
          isOpenNow: true
        },
        features: {
          isFree: priceLevel === 'free',
          isOutdoor,
          isIndoor: !isOutdoor,
          hasFood: true,
          hasAlcohol: false,
          isLateNight,
          isSecretGem,
          isPetFriendly: true,
          isWifiFriendly: true,
          isPhotoSpot: true,
          isAccessible: true
        },
        suitableFor: ['friends', 'solo', 'couple'],
        isFeatured: true,
        isTrending: true
      });
    }

    resetForm();
  };

  const startEdit = (place: Place) => {
    setEditingPlaceId(place.id);
    setName(place.name);
    setTagline(place.tagline);
    setDescription(place.description);
    setCategory(place.category);
    setPrimaryMood(place.primaryMood);
    setAddress(place.location.address);
    setNeighborhood(place.location.neighborhood);
    setPriceLevel(place.priceLevel);
    setApproxCost(place.approxCostUsd);
    setImageUrl(place.images[0] || '');
    setIsSecretGem(place.features.isSecretGem);
    setIsLateNight(place.features.isLateNight);
    setIsOutdoor(place.features.isOutdoor);
    setIsAddingPlace(true);
  };

  return (
    <div data-testid="admin-portal" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-vybe-pink/15 text-vybe-pink font-mono font-bold text-xs mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>CONTENT MANAGEMENT PORTAL</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white">
            Admin Place Management
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Create, curate, edit and feature new spots on VYBE platform.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsAddingPlace(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-vybe-lime text-black font-bold text-xs shadow-neon-lime hover:scale-105 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Place</span>
        </button>
      </div>

      {/* Creation & Edit Form */}
      {isAddingPlace && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border shadow-2xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              {editingPlaceId ? 'Edit Place Details' : 'Create New Spot'}
            </h3>
            <button onClick={resetForm} className="p-1 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateOrUpdate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sonic Vinyl & Coffee Bar"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tagline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Craft pour-overs, rare vinyl & lo-fi beats"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Description</label>
              <textarea
                rows={3}
                required
                placeholder="Deep dive description of the vibe and atmosphere..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as CategoryType)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-xs font-bold text-slate-900 dark:text-white"
                >
                  {INITIAL_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Primary Mood</label>
                <select
                  value={primaryMood}
                  onChange={e => setPrimaryMood(e.target.value as MoodType)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-xs font-bold text-slate-900 dark:text-white"
                >
                  {INITIAL_MOODS.map(m => (
                    <option key={m.id} value={m.id}>{m.emoji} {m.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Price Level</label>
                <select
                  value={priceLevel}
                  onChange={e => setPriceLevel(e.target.value as PriceLevel)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="free">Free ($0)</option>
                  <option value="$">$ (Under $15)</option>
                  <option value="$$">$$ ($15 - $35)</option>
                  <option value="$$$">$$$ ($35+)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Approx Cost ($)</label>
                <input
                  type="number"
                  value={approxCost}
                  onChange={e => setApproxCost(Number(e.target.value))}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Neighborhood</label>
                <input
                  type="text"
                  placeholder="e.g. East River Arts"
                  value={neighborhood}
                  onChange={e => setNeighborhood(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Feature Checkboxes */}
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSecretGem}
                  onChange={e => setIsSecretGem(e.target.checked)}
                  className="rounded accent-vybe-lime"
                />
                <span>💎 Mark as Hidden Gem</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLateNight}
                  onChange={e => setIsLateNight(e.target.checked)}
                  className="rounded accent-vybe-lime"
                />
                <span>🌙 Late Night Hub</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOutdoor}
                  onChange={e => setIsOutdoor(e.target.checked)}
                  className="rounded accent-vybe-lime"
                />
                <span>🌿 Outdoor / Open Air</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-vybe-lime text-black font-bold text-xs uppercase tracking-wider shadow-neon-lime hover:scale-105 transition-all"
              >
                {editingPlaceId ? 'Update Place' : 'Publish Spot to VYBE'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Places Management Table */}
      <div className="rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border shadow-lg overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
            Active Places Catalog ({places.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/5 overflow-x-auto">
          {places.map(place => (
            <div
              key={place.id}
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-vybe-dark-surface/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={place.images[0]}
                  alt={place.name}
                  loading="lazy"
                  decoding="async"
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">
                      {place.name}
                    </h4>
                    {place.isTrending && (
                      <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 font-mono text-[10px] font-bold">
                        TRENDING
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {place.category} · {place.location.neighborhood} · {place.priceLevel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    updatePlace(place.id, { isTrending: !place.isTrending });
                  }}
                  className={`p-2 rounded-xl text-xs font-bold transition-all ${
                    place.isTrending ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-100 dark:bg-vybe-dark-surface text-slate-400'
                  }`}
                  title="Toggle Trending"
                >
                  <Flame className="w-4 h-4" />
                </button>

                <button
                  onClick={() => startEdit(place)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-vybe-dark-surface text-slate-600 dark:text-slate-300 hover:text-vybe-lime transition-all"
                  title="Edit Place"
                >
                  <Edit className="w-4 h-4" />
                </button>

                <button
                  onClick={() => deletePlace(place.id)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-vybe-dark-surface text-slate-600 dark:text-slate-400 hover:text-rose-500 transition-all"
                  title="Delete Place"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

