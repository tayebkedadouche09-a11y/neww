import { CategoryType, VybeCategory } from '../types';

export interface CategoryInfo {
  id: CategoryType;
  /** Canonical intent used by provider search/classification. */
  canonicalId?: VybeCategory;
  name: string;
  emoji: string;
  description: string;
  iconName: string;
  badgeColor: string;
}

export const INITIAL_CATEGORIES: CategoryInfo[] = [
  { id:'food-drink', canonicalId:'restaurant', name:'Food & Drinks', emoji:'🍜', description:'Restaurants, street food and places to eat', iconName:'UtensilsCrossed', badgeColor:'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id:'nightlife', canonicalId:'nightlife', name:'Nightlife & Bars', emoji:'🍸', description:'Bars, clubs, karaoke and live-music venues', iconName:'Sparkles', badgeColor:'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id:'arcade-gaming', canonicalId:'games', name:'Games', emoji:'🕹️', description:'Arcades, game rooms, kids entertainment and recreation', iconName:'Gamepad2', badgeColor:'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { id:'arts-culture', canonicalId:'arts-culture', name:'Arts & Culture', emoji:'🏛️', description:'Museums, galleries, theaters and cultural spaces', iconName:'Palette', badgeColor:'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { id:'outdoors-nature', canonicalId:'outdoors', name:'Outdoors & Parks', emoji:'🌲', description:'Parks, nature areas, hikes, beaches and gardens', iconName:'Trees', badgeColor:'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id:'entertainment', canonicalId:'entertainment', name:'Entertainment', emoji:'🎪', description:'Cinemas, family attractions, events and fun activities', iconName:'Film', badgeColor:'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  { id:'hidden-gems', canonicalId:'tourist', name:'Tourist & Hidden Gems', emoji:'💎', description:'Landmarks, attractions and discovery spots', iconName:'Compass', badgeColor:'bg-lime-500/20 text-lime-400 border-lime-500/30' },
  { id:'chill-spots', canonicalId:'wellness', name:'Chill & Wellness', emoji:'☕', description:'Cafes, spas, wellness and relaxing places', iconName:'Coffee', badgeColor:'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  { id:'shopping-vintage', canonicalId:'shopping', name:'Shopping & Vintage', emoji:'🕶️', description:'Malls, stores, markets and vintage shopping', iconName:'ShoppingBag', badgeColor:'bg-orange-500/20 text-orange-400 border-orange-500/30' }
];
