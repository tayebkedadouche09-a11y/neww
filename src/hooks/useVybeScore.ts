import { Place, MoodType, PriceLevel, TimeDuration, CompanionType } from '../types';

interface ScoreParams {
  selectedMoods?: MoodType[];
  budget?: PriceLevel | number;
  duration?: TimeDuration;
  companion?: CompanionType;
  userLat?: number;
  userLng?: number;
}

export interface VybeScoreResult {
  score: number;
  matchLabel: string;
  moodMatchPct: number;
  budgetMatch: boolean;
  vibePillColor: string;
  reasons: string[];
}

export function calculateVybeScore(place: Place, params: ScoreParams): VybeScoreResult {
  let score = place.baseVybeScore || 85;
  const reasons: string[] = [];
  let moodMatchPct = 80;

  if (params.selectedMoods && params.selectedMoods.length > 0) {
    const isPrimaryMatch = params.selectedMoods.includes(place.primaryMood);
    const secondaryMatches = params.selectedMoods.filter(m => place.secondaryMoods.includes(m));

    if (isPrimaryMatch) {
      score += 6;
      moodMatchPct = 98;
      reasons.push('Direct vibe match with your mood');
    } else if (secondaryMatches.length > 0) {
      score += 3;
      moodMatchPct = 90;
      reasons.push('Matches your secondary vibe preference');
    } else {
      score -= 8;
      moodMatchPct = 65;
    }
  }

  let budgetMatch = true;
  if (typeof params.budget === 'number') {
    if (place.features.isFree) {
      score += 4;
      reasons.push('100% Free - zero wallet stress');
    } else if (place.approxCostUsd > 0 && place.approxCostUsd <= params.budget) {
      score += 3;
      reasons.push(`Under your $${params.budget} budget`);
    } else if (place.approxCostUsd > 0) {
      score -= 6;
      budgetMatch = false;
    }
    // Google Places does not provide an exact spend amount. Unknown cost is
    // neutral rather than incorrectly treating it as $0/free.
  } else if (params.budget) {
    if (params.budget === 'free' && place.features.isFree) {
      score += 5;
      reasons.push('100% Free experience');
    } else if (place.priceLevel === params.budget) {
      score += 3;
    }
  }

  if (params.companion && place.suitableFor.includes(params.companion)) {
    score += 3;
    reasons.push(`Optimized for ${params.companion} hangs`);
  }

  if (place.distanceKm !== undefined && place.distanceKm >= 0) {
    if (place.distanceKm < 0.5) {
      score += 5;
      reasons.push('Right around the corner');
    } else if (place.distanceKm < 1) {
      score += 3;
      reasons.push('Less than 1 km away');
    } else if (place.distanceKm < 3) {
      score += 1;
    }
  }

  if (place.openingHours.isOpenNow) score += 2;

  if (place.rating >= 4.5) {
    score += 2;
    reasons.push('Highly rated');
  }

  const finalScore = Math.min(99, Math.max(62, Math.round(score)));

  let matchLabel = 'High Vibe';
  let vibePillColor = 'text-vybe-lime border-vybe-lime/40 bg-vybe-lime/10';

  if (finalScore >= 95) {
    matchLabel = 'Ultimate Match 🔥';
    vibePillColor = 'text-vybe-lime border-vybe-lime/50 bg-vybe-lime/20 shadow-neon-lime';
  } else if (finalScore >= 90) {
    matchLabel = 'Great Vibe ✨';
    vibePillColor = 'text-vybe-cyan border-vybe-cyan/50 bg-vybe-cyan/20 shadow-neon-cyan';
  } else if (finalScore >= 80) {
    matchLabel = 'Solid Fit ⚡';
    vibePillColor = 'text-vybe-yellow border-vybe-yellow/50 bg-vybe-yellow/20';
  } else {
    matchLabel = 'Alternative Pick';
    vibePillColor = 'text-slate-400 border-slate-700 bg-slate-800/40';
  }

  return {
    score: finalScore,
    matchLabel,
    moodMatchPct,
    budgetMatch,
    vibePillColor,
    reasons: reasons.slice(0, 2),
  };
}
