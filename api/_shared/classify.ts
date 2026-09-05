type CategoryType =
  | 'food-drink'
  | 'nightlife'
  | 'arts-culture'
  | 'outdoors-nature'
  | 'entertainment'
  | 'arcade-gaming'
  | 'hidden-gems'
  | 'chill-spots'
  | 'shopping-vintage';

type MoodType =
  | 'energetic' | 'chill' | 'romantic' | 'creative' | 'party' | 'curious'
  | 'hungry' | 'outdoor' | 'gaming' | 'music' | 'explore' | 'lazy';

type VybeCategory =
  | 'restaurant' | 'cafe' | 'games' | 'cinema' | 'park' | 'gym' | 'shopping'
  | 'nightlife' | 'family-kids' | 'tourist' | 'arts-culture' | 'outdoors'
  | 'wellness' | 'hotel' | 'library' | 'worship' | 'entertainment';

type Definition = { canonical: VybeCategory; legacy: CategoryType; mood: MoodType; types: string[]; signals: string[] };

const DEFINITIONS: Definition[] = [
  { canonical: 'games', legacy: 'arcade-gaming', mood: 'gaming', types: ['video_arcade','amusement_center','indoor_playground','bowling_alley','miniature_golf_course','paintball_center','go_karting_venue','internet_cafe','adventure_sports_center'], signals: ['arcade','gaming','game','game room','playstation','xbox','bowling','billiards','billard','cyber'] },
  { canonical: 'cinema', legacy: 'entertainment', mood: 'chill', types: ['movie_theater'], signals: ['cinema','cinema','movie theater','film'] },
  { canonical: 'restaurant', legacy: 'food-drink', mood: 'hungry', types: ['restaurant'], signals: ['restaurant','resto','pizzeria','pizza','burger','tacos','grill','snack'] },
  { canonical: 'cafe', legacy: 'food-drink', mood: 'chill', types: ['cafe','coffee_shop'], signals: ['cafe','café','coffee','coffee shop','tea room','salon de thé'] },
  { canonical: 'nightlife', legacy: 'nightlife', mood: 'party', types: ['bar','night_club','cocktail_bar','karaoke','live_music_venue'], signals: ['bar','pub','club','nightclub','karaoke','lounge','cocktail'] },
  { canonical: 'gym', legacy: 'outdoors-nature', mood: 'energetic', types: ['gym','sports_complex','sports_club'], signals: ['gym','fitness','sports complex','sports club'] },
  { canonical: 'park', legacy: 'outdoors-nature', mood: 'outdoor', types: ['park','city_park','state_park','national_park'], signals: ['park','parc'] },
  { canonical: 'family-kids', legacy: 'entertainment', mood: 'energetic', types: ['playground','indoor_playground','amusement_center','amusement_park','water_park','zoo','aquarium','childrens_camp'], signals: ['kids','children','family','playground','amusement park','zoo','aquarium'] },
  { canonical: 'shopping', legacy: 'shopping-vintage', mood: 'explore', types: ['shopping_mall','department_store','store','clothing_store','book_store','thrift_store','flea_market','toy_store','gift_shop'], signals: ['shopping','shop','store','mall','market','magasin','boutique','retail'] },
  { canonical: 'tourist', legacy: 'hidden-gems', mood: 'explore', types: ['tourist_attraction','monument','observation_deck','cultural_landmark','historical_place','historical_landmark','castle','visitor_center','plaza'], signals: ['tourist','tourism','attraction','monument','landmark','historical','castle','sightseeing'] },
  { canonical: 'arts-culture', legacy: 'arts-culture', mood: 'curious', types: ['museum','art_gallery','art_museum','performing_arts_theater','cultural_center','art_studio'], signals: ['museum','musée','gallery','galerie','theatre','theater','culture','cultural','art'] },
  { canonical: 'outdoors', legacy: 'outdoors-nature', mood: 'outdoor', types: ['hiking_area','beach','garden','botanical_garden','campground','nature_preserve','wildlife_park','wildlife_refuge','scenic_spot','mountain_peak','lake','river','woods'], signals: ['outdoor','nature','hiking','beach','plage','garden','jardin','camping','scenic spot','mountain','lake','river'] },
  { canonical: 'wellness', legacy: 'chill-spots', mood: 'lazy', types: ['spa','wellness_center','massage','massage_spa','yoga_studio','sauna'], signals: ['spa','wellness','relax','massage','yoga','sauna'] },
  { canonical: 'hotel', legacy: 'chill-spots', mood: 'chill', types: ['hotel','lodging','hostel','guest_house','motel','resort_hotel'], signals: ['hotel','hôtel','hostel','lodging','resort','guest house','motel'] },
  { canonical: 'library', legacy: 'arts-culture', mood: 'curious', types: ['library'], signals: ['library','bibliothèque','bibliotheque'] },
  { canonical: 'worship', legacy: 'arts-culture', mood: 'curious', types: ['mosque','church','hindu_temple','synagogue'], signals: ['mosque','mosquée','masjid','مسجد','church','église','eglise','temple','synagogue'] },
  { canonical: 'entertainment', legacy: 'entertainment', mood: 'energetic', types: ['amphitheatre','auditorium','comedy_club','concert_hall','event_venue','planetarium'], signals: ['entertainment','fun','activity','activities','amusement','events'] },
];

function normalize(value?: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function token(value?: string): string {
  return normalize(value).replace(/ /g, '_');
}

export function classifyProviderPlace(
  providerTypes: string[] = [],
  providerPrimaryType?: string,
  name?: string,
): { canonicalCategory: VybeCategory; legacyCategory: CategoryType; mood: MoodType; confidence: number } {
  const types = [...new Set(providerTypes.filter(Boolean).map(token))];
  const primary = token(providerPrimaryType);

  const exactPrimary = DEFINITIONS.find(d => d.types.some(t => token(t) === primary));
  if (exactPrimary) return { canonicalCategory: exactPrimary.canonical, legacyCategory: exactPrimary.legacy, mood: exactPrimary.mood, confidence: 0.99 };

  const byType = DEFINITIONS.find(d => types.some(t => d.types.some(x => token(x) === t)));
  if (byType) return { canonicalCategory: byType.canonical, legacyCategory: byType.legacy, mood: byType.mood, confidence: 0.94 };

  const n = normalize(name);
  const byName = DEFINITIONS.find(d => d.signals.some(signal => n.includes(normalize(signal))));
  if (byName) return { canonicalCategory: byName.canonical, legacyCategory: byName.legacy, mood: byName.mood, confidence: 0.78 };

  return { canonicalCategory: 'entertainment', legacyCategory: 'entertainment', mood: 'explore', confidence: 0.35 };
}
