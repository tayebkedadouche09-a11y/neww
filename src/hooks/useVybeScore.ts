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

function durationMinutes(duration?: TimeDuration): number | undefined {
  if (!duration) return undefined;
  const values: Record<TimeDuration, number> = {
    '15min': 15,
    '30min': 30,
    '1h': 60,
    '2h': 120,
    '3h+': 180,
    'all-day': 480,
  };
  return values[duration];
}

function placeDurationMinutes(place: Place): number | undefined {
  const raw = `${place.estimatedDuration || ''} ${place.description || ''}`.toLowerCase();
  const hourMatch = raw.match(/(\d+(?:\.\d+)?)\s*(?:h|hours?)/);
  if (hourMatch) return Math.round(Number(hourMatch[1]) * 60);
  const minuteMatch = raw.match(/(\d+)\s*(?:min|minutes?)/);
  if (minuteMatch) return Number(minuteMatch[1]);
  return undefined;
}

export function calculateVybeScore(place: Place, params: ScoreParams): VybeScoreResult {
  let score = place.baseVybeScore || 85;
  const reasons: string[] = [];
  let moodMatchPct = 80;

  if (params.selectedMoods && params.selectedMoods.length > 0) {
    const selected = new Set(params.selectedMoods);
    const primaryMatch = selected.has(place.primaryMood);
    const secondaryMatches = place.secondaryMoods.filter(mood => selected.has(mood)).length;

    if (primaryMatch) {
      score += 10;
      moodMatchPct = 98;
      reasons.push('Direct vibe match with your mood');
    } else if (secondaryMatches > 0) {
      score += 6;
      moodMatchPct = 92;
      reasons.push('Matches your secondary vibe preference');
    } else {
      // A vibe choice should rank places lower, not make them disappear.
      score -= 2;
      moodMatchPct = 72;
    }
  }

  let budgetMatch = true;
  if (params.budget === 'free') {
    if (place.features.isFree) {
      score += 8;
      reasons.push('100% Free experience');
    } else {
      score -= 5;
      budgetMatch = false;
    }
  } else if (typeof params.budget === 'number') {
    if (place.features.isFree) {
      score += 5;
      reasons.push('Free — zero wallet stress');
    } else if (place.approxCostUsd > 0 && place.approxCostUsd <= params.budget) {
      score += 5;
      reasons.push(`Under your $${params.budget} budget`);
    } else if (place.approxCostUsd > params.budget) {
      score -= 5;
      budgetMatch = false;
    } else if (place.priceLevel === '$' || place.priceLevel === '$$') {
      // Google often gives a price level without an exact spend amount.
      score += 2;
      reasons.push('Likely within your budget');
    }
  } else if (params.budget && place.priceLevel === params.budget) {
    score += 3;
    reasons.push('Matches your price preference');
  }

  if (params.companion) {
    if (place.suitableFor.includes(params.companion)) {
      score += 6;
      reasons.push(`Great for ${params.companion}`);
    } else {
      score -= 1;
    }
  }

  const requestedMinutes = durationMinutes(params.duration);
  if (requestedMinutes) {
    const visitMinutes = placeDurationMinutes(place);
    if (visitMinutes !== undefined) {
      const delta = Math.abs(visitMinutes - requestedMinutes);
      if (delta <= 20) {
        score += 6;
        reasons.push('Fits your available time');
      } else if (delta <= 45) {
        score += 3;
      } else if (requestedMinutes < 60 && visitMinutes > requestedMinutes) {
        score -= 2;
      }
    } else {
      score += requestedMinutes <= 30 ? 1 : 2;
    }
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
