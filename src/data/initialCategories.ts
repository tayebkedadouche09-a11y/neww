import { CategoryType } from '../types';

export interface CategoryInfo {
  id: CategoryType;
  name: string;
  emoji: string;
  description: string;
  iconName: string;
  badgeColor: string;
}

export const INITIAL_CATEGORIES: CategoryInfo[] = [
  {
    id: 'food-drink',
    name: 'Food & Drinks',
    emoji: '🍜',
    description: 'Street food markets, specialty matcha bars, smashburgers and hidden cafes',
    iconName: 'UtensilsCrossed',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  },
  {
    id: 'nightlife',
    name: 'Nightlife & Bars',
    emoji: '🍸',
    description: 'Speakeasies, rooftop bars, neon taprooms and indie dance spots',
    iconName: 'Sparkles',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  },
  {
    id: 'arcade-gaming',
    name: 'Arcade & Gaming',
    emoji: '🕹️',
    description: 'Retro Japanese arcades, rhythm games, VR simulators and board game cafes',
    iconName: 'Gamepad2',
    badgeColor: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
  },
  {
    id: 'arts-culture',
    name: 'Arts & Culture',
    emoji: '🏛️',
    description: 'Immersive digital exhibits, ceramic studios, indie zine fairs and galleries',
    iconName: 'Palette',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
  },
  {
    id: 'outdoors-nature',
    name: 'Outdoors & Parks',
    emoji: '🌲',
    description: 'Panoramic viewpoints, rooftop green havens, waterfront docks and trails',
    iconName: 'Trees',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    emoji: '🎪',
    description: 'Indie cinemas, live standup clubs, escape chambers and bowling lounges',
    iconName: 'Film',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
  },
  {
    id: 'hidden-gems',
    name: 'Hidden Gems',
    emoji: '💎',
    description: 'Unmarked doorways, secret rooftop gardens, vinyl basements and speakeasies',
    iconName: 'Compass',
    badgeColor: 'bg-lime-500/20 text-lime-400 border-lime-500/30'
  },
  {
    id: 'chill-spots',
    name: 'Chill Spots',
    emoji: '☕',
    description: 'Ambient book sanctuaries, lo-fi tea dens, hammock spots and zen corners',
    iconName: 'Coffee',
    badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
  },
  {
    id: 'shopping-vintage',
    name: 'Vintage & Thrift',
    emoji: '🕶️',
    description: 'Y2K vintage warehouses, curated thrift markets, vinyl record vaults',
    iconName: 'ShoppingBag',
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  }
];

