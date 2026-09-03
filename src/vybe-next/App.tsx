import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ArrowRight, Bookmark, CalendarDays, Check, ChevronDown, CircleUserRound, Compass, Copy, LocateFixed, MapPin, Navigation, Plus, Search, Share2, Sparkles, X, Zap } from 'lucide-react';
import { discoverEverything, getCityLabel, type VybeCategory, type VybeMood, type VybePlace } from './engine';
import 'leaflet/dist/leaflet.css';

const CITIES = [
  { id: 'bejaia', label: 'Béjaïa', emoji: '🌊', lat: 36.7525, lng: 5.0556 },
  { id: 'algiers', label: 'Algiers', emoji: '🏙️', lat: 36.7538, lng: 3.0588 },
  { id: 'oran', label: 'Oran', emoji: '🌅', lat: 35.6971, lng: -0.6308 },
  { id: 'setif', label: 'Sétif', emoji: '❄️', lat: 36.1898, lng: 5.4108 },
  { id: 'constantine', label: 'Constantine', emoji: '🌉', lat: 36.365, lng: 6.6147 },
];

const CATEGORIES: Array<{ id: VybeCategory; label: string; emoji: string }> = [
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'food', label: 'Food', emoji: '🍔' },
  { id: 'cafe', label: 'Cafés', emoji: '☕' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🌙' },
  { id: 'outdoors', label: 'Outdoor', emoji: '🌿' },
  { id: 'culture', label: 'Culture', emoji: '🏛️' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'family', label: 'Family', emoji: '👨‍👩‍👧' },
  { id: 'wellness', label: 'Wellness', emoji: '🧘' },
];

const MOODS: Array<{ id: VybeMood; label: string; emoji: string }> = [
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'chill', label: 'Chill', emoji: '😌' },
  { id: 'party', label: 'Party', emoji: '🔥' },
  { id: 'hungry', label: 'Hungry', emoji: '🍕' },
  { id: 'curious', label: 'Curious', emoji: '🧠' },
  { id: 'outdoor', label: 'Outdoor', emoji: '🌊' },
  { id: 'energetic', label: 'Active', emoji: '⚡' },
  { id: 'romantic', label: 'Romantic', emoji: '💖' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'explore', label: 'Explore', emoji: '🧭' },
];

const CATEGORY_LABEL: Record<VybeCategory, string> = Object.fromEntries(CATEGORIES.map(item => [item.id, item.label])) as Record<VybeCategory, string>;

interface SavedPlan {
  id: string;
  title: string;
  mood: VybeMood;
  placeIds: string[];
  budget: number;
  createdAt: string;
}

function markerIcon(place: VybePlace, selected: boolean) {
  const emoji = CATEGORIES.find(item => item.id === place.analysis.category)?.emoji ?? '📍';
  const size = selected ? 50 : 38;
  return L.divIcon({
    className: 'vybe-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    html: `<div class="marker-inner ${selected ? 'selected' : ''}"><span>${emoji}</span><b>${place.analysis.score}</b></div>`,
  });
}

function MapViewport({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.7 });
  }, [center, zoom, map]);
  return null;
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function encodeShare(data: unknown) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

function decodeShare<T>(value: string): T | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(value)))) as T;
  } catch {
    return null;
  }
}

function App() {
  const [city, setCity] = useState(CITIES[0]);
  const [places, setPlaces] = useState<VybePlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<VybeCategory | 'all'>('all');
  const [mood, setMood] = useState<VybeMood | 'all'>('all');
  const [radius, setRadius] = useState(8);
  const [sort, setSort] = useState<'smart' | 'distance' | 'score'>('smart');
  const [active, setActive] = useState<VybePlace | null>(null);
  const [tab, setTab] = useState<'explore' | 'map' | 'plan'>('explore');
  const [saved, setSaved] = useState<string[]>(() => safeRead('vybe_next_saved', []));
  const [plans, setPlans] = useState<SavedPlan[]>(() => safeRead('vybe_next_plans', []));
  const [toast, setToast] = useState('');
  const [mobileFilters, setMobileFilters] = useState(false);
  const [selectedForPlan, setSelectedForPlan] = useState<string[]>([]);
  const [profileName, setProfileName] = useState(() => localStorage.getItem('vybe_next_name') || '');
  const [nameOpen, setNameOpen] = useState(false);

  useEffect(() => localStorage.setItem('vybe_next_saved', JSON.stringify(saved)), [saved]);
  useEffect(() => localStorage.setItem('vybe_next_plans', JSON.stringify(plans)), [plans]);

  const runDiscovery = async (target = city, nextQuery = query, nextCategory = category) => {
    setLoading(true);
    setError('');
    try {
      const result = await discoverEverything({ lat: target.lat, lng: target.lng, radiusKm: radius, query: nextQuery, category: nextCategory });
      setPlaces(result);
      setActive(result[0] ?? null);
      setTab('explore');
      if (!result.length) setToast('No places matched. Widen the radius or search another type.');
    } catch (err) {
      setPlaces([]);
      setActive(null);
      setError(err instanceof Error ? err.message : 'Discovery failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runDiscovery();
    // first boot only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const share = params.get('share');
    if (!share) return;
    const decoded = decodeShare<{ title: string; placeIds: string[]; mood: VybeMood; budget: number }>(share);
    if (decoded) {
      setSelectedForPlan(decoded.placeIds);
      setTab('plan');
      setToast(`Shared outing loaded: ${decoded.title}`);
    }
  }, []);

  const filtered = useMemo(() => {
    const base = places.filter(place => mood === 'all' || place.analysis.mood === mood);
    if (sort === 'distance') return [...base].sort((a, b) => a.distanceKm - b.distanceKm);
    if (sort === 'score') return [...base].sort((a, b) => b.analysis.score - a.analysis.score);
    return [...base].sort((a, b) => (b.analysis.score - a.analysis.score) || (a.distanceKm - b.distanceKm));
  }, [places, mood, sort]);

  const planPlaces = useMemo(() => selectedForPlan.map(id => places.find(place => place.id === id)).filter(Boolean) as VybePlace[], [selectedForPlan, places]);
  const totalBudget = planPlaces.reduce((sum, place) => sum + (place.analysis.category === 'outdoors' || place.analysis.category === 'culture' ? 0 : 10), 0);
  const center: [number, number] = active ? [active.lat, active.lng] : [city.lat, city.lng];

  const toggleSaved = (id: string) => setSaved(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  const togglePlan = (id: string) => setSelectedForPlan(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const chooseCity = (nextCity: typeof city) => {
    setCity(nextCity);
    setQuery('');
    setCategory('all');
    void runDiscovery(nextCity, '', 'all');
  };

  const locateMe = () => {
    if (!navigator.geolocation) return notify('Browser geolocation is unavailable.');
    navigator.geolocation.getCurrentPosition(
      position => {
        const next = { id: 'current', label: 'Your location', emoji: '📍', lat: position.coords.latitude, lng: position.coords.longitude };
        setCity(next);
        void runDiscovery(next, query, category);
      },
      () => notify('Location permission was not granted. Choose a city instead.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 },
    );
  };

  const runSearch = (event: React.FormEvent) => {
    event.preventDefault();
    void runDiscovery(city, query, category);
  };

  const buildNight = () => {
    if (!selectedForPlan.length) setSelectedForPlan(filtered.slice(0, 4).map(place => place.id));
    setTab('plan');
  };

  const savePlan = () => {
    const chosen = selectedForPlan.length ? selectedForPlan : filtered.slice(0, 4).map(place => place.id);
    if (!chosen.length) return notify('Choose at least one place first.');
    const plan: SavedPlan = { id: `plan-${Date.now()}`, title: `${city.label} Night`, mood: mood === 'all' ? (places[0]?.analysis.mood ?? 'explore') : mood, placeIds: chosen, budget: 10 * chosen.length, createdAt: new Date().toISOString() };
    setPlans(prev => [plan, ...prev]);
    setSelectedForPlan(chosen);
    notify('Plan saved locally.');
  };

  const sharePlan = async () => {
    const chosen = selectedForPlan.length ? selectedForPlan : filtered.slice(0, 4).map(place => place.id);
    const planData = { title: `${city.label} Night`, mood: mood === 'all' ? 'explore' : mood, placeIds: chosen, budget: 10 * chosen.length };
    const url = `${window.location.origin}${window.location.pathname}?share=${encodeURIComponent(encodeShare(planData))}`;
    try {
      await navigator.clipboard.writeText(url);
      notify('Share link copied.');
    } catch {
      window.prompt('Copy your VYBE outing link:', url);
    }
  };

  const goMaps = (place: VybePlace) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=walking`, '_blank', 'noopener,noreferrer');
  };

  const saveName = () => {
    const value = profileName.trim();
    if (!value) return;
    localStorage.setItem('vybe_next_name', value);
    setNameOpen(false);
    notify(`Welcome ${value}.`);
  };

  const categoryCount = (id: VybeCategory) => places.filter(place => place.analysis.category === id).length;

  return (
    <div className="vn-app">
      <div className="vn-noise" />
      <header className="vn-header">
        <button className="vn-brand" onClick={() => { setTab('explore'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="VYBE home">
          <span className="vn-brand-mark">V</span>
          <span><strong>VYBE</strong><small>GO OUT. FIND YOUR VIBE.</small></span>
        </button>
        <form className="vn-search" onSubmit={runSearch}>
          <Search size={18} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search places, vibes, gaming, food…" />
          <button type="submit"><span>Search</span><ArrowRight size={16} /></button>
        </form>
        <div className="vn-head-actions">
          <button className="vn-location" onClick={locateMe}><LocateFixed size={17} /> <span>{city.label}</span></button>
          <button className="vn-avatar" onClick={() => setNameOpen(value => !value)}><CircleUserRound size={20} /></button>
        </div>
        {nameOpen && <div className="vn-name-pop"><input value={profileName} onChange={event => setProfileName(event.target.value)} placeholder="Your name" /><button onClick={saveName}>Save</button></div>}
      </header>

      <main>
        <section className="vn-hero">
          <div className="vn-hero-copy">
            <div className="vn-kicker"><Sparkles size={14} /> REAL-TIME DISCOVERY • ANALYZED BEFORE YOU SEE IT</div>
            <h1>Find the <em>right place.</em><br />Not just <span>a place.</span></h1>
            <p>VYBE scans the city, pulls the available places, analyzes each one, then sends the same clean dataset to Explore and Map.</p>
            <div className="vn-hero-actions">
              <button className="vn-primary" onClick={buildNight}><Zap size={18} /> Build My Night</button>
              <button className="vn-secondary" onClick={() => setTab('map')}><Compass size={18} /> Open Map</button>
            </div>
          </div>
          <div className="vn-hero-card">
            <div className="vn-orbit vn-orbit-one" /><div className="vn-orbit vn-orbit-two" />
            <div className="vn-stat-big">{places.length}</div><div className="vn-stat-label">DISCOVERED & ANALYZED</div>
            <div className="vn-stat-grid"><div><b>{places.filter(p => p.source === 'OpenStreetMap').length}</b><span>Open data</span></div><div><b>{new Set(places.map(p => p.analysis.category)).size}</b><span>Categories</span></div><div><b>{radius} km</b><span>Radar radius</span></div></div>
          </div>
        </section>

        <section className="vn-city-strip">
          <div className="vn-city-title"><MapPin size={17} /> Discover in</div>
          <div className="vn-city-list">
            {CITIES.map(item => <button key={item.id} className={city.id === item.id ? 'active' : ''} onClick={() => chooseCity(item)}><span>{item.emoji}</span>{item.label}</button>)}
          </div>
        </section>

        <section className="vn-layout">
          <aside className={`vn-sidebar ${mobileFilters ? 'open' : ''}`}>
            <div className="vn-side-head"><div><b>VYBE MATCHER</b><span>Tell me what you need.</span></div><button className="vn-icon-btn mobile-only" onClick={() => setMobileFilters(false)}><X size={17} /></button></div>
            <div className="vn-side-block"><label>WHERE</label><div className="vn-select"><MapPin size={16} /><select value={city.id} onChange={event => { const next = CITIES.find(item => item.id === event.target.value); if (next) chooseCity(next); }}><option value="current">Your location</option>{CITIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown size={14} /></div></div>
            <div className="vn-side-block"><label>PLACE TYPE</label><div className="vn-chip-grid">{CATEGORIES.map(item => <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => { setCategory(category === item.id ? 'all' : item.id); void runDiscovery(city, query, category === item.id ? 'all' : item.id); }}><span>{item.emoji}</span>{item.label}<small>{categoryCount(item.id)}</small></button>)}</div></div>
            <div className="vn-side-block"><label>MOOD</label><div className="vn-mood-row">{MOODS.map(item => <button key={item.id} className={mood === item.id ? 'active' : ''} onClick={() => setMood(mood === item.id ? 'all' : item.id)}>{item.emoji} {item.label}</button>)}</div></div>
            <div className="vn-side-block"><label>RADAR <b>{radius} km</b></label><input type="range" min="2" max="12" value={radius} onChange={event => setRadius(Number(event.target.value))} /><div className="vn-range-meta"><span>2 km</span><span>12 km</span></div></div>
            <div className="vn-side-block"><label>SORT</label><div className="vn-segment"><button className={sort === 'smart' ? 'active' : ''} onClick={() => setSort('smart')}>Smart</button><button className={sort === 'score' ? 'active' : ''} onClick={() => setSort('score')}>Score</button><button className={sort === 'distance' ? 'active' : ''} onClick={() => setSort('distance')}>Near</button></div></div>
            <button className="vn-run" onClick={() => void runDiscovery()} disabled={loading}>{loading ? 'Scanning city…' : 'Scan city again'} <Zap size={16} /></button>
          </aside>

          <section className="vn-content">
            <div className="vn-mobile-bar"><button onClick={() => setMobileFilters(true)}><Compass size={16} /> Filters</button><span>{filtered.length} results</span><button onClick={() => setTab('map')}><MapPin size={16} /> Map</button></div>
            <div className="vn-content-head"><div><div className="vn-kicker soft"><span className="vn-live-dot" /> {loading ? 'SCANNING' : getCityLabel(city.lat, city.lng).toUpperCase()} DISCOVERY RADAR</div><h2>{category === 'all' ? 'Everything nearby' : `${CATEGORY_LABEL[category]} nearby`}</h2><p>{filtered.length} analyzed spots • same data powers Explore + Map</p></div><div className="vn-tabs"><button className={tab === 'explore' ? 'active' : ''} onClick={() => setTab('explore')}>Explore</button><button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>Map</button><button className={tab === 'plan' ? 'active' : ''} onClick={() => setTab('plan')}>Plan <span>{selectedForPlan.length}</span></button></div></div>

            {error && <div className="vn-error"><b>Discovery failed.</b><span>{error}</span><button onClick={() => void runDiscovery()}>Retry</button></div>}

            {tab === 'explore' && <>
              <div className="vn-analysis-banner"><div className="vn-analysis-icon"><Sparkles size={18} /></div><div><b>VYBE ANALYZER ACTIVE</b><span>Every result below has category, mood, confidence and a smart score before display.</span></div><div className="vn-analysis-count">{filtered.length}<small>READY</small></div></div>
              {loading ? <div className="vn-loading"><div className="vn-spinner" /><b>Scanning Béjaïa and nearby places…</b><span>Collecting records and analyzing every result.</span></div> : <div className="vn-grid">{filtered.map(place => {
                const savedPlace = saved.includes(place.id);
                const inPlan = selectedForPlan.includes(place.id);
                return <article key={place.id} className={`vn-card ${active?.id === place.id ? 'selected' : ''}`} onClick={() => setActive(place)}>
                  <div className="vn-card-top"><span className="vn-card-emoji">{CATEGORIES.find(item => item.id === place.analysis.category)?.emoji ?? '📍'}</span><button onClick={event => { event.stopPropagation(); toggleSaved(place.id); }} className={savedPlace ? 'saved' : ''} aria-label={savedPlace ? 'Remove saved' : 'Save place'}><Bookmark size={17} fill={savedPlace ? 'currentColor' : 'none'} /></button></div>
                  <div className="vn-card-score"><b>{place.analysis.score}</b><span>VYBE</span><em>{Math.round(place.analysis.confidence * 100)}%</em></div>
                  <h3>{place.name}</h3><p>{place.address || 'Address available from map data'}</p>
                  <div className="vn-tags">{place.analysis.labels.slice(0, 3).map(label => <span key={label}>{label}</span>)}</div>
                  <div className="vn-card-foot"><span>{place.distanceKm.toFixed(1)} km</span><span>{CATEGORY_LABEL[place.analysis.category]}</span><button onClick={event => { event.stopPropagation(); togglePlan(place.id); }}>{inPlan ? <Check size={15} /> : <Plus size={15} />} Plan</button></div>
                </article>;
              })}</div>}
            </>}

            {tab === 'map' && <div className="vn-map-wrap"><MapContainer center={center} zoom={14} scrollWheelZoom className="vn-map"><MapViewport center={center} zoom={14} /><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />{filtered.map(place => <Marker key={place.id} position={[place.lat, place.lng]} icon={markerIcon(place, active?.id === place.id)} eventHandlers={{ click: () => setActive(place) }}><Popup><div className="vn-popup"><b>{place.name}</b><span>{CATEGORY_LABEL[place.analysis.category]} • {place.analysis.score} VYBE</span><small>{place.address}</small><button onClick={() => goMaps(place)}><Navigation size={13} /> Directions</button></div></Popup></Marker>)}</MapContainer><div className="vn-map-badge"><Sparkles size={15} /> {filtered.length} spots active on map</div>{active && <div className="vn-map-card" onClick={() => setTab('explore')}><span>{CATEGORIES.find(item => item.id === active.analysis.category)?.emoji ?? '📍'}</span><div><b>{active.name}</b><small>{active.distanceKm.toFixed(1)} km • {active.analysis.score} VYBE</small></div><ArrowRight size={17} /></div>}</div>}

            {tab === 'plan' && <div className="vn-plan-page"><div className="vn-plan-hero"><div><div className="vn-kicker soft"><CalendarDays size={14} /> NIGHT BUILDER</div><h2>{city.label} Night</h2><p>Turn your analyzed spots into a real outing.</p></div><div className="vn-plan-actions"><button onClick={savePlan}><Bookmark size={16} /> Save</button><button onClick={sharePlan}><Share2 size={16} /> Share</button></div></div><div className="vn-plan-summary"><div><b>{planPlaces.length}</b><span>stops</span></div><div><b>{totalBudget} €*</b><span>rough outing budget</span></div><div><b>{Math.max(planPlaces.length * 45, 0)} min</b><span>suggested time</span></div></div><div className="vn-plan-list">{(planPlaces.length ? planPlaces : filtered.slice(0, 4)).map((place, index) => <div className="vn-plan-item" key={place.id}><div className="vn-plan-order">{index + 1}</div><div className="vn-plan-main"><b>{place.name}</b><span>{CATEGORY_LABEL[place.analysis.category]} • {place.analysis.mood} • {place.distanceKm.toFixed(1)} km</span><small>{place.analysis.reasons[0]}</small></div><div className="vn-plan-item-actions"><button onClick={() => goMaps(place)}><Navigation size={15} /></button><button onClick={() => togglePlan(place.id)}>{selectedForPlan.includes(place.id) ? <Check size={15} /> : <Plus size={15} />}</button></div></div>)}{!planPlaces.length && !filtered.length && <div className="vn-empty"><span>🗺️</span><b>Nothing to plan yet.</b><small>Run a discovery scan first.</small></div>}</div><div className="vn-note">* This is a planning estimate generated from place categories, not a claimed venue price.</div></div>}
          </section>
        </section>

        <section className="vn-bottom-grid">
          <div className="vn-story-card"><div className="vn-kicker"><Zap size={14} /> WHAT VYBE DOES</div><h3>Discover first.<br /><em>Understand second.</em></h3><p>No fake 20-result wall. VYBE aggregates provider data, analyzes every place, deduplicates it, and exposes the whole analyzed set.</p><button onClick={() => setTab('map')}>See the full radar <ArrowRight size={15} /></button></div>
          <div className="vn-mini-card"><b>SAVED</b><strong>{saved.length}</strong><span>places waiting for you</span><button onClick={() => setTab('explore')}>Explore again</button></div>
          <div className="vn-mini-card accent"><b>PLANS</b><strong>{plans.length}</strong><span>outings saved locally</span><button onClick={() => setTab('plan')}>Open planner</button></div>
        </section>
      </main>

      {active && <div className="vn-detail"><div className="vn-detail-inner"><button className="vn-detail-close" onClick={() => setActive(null)}><X size={18} /></button><div className="vn-detail-top"><div className="vn-detail-icon">{CATEGORIES.find(item => item.id === active.analysis.category)?.emoji ?? '📍'}</div><div><div className="vn-kicker soft">ANALYZED PLACE</div><h3>{active.name}</h3><p>{active.address}</p></div><div className="vn-detail-score"><b>{active.analysis.score}</b><span>VYBE</span></div></div><div className="vn-detail-grid"><div><label>CATEGORY</label><b>{CATEGORY_LABEL[active.analysis.category]}</b></div><div><label>MOOD</label><b>{active.analysis.mood}</b></div><div><label>CONFIDENCE</label><b>{Math.round(active.analysis.confidence * 100)}%</b></div><div><label>DISTANCE</label><b>{active.distanceKm.toFixed(1)} km</b></div></div><div className="vn-reason"><Sparkles size={17} /><div><b>Why VYBE classified it</b><span>{active.analysis.reasons.join(' ')}</span></div></div><div className="vn-detail-actions"><button className="vn-primary" onClick={() => togglePlan(active.id)}>{selectedForPlan.includes(active.id) ? <Check size={17} /> : <Plus size={17} />} {selectedForPlan.includes(active.id) ? 'In my plan' : 'Add to plan'}</button><button className="vn-secondary" onClick={() => goMaps(active)}><Navigation size={17} /> Directions</button></div></div></div>}
      {toast && <div className="vn-toast"><Check size={16} /> {toast}</div>}
      <footer className="vn-footer"><span>VYBE • REAL PLACES • SMART PLANNING</span><span>Built for Algeria first.</span></footer>
    </div>
  );
}

export default App;
