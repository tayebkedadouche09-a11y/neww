import React, { useState } from 'react';
import { 
  Bookmark, 
  Plus, 
  Trash2, 
  Share2, 
  Sparkles, 
  FolderPlus, 
  Edit2, 
  X,
  Lock,
  Globe,
  ArrowRight
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { PlaceCard } from '../cards/PlaceCard';
import { Collection } from '../../types';
import { useRequireAuth } from '../../hooks/useRequireAuth';

export const CollectionsView: React.FC = () => {
  const { 
    collections, 
    createCollection, 
    deleteCollection, 
    removePlaceFromCollection, 
    places, 
    openShareModal,
    showToast 
  } = useData();
  const requireAuth = useRequireAuth();

  const [activeCollectionId, setActiveCollectionId] = useState<string>(collections[0]?.id || '');
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [color, setColor] = useState('#CCFF00');

  const activeCol = collections.find(c => c.id === activeCollectionId) || collections[0];

  const colPlaces = (activeCol?.placeIds || [])
    .map(id => places.find(p => p.id === id))
    .filter(p => p !== undefined);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAuth()) return;
    if (!name.trim()) return;
    const newCol = createCollection(name.trim(), emoji, color, description.trim());
    setActiveCollectionId(newCol.id);
    setName('');
    setDescription('');
    setIsCreating(false);
  };

  const copyCollectionLink = () => {
    try {
      navigator.clipboard.writeText(`${window.location.origin}?collection=${activeCol?.id}`);
    } catch (e) {
      // clipboard unavailable (e.g. non-secure context)
    }
    showToast(`Copied public link for "${activeCol?.name}"!`, '🔗', 'success');
  };

  return (
    <div data-testid="collections-view" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-vybe-lime/15 text-slate-900 dark:text-vybe-lime font-mono font-bold text-xs mb-2">
            <Bookmark className="w-3.5 h-3.5" />
            <span>MY VYBES CURATION</span>
          </div>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 dark:text-white">
            Saved Collections
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Organize your secret spots, date ideas, and weekend lists.
          </p>
        </div>

        <button
          onClick={() => {
            if (!requireAuth()) return;
            setIsCreating(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-vybe-lime text-black font-bold text-xs shadow-neon-lime hover:scale-105 transition-all self-start sm:self-auto"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Collection</span>
        </button>
      </div>

      {/* New Collection Form */}
      {isCreating && (
        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-vybe-dark-surface border border-slate-200 dark:border-vybe-dark-border space-y-4 animate-fadeIn">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
            Create Custom Collection
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Emoji</label>
                <input
                  type="text"
                  value={emoji}
                  onChange={e => setEmoji(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border text-center text-xl"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Collection Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Secret Sunset Rooftops"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description</label>
              <input
                type="text"
                placeholder="Short note about what goes in here"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full p-3 rounded-xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border text-sm text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-vybe-lime text-black font-bold text-xs shadow-neon-lime"
              >
                Create Collection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Collection Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {collections.map(col => {
          const isSelected = activeCol?.id === col.id;
          return (
            <button
              key={col.id}
              onClick={() => setActiveCollectionId(col.id)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                isSelected
                  ? 'bg-black text-white dark:bg-vybe-lime dark:text-black border-transparent shadow-neon-lime'
                  : 'bg-white dark:bg-vybe-dark-surface text-slate-700 dark:text-slate-300 border-slate-200 dark:border-vybe-dark-border hover:border-slate-400'
              }`}
            >
              <span>{col.emoji}</span>
              <span>{col.name}</span>
              <span className="opacity-70 text-[10px] font-mono">({col.placeIds.length})</span>
            </button>
          );
        })}
      </div>

      {/* Active Collection Header Details */}
      {activeCol && (
        <div className="p-6 rounded-3xl bg-white dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{activeCol.emoji}</span>
              <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
                {activeCol.name}
              </h2>
            </div>
            {activeCol.description && (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {activeCol.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyCollectionLink}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-vybe-dark-surface text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-vybe-dark-border hover:border-vybe-lime transition-all"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Share Link</span>
            </button>

            {collections.length > 1 && (
              <button
                onClick={() => deleteCollection(activeCol.id)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 bg-slate-100 dark:bg-vybe-dark-surface transition-colors"
                title="Delete collection"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Collection Places Grid */}
      <div className="space-y-6">
        {colPlaces.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-slate-50 dark:bg-vybe-dark-card border border-slate-200 dark:border-vybe-dark-border space-y-2">
            <span className="text-4xl">✨</span>
            <h4 className="font-display font-bold text-slate-900 dark:text-white text-base">
              This collection has no saved spots yet.
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Explore places on the map or feed and add them to this list.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {colPlaces.map(place => (
              <div key={place.id} className="relative group">
                <PlaceCard place={place} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePlaceFromCollection(activeCol.id, place.id);
                  }}
                  className="absolute top-3 right-16 z-20 p-2 rounded-full bg-black/80 text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
                  title="Remove from collection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

