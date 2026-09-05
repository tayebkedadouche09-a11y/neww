import { Place } from '../../types';

/**
 * Map marker glyph for a place, derived from the canonical provider-backed
 * category on the Place result — never from a second name/type classification.
 * Name signals are used ONLY to pick a glyph inside the canonical 'worship'
 * category (mosque vs church vs synagogue vs temple), which collapses several
 * Google/OSM types into one VYBE category.
 */
export function getPlaceCategoryEmoji(place: Place): string {
  switch (place.canonicalCategory) {
    case 'games': return '🎮';
    case 'cinema': return '🎬';
    case 'restaurant': return '🍽️';
    case 'cafe': return '☕';
    case 'hotel': return '🏨';
    case 'library': return '📚';
    case 'worship': {
      const text = `${place.name} ${place.tags.join(' ')}`.toLowerCase();
      if (/church|eglise|église|كنيسة/.test(text)) return '⛪';
      if (/synagogue|كنيس يهود/.test(text)) return '🕍';
      if (/temple|hindu|hindou|معبد/.test(text)) return '🛕';
      return '🕌';
    }
    case 'gym': return '🏋️';
    case 'park':
    case 'outdoors': return '🌳';
    case 'shopping': return '🛍️';
    case 'nightlife': return '🎵';
    case 'family-kids': return '👨‍👩‍👧‍👦';
    case 'tourist': return '🏛️';
    case 'arts-culture': return '🎭';
    case 'wellness': return '🧘';
    case 'entertainment': return '🎡';
    default: return '📍';
  }
}
