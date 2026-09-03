import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Edit,
  Trash2,
  Flame,
  X,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Place, CategoryType, MoodType, PriceLevel } from '../../types';
import { INITIAL_CATEGORIES } from '../../data/initialCategories';
import { INITIAL_MOODS } from '../../data/initialMoods';

export const AdminPortal: React.FC = () => {
  const { isAdmin, isAuthenticated } = useAuth();
  const { places, addPlace, updatePlace, deletePlace, showToast } = useData();

  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryType>('food-drink');
  const [primaryMood, setPrimaryMood] = useState<MoodType>('hungry');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [priceLevel, setPriceLevel] = useState<PriceLevel>('$$');
  const [approxCost, setApproxCost] = useState(20);
  const [imageUrl, setImageUrl] = useState('');
  const [isSecretGem, setIsSecretGem] = useState(false);
  const [isLateNight, setIsLateNight] = useState(false);
  const [isOutdoor, setIsOutdoor] = useState(false);

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-slate-400" />
        <h1 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">Admin access required</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">This area is restricted to authorized VYBE administrators.</p>
      </div>
    );
  }

  const resetForm = () => {
    setName('');
    setTagline('');
    setDescription('');
    setCategory('food-drink');
    setPrimaryMood('hungry');
    setAddress('');
    setNeighborhood('');
    setLatitude(0);
    setLongitude(0);
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
    if (!name.trim() || !tagline.trim() || !description.trim()) return;
    if (!editingPlaceId && (!address.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || (latitude === 0 && longitude === 0))) {
      showToast('New places need a real address and valid map coordinates.', '📍', 'info');
      return;
    }

    const img = imageUrl.trim();

    if (editingPlaceId) {
      const existing = places.find(place => place.id === editingPlaceId);
      if (!existing) {
        showToast('This place is no longer available.', '⚠️', 'info');
        resetForm();
        return;
      }
      updatePlace(existing.id, {
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        category,
        primaryMood,
        location: editingPlaceId && existing.location ? { ...existing.location, address: address.trim() || existing.location.address, neighborhood: neighborhood.trim() || existing.location.neighborhood, lat: Number.isFinite(latitude) && latitude !== 0 ? latitude : existing.location.lat, lng: Number.isFinite(longitude) && longitude !== 0 ? longitude : existing.location.lng } : existing.location,
        priceLevel,
        approxCostUsd: approxCost,
        images: img ? [img] : existing.images,
        features: { ...existing.features, isSecretGem, isLateNight, isOutdoor },
      });
      showToast('Place updated.', '✅', 'success');
      resetForm();
      return;
    }

    const created = addPlace({
      provider: 'vybe',
      providerPlaceId: undefined,
      name: name.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      category,
      primaryMood,
      secondaryMoods: [],
      location: { address: address.trim(), neighborhood: neighborhood.trim(), city: '', lat: latitude, lng: longitude },
      priceLevel,
      approxCostUsd: approxCost,
      images: img ? [img] : [],
      tags: [],
      estimatedDuration: '90 min',
      openingHours: { monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '', isOpenNow: undefined },
      features: { isFree: priceLevel === 'free', isOutdoor, isIndoor: !isOutdoor, hasFood: category === 'food-drink', hasAlcohol: category === 'nightlife', isLateNight, isSecretGem, isPetFriendly: false, isWifiFriendly: false, isPhotoSpot: false, isAccessible: false },
      suitableFor: ['solo', 'friends'],
      website: '',
      phone: '',
      instagram: '',
      isFeatured: false,
      isTrending: false,
    });
    if (created) showToast('Place created.', '✅', 'success');
    resetForm();
  };

  const editPlace = (place: Place) => {
    setEditingPlaceId(place.id);
    setName(place.name);
    setTagline(place.tagline);
    setDescription(place.description);
    setCategory(place.category);
    setPrimaryMood(place.primaryMood);
    setAddress(place.location.address);
    setNeighborhood(place.location.neighborhood);
    setLatitude(place.location.lat);
    setLongitude(place.location.lng);
    setPriceLevel(place.priceLevel);
    setApproxCost(place.approxCostUsd);
    setImageUrl(place.images[0] || '');
    setIsSecretGem(place.features.isSecretGem);
    setIsLateNight(place.features.isLateNight);
    setIsOutdoor(place.features.isOutdoor);
    setIsAddingPlace(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-vybe-pink"><ShieldCheck className="w-4 h-4" /> VYBE ADMIN</div>
          <h1 className="font-display font-extrabold text-3xl text-slate-900 dark:text-white">Place Catalog</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage the real VYBE catalog stored in Supabase.</p>
        </div>
        <button type="button" onClick={() => { resetForm(); setIsAddingPlace(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-vybe-lime text-black font-bold text-xs shadow-neon-lime"><Plus className="w-4 h-4" />Add Place</button>
      </div>

      {isAddingPlace && (
        <form onSubmit={handleCreateOrUpdate} className="p-6 rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border space-y-4">
          <div className="flex items-center justify-between"><h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">{editingPlaceId ? 'Edit Place' : 'Add Place'}</h2><button type="button" onClick={resetForm} className="p-2 rounded-xl bg-slate-100 dark:bg-vybe-dark-surface"><X className="w-4 h-4" /></button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="p-3 rounded-xl border" />
            <input required value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Tagline" className="p-3 rounded-xl border" />
            <textarea required value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="p-3 rounded-xl border md:col-span-2" />
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" className="p-3 rounded-xl border" />
            <input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Neighborhood" className="p-3 rounded-xl border" />
            <input type="number" step="any" value={latitude} onChange={e => setLatitude(Number(e.target.value))} placeholder="Latitude" className="p-3 rounded-xl border" />
            <input type="number" step="any" value={longitude} onChange={e => setLongitude(Number(e.target.value))} placeholder="Longitude" className="p-3 rounded-xl border" />
            <input type="number" min="0" value={approxCost} onChange={e => setApproxCost(Number(e.target.value))} placeholder="Approx cost USD" className="p-3 rounded-xl border" />
            <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Image URL (optional)" className="p-3 rounded-xl border" />
            <select value={category} onChange={e => setCategory(e.target.value as CategoryType)} className="p-3 rounded-xl border">{INITIAL_CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
            <select value={primaryMood} onChange={e => setPrimaryMood(e.target.value as MoodType)} className="p-3 rounded-xl border">{INITIAL_MOODS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-bold"><label><input type="checkbox" checked={isSecretGem} onChange={e => setIsSecretGem(e.target.checked)} /> Secret gem</label><label><input type="checkbox" checked={isLateNight} onChange={e => setIsLateNight(e.target.checked)} /> Late night</label><label><input type="checkbox" checked={isOutdoor} onChange={e => setIsOutdoor(e.target.checked)} /> Outdoor</label></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl text-xs font-bold">Cancel</button><button type="submit" className="px-5 py-2 rounded-xl bg-vybe-lime text-black text-xs font-bold">Save</button></div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {places.map(place => (
          <div key={place.id} className="p-4 rounded-2xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-display font-bold text-slate-900 dark:text-white">{place.name}</h3><p className="text-xs text-slate-500 mt-1">{place.tagline}</p></div><Flame className={`w-4 h-4 ${place.isTrending ? 'text-orange-500' : 'text-slate-300'}`} /></div>
            <div className="mt-4 flex gap-2"><button type="button" onClick={() => editPlace(place)} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-vybe-dark-surface text-xs font-bold"><Edit className="w-3.5 h-3.5" />Edit</button><button type="button" onClick={() => deletePlace(place.id)} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold"><Trash2 className="w-3.5 h-3.5" />Delete</button></div>
          </div>
        ))}
      </div>
    </div>
  );
};
