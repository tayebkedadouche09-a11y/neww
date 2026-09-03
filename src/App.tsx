import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Bookmark, BookmarkCheck, ClipboardList, Compass, Heart, LocateFixed, Map as MapIcon, Navigation, Plus, Route, Search, Share2, SlidersHorizontal, Sparkles, ThumbsUp, Trash2, X } from 'lucide-react';
import { CITIES, discover, type Category, type City, type Mood, type Place } from './engine';
import PlacePhoto from './PlacePhoto';
import { googlePhotosEnabled } from './googlePlaces';

const cats: Array<{ id: Category; label: string; icon: string }> = [
  ['all', 'Tout', '✦'], ['gaming', 'Gaming', '🎮'], ['food', 'Food', '🍔'], ['cafe', 'Cafés', '☕'],
  ['nightlife', 'Nightlife', '🌙'], ['outdoors', 'Outdoor', '🌿'], ['culture', 'Culture', '🎭'], ['shopping', 'Shopping', '🛍️'],
  ['sports', 'Sport', '⚡'], ['family', 'Famille', '👨‍👩‍👧'], ['wellness', 'Wellness', '🧘'], ['stay', 'Stay', '🛏️'], ['services', 'Services', '🧰'],
].map(([id, label, icon]) => ({ id: id as Category, label, icon }));

const moods: Array<{ id: Mood; label: string }> = [
  ['all', 'Tous'], ['gaming', 'Gaming'], ['chill', 'Chill'], ['party', 'Party'], ['hungry', 'Hungry'],
  ['curious', 'Curious'], ['outdoor', 'Outdoor'], ['energetic', 'Énergique'], ['romantic', 'Romantic'], ['creative', 'Créatif'], ['explore', 'Explorer'],
].map(([id, label]) => ({ id: id as Mood, label }));

function Fly({ city }: { city: City }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([city.lat, city.lng], 13, { duration: 0.6 });
  }, [city, map]);
  return null;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable or full. VYBE remains usable in-memory.
  }
}

function isCity(value: unknown): value is City {
  if (!value || typeof value !== 'object') return false;
  const city = value as Partial<City>;
  return typeof city.id === 'string' && typeof city.label === 'string' && Number.isFinite(city.lat) && Number.isFinite(city.lng);
}

function isPlaceSnapshot(value: unknown): value is Place {
  if (!value || typeof value !== 'object') return false;
  const place = value as Partial<Place>;
  return Boolean(
    typeof place.id === 'string' &&
    typeof place.name === 'string' &&
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lng) &&
    typeof place.address === 'string' &&
    typeof place.category === 'string' &&
    typeof place.mood === 'string' &&
    Number.isFinite(place.score) &&
    Number.isFinite(place.confidence)
  );
}

function readPlaceArray(key: string): Place[] {
  const value = readJson<unknown>(key, []);
  return Array.isArray(value) ? value.filter(isPlaceSnapshot) : [];
}

function readStringArray(key: string): string[] {
  const value = readJson<unknown>(key, []);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function route(place: Place) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`, '_blank', 'noopener,noreferrer');
}

function togglePlace(current: Place[], place: Place) {
  return current.some(item => item.id === place.id)
    ? current.filter(item => item.id !== place.id)
    : [...current, place];
}

function encodePayload(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function decodePayload(value: string): unknown {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function Card({ place, saved, planned, liked, onOpen, onSave, onPlan, onLike, notify }: {
  place: Place;
  saved: boolean;
  planned: boolean;
  liked: boolean;
  onOpen: () => void;
  onSave: () => void;
  onPlan: () => void;
  onLike: () => void;
  notify: (message: string) => void;
}) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button,a,input,select,textarea')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen();
    }
  };

  return <article className="card" onClick={onOpen} role="button" tabIndex={0} onKeyDown={handleKeyDown}>
    <div className="card-media">
      <PlacePhoto place={place}/>
      <div className="score overlay"><span>VYBE</span><b>{Math.round(place.score)}</b></div>
    </div>
    <div className="card-body">
      <div className="tagline"><span>{place.category}</span><span>•</span><span>{place.mood}</span><span>•</span><span>{place.distanceKm.toFixed(1)} km</span></div>
      <h3>{place.name}</h3>
      <p>{place.address}</p>
      <div className="meta-row">
        {place.rating ? <span>★ {place.rating.toFixed(1)}{place.reviews ? ` · ${place.reviews}` : ''}</span> : <span>Pas de note fiable</span>}
        <span>{Math.round(place.confidence * 100)}% analyse</span>
      </div>
      <small>{place.reason}</small>
      <div className="actions">
        <button type="button" aria-pressed={liked} onClick={event => { event.stopPropagation(); onLike(); notify(liked ? 'Like retiré' : 'Liked'); }}>
          {liked ? <ThumbsUp size={17} fill="currentColor"/> : <ThumbsUp size={17}/>} {liked ? 'Liked' : 'Like'}
        </button>
        <button type="button" aria-pressed={saved} onClick={event => { event.stopPropagation(); onSave(); notify(saved ? 'Retiré des favoris' : 'Ajouté aux favoris'); }}>
          {saved ? <BookmarkCheck size={17}/> : <Bookmark size={17}/>} {saved ? 'Saved' : 'Save'}
        </button>
        <button type="button" aria-pressed={planned} onClick={event => { event.stopPropagation(); onPlan(); notify(planned ? 'Retiré du plan' : 'Ajouté au plan'); }}>
          <Plus size={17}/>{planned ? 'Plan ✓' : 'Plan'}
        </button>
        <button type="button" onClick={event => { event.stopPropagation(); route(place); }}><Route size={17}/>Route</button>
      </div>
    </div>
  </article>;
}

function Empty({ search, reset }: { search: string; reset: () => void }) {
  return <div className="empty">
    <Search size={40}/>
    <h3>{search ? 'Aucun résultat' : 'Aucun lieu dans cette zone'}</h3>
    <p>{search ? `Rien ne correspond à « ${search} ».` : 'Essaie une autre catégorie ou augmente le rayon.'}</p>
    <button type="button" className="primary" onClick={reset}>Réinitialiser</button>
  </div>;
}

export default function App() {
  const storedCity = readJson<unknown>('vybe_city', CITIES[0]);
  const [tab, setTab] = useState<'explore' | 'map' | 'plan' | 'saved'>('explore');
  const [city, setCity] = useState<City>(isCity(storedCity) ? storedCity : CITIES[0]);
  const [radius, setRadius] = useState(8);
  const [category, setCategory] = useState<Category>('all');
  const [mood, setMood] = useState<Mood>('all');
  const [search, setSearch] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<Place[]>(() => readPlaceArray('vybe_saved_places'));
  const [planPlaces, setPlanPlaces] = useState<Place[]>(() => readPlaceArray('vybe_plan_places'));
  const [likedIds, setLikedIds] = useState<string[]>(() => readStringArray('vybe_likes'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Place | null>(null);
  const [toast, setToast] = useState('');
  const loadSequence = useRef(0);
  const toastTimer = useRef<number | null>(null);
  const sharedPlan = useMemo(() => new URLSearchParams(window.location.search).get('plan'), []);

  async function load() {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError('');
    try {
      const result = await discover(city, radius, search, category);
      if (sequence !== loadSequence.current) return;
      setPlaces(result);
    } catch (cause) {
      if (sequence !== loadSequence.current) return;
      setPlaces([]);
      setError(cause instanceof Error ? cause.message : 'Discovery indisponible');
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (sharedPlan) return;
    void load();
    // The discovery request is intentionally keyed to city/radius/category.
    // Search stays explicit through Enter / Chercher to avoid request storms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.id, city.lat, city.lng, radius, category, sharedPlan]);

  useEffect(() => writeJson('vybe_saved_places', savedPlaces), [savedPlaces]);
  useEffect(() => writeJson('vybe_plan_places', planPlaces), [planPlaces]);
  useEffect(() => writeJson('vybe_likes', likedIds), [likedIds]);
  useEffect(() => writeJson('vybe_city', city), [city]);

  useEffect(() => {
    if (!sharedPlan) return;
    try {
      const decoded = decodePayload(sharedPlan) as { city?: string; places?: unknown };
      const sharedPlaces = Array.isArray(decoded.places) ? decoded.places.filter(isPlaceSnapshot) : [];
      if (!sharedPlaces.length) throw new Error('Plan vide ou invalide');
      const sharedCity = CITIES.find(item => item.id === decoded.city);
      if (sharedCity) setCity(sharedCity);
      ++loadSequence.current;
      setPlanPlaces(sharedPlaces);
      setPlaces(sharedPlaces);
      setTab('plan');
      setError('');
    } catch {
      setError('Lien de plan invalide');
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedPlan]);

  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);

  const visible = useMemo(() => places.filter(place => mood === 'all' || place.mood === mood), [places, mood]);
  const mapPlaces = useMemo(() => visible.slice(0, 400), [visible]);
  const hiddenMapCount = Math.max(0, visible.length - mapPlaces.length);

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2200);
  }

  async function share() {
    const payload = encodePayload({ city: city.id, places: planPlaces });
    const url = `${location.origin}${location.pathname}?plan=${encodeURIComponent(payload)}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        notify('Plan copié');
        return;
      }
      throw new Error('Clipboard unavailable');
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
        notify('Plan copié');
      } catch {
        notify(`Lien: ${url}`);
      }
    }
  }

  function resetFilters() {
    setSearch('');
    setCategory('all');
    setMood('all');
    setRadius(8);
  }

  function locate() {
    if (!navigator.geolocation) {
      setError('La géolocalisation n’est pas disponible dans ce navigateur.');
      return;
    }
    setError('');
    navigator.geolocation.getCurrentPosition(
      position => {
        ++loadSequence.current;
        setCity({ id: 'me', label: 'Ma position', lat: position.coords.latitude, lng: position.coords.longitude });
        setPlaces([]);
      },
      () => setError('Position refusée ou indisponible.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 }
    );
  }

  const save = (place: Place) => setSavedPlaces(current => togglePlace(current, place));
  const plan = (place: Place) => setPlanPlaces(current => togglePlace(current, place));
  const like = (id: string) => setLikedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);

  return <div className="app">
    <header className="top">
      <div className="brand"><span className="mark">V</span><div><strong>VYBE</strong><small>DISCOVER YOUR NEXT MOVE</small></div></div>
      <div className="city-row">
        {CITIES.map(item => <button type="button" className={item.id === city.id ? 'city active' : 'city'} onClick={() => { ++loadSequence.current; setCity(item); setPlaces([]); }} key={item.id}>{item.label}</button>)}
      </div>
      <button type="button" className="loc" aria-label="Ma position" onClick={locate}><LocateFixed size={18}/></button>
    </header>

    <main>
      <section className="hero">
        <div>
          <span className="eyebrow"><Sparkles size={15}/>REAL-WORLD DISCOVERY</span>
          <h1>Qu’est-ce que<br/><em>tu fais</em> maintenant ?</h1>
          <p>VYBE découvre les lieux autour de toi, les analyse, les classe par vibe et les enrichit avec des photos Google quand elles sont disponibles.</p>
          <div className="integrations"><span className="source-pill">OpenStreetMap · découverte</span><span className={googlePhotosEnabled() ? 'source-pill live' : 'source-pill'}>{googlePhotosEnabled() ? 'Google Photos · actif' : 'Google Photos · clé à configurer'}</span></div>
        </div>
        <div className="hero-card"><Compass size={26}/><b>{loading ? 'Scanning…' : `${visible.length} places trouvées`}</b><span>jusqu’à {radius} km · {city.label}</span></div>
      </section>

      <section className="searchbar">
        <Search size={20}/>
        <input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void load(); }} placeholder="Rechercher un lieu, une marque, une activité…" aria-label="Rechercher un lieu"/>
        <select value={radius} onChange={event => setRadius(Number(event.target.value))} aria-label="Rayon de recherche">
          <option value={5}>5 km</option><option value={8}>8 km</option><option value={12}>12 km</option><option value={15}>15 km</option><option value={20}>20 km</option>
        </select>
        <button type="button" onClick={() => void load()} className="primary"><Search size={17}/>Chercher</button>
      </section>

      <div className="filter-head"><span><SlidersHorizontal size={16}/>Catégories</span><div className="chips">
        {cats.map(item => <button type="button" aria-pressed={category === item.id} className={category === item.id ? 'chip active' : 'chip'} onClick={() => setCategory(item.id)} key={item.id}>{item.icon} {item.label}</button>)}
      </div></div>
      <div className="filter-head"><span>MOOD</span><div className="chips">
        {moods.map(item => <button type="button" aria-pressed={mood === item.id} className={mood === item.id ? 'mini active' : 'mini'} onClick={() => setMood(item.id)} key={item.id}>{item.label}</button>)}
      </div></div>

      {error && <div className="error" role="alert"><X size={18}/><span>{error}</span><button type="button" onClick={() => void load()}>Réessayer</button></div>}

      {tab === 'explore' && <section className="results">
        {loading
          ? [1,2,3,4,5,6].map(item => <div className="skeleton" key={item}/>)
          : visible.length
            ? visible.map(place => <Card key={place.id} place={place} saved={savedPlaces.some(item => item.id === place.id)} planned={planPlaces.some(item => item.id === place.id)} liked={likedIds.includes(place.id)} onOpen={() => setSelected(place)} onSave={() => save(place)} onPlan={() => plan(place)} onLike={() => like(place.id)} notify={notify}/>)
            : <Empty search={search} reset={resetFilters}/>
        }
      </section>}

      {tab === 'saved' && <section className="results">
        {savedPlaces.length
          ? savedPlaces.map(place => <Card key={place.id} place={place} saved planned={planPlaces.some(item => item.id === place.id)} liked={likedIds.includes(place.id)} onOpen={() => setSelected(place)} onSave={() => save(place)} onPlan={() => plan(place)} onLike={() => like(place.id)} notify={notify}/>)
          : <div className="empty"><Heart size={40}/><h3>Pas encore de favoris</h3><p>Save les lieux qui te donnent envie.</p></div>
        }
      </section>}

      {tab === 'map' && <section className="map-wrap">
        <MapContainer center={[city.lat, city.lng]} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
          <Fly city={city}/>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          {mapPlaces.map(place => <CircleMarker key={place.id} center={[place.lat, place.lng]} radius={selected?.id === place.id ? 10 : 7} pathOptions={{ color: '#ccff00', fillColor: '#ccff00', fillOpacity: 0.9 }} eventHandlers={{ click: () => setSelected(place) }}>
            <Popup><b>{place.name}</b><br/>{place.category} · {place.distanceKm.toFixed(1)} km<br/><button type="button" onClick={() => route(place)}>Route</button></Popup>
          </CircleMarker>)}
        </MapContainer>
        <div className="map-count">{mapPlaces.length} markers · {city.label}{hiddenMapCount ? ` · +${hiddenMapCount} non affichés` : ''}</div>
      </section>}

      {tab === 'plan' && <section className="plan">
        <div className="plan-head"><div><span className="eyebrow"><Sparkles size={15}/>MY VYBE PLAN</span><h2>{city.label} — {planPlaces.length} stops</h2><p>Un parcours construit à partir des lieux sélectionnés.</p></div><div className="plan-buttons"><button type="button" onClick={() => void share()}><Share2 size={17}/>Partager</button><button type="button" onClick={() => { setPlanPlaces([]); notify('Plan vidé'); }}><Trash2 size={17}/>Vider</button></div></div>
        {planPlaces.length
          ? <div className="timeline">{planPlaces.map((place, index) => <div className="stop" key={place.id}><div className="num">{index + 1}</div><PlacePhoto place={place} compact/><div><span>{place.category} · {place.distanceKm.toFixed(1)} km</span><h3>{place.name}</h3><p>{place.address}</p></div><button type="button" aria-label={`Ouvrir les directions vers ${place.name}`} onClick={() => route(place)}><Navigation size={18}/></button></div>)}</div>
          : <div className="empty"><ClipboardList size={42}/><h3>Ton plan est vide</h3><p>Ajoute des lieux depuis Explore pour construire ta sortie.</p><button type="button" className="primary" onClick={() => setTab('explore')}>Explorer</button></div>
        }
      </section>}
    </main>

    <nav className="bottom" aria-label="Navigation principale">
      <button type="button" aria-pressed={tab === 'explore'} className={tab === 'explore' ? 'active' : ''} onClick={() => setTab('explore')}><Sparkles size={19}/>Explore</button>
      <button type="button" aria-pressed={tab === 'map'} className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}><MapIcon size={19}/>Map</button>
      <button type="button" aria-pressed={tab === 'plan'} className={tab === 'plan' ? 'active' : ''} onClick={() => setTab('plan')}><ClipboardList size={19}/>Plan <i>{planPlaces.length}</i></button>
      <button type="button" aria-pressed={tab === 'saved'} className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')}><Heart size={19}/>Saved <i>{savedPlaces.length}</i></button>
    </nav>

    {selected && <aside className="drawer" aria-label={`Détails de ${selected.name}`}>
      <button type="button" className="close" aria-label="Fermer les détails" onClick={() => setSelected(null)}><X/></button>
      <PlacePhoto place={selected}/>
      <span className="eyebrow">{selected.category} · {selected.mood}</span>
      <h2>{selected.name}</h2>
      <p>{selected.address}</p>
      <div className="metrics"><div><b>{Math.round(selected.score)}</b><span>VYBE score</span></div><div><b>{selected.distanceKm.toFixed(1)}</b><span>km</span></div><div><b>{Math.round(selected.confidence * 100)}%</b><span>confidence</span></div></div>
      <div className="analysis"><Sparkles size={18}/><div><b>Pourquoi ce lieu ?</b><p>{selected.reason}</p></div></div>
      <div className="drawer-links">{selected.website && <a href={selected.website} target="_blank" rel="noopener noreferrer">Site</a>}{selected.phone && <a href={`tel:${selected.phone}`}>Téléphone</a>}<a href={selected.osmUrl} target="_blank" rel="noopener noreferrer">OpenStreetMap</a></div>
      <div className="drawer-actions"><button type="button" aria-pressed={likedIds.includes(selected.id)} onClick={() => like(selected.id)}>{likedIds.includes(selected.id) ? <ThumbsUp size={18} fill="currentColor"/> : <ThumbsUp size={18}/>} {likedIds.includes(selected.id) ? 'Liked' : 'Like'}</button><button type="button" aria-pressed={savedPlaces.some(item => item.id === selected.id)} onClick={() => save(selected)}>{savedPlaces.some(item => item.id === selected.id) ? <BookmarkCheck size={18}/> : <Bookmark size={18}/>} {savedPlaces.some(item => item.id === selected.id) ? 'Saved' : 'Save'}</button><button type="button" aria-pressed={planPlaces.some(item => item.id === selected.id)} onClick={() => plan(selected)}><Plus size={18}/>Plan</button></div>
      <button type="button" className="primary wide" onClick={() => route(selected)}><Route size={18}/>Ouvrir les directions</button>
    </aside>}

    {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
  </div>;
}
