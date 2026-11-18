import type {
  AqiSeverityInfo,
  HourlyForecastPoint,
  HouseholdProfile,
  VentilationWindow,
} from '../types/airQuality.ts';

export interface ImpactActionInput {
  id: string;
  exposureReductionPct: number;
  weeklyCo2SavedKg: number;
  weeklyPm25AvoidedGrams: number;
}

export interface ImpactSimulationResult {
  baselineIndoorPm25: number;
  projectedIndoorPm25: number;
  indoorReductionPct: number;
  whoGuidelineRatio: number;
  weeklyCo2SavedKg: number;
  seasonalCo2SavedKg: number;
  weeklyPm25AvoidedGrams: number;
  selectedCount: number;
}

export const WHO_24H_PM25_GUIDELINE = 15;

export function sanitizeTextInput(value: string, maxLength: number): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function classifyAqiSeverity(usAqi: number): AqiSeverityInfo {
  if (usAqi <= 50) {
    return {
      level: 'good',
      label: 'Good Air Quality',
      advisory: 'Normal outdoor activity is safe; keep natural cross-ventilation active.',
      textColorClass: 'text-[#15803D]',
      surfaceClass: 'bg-[#F0FDF4]',
      borderClass: 'border-[#BBF7D0]',
    };
  }
  if (usAqi <= 100) {
    return {
      level: 'moderate',
      label: 'Moderate Haze',
      advisory: 'Sensitive family members should monitor exertion near busy corridors.',
      textColorClass: 'text-[#B45309]',
      surfaceClass: 'bg-[#FFFBEB]',
      borderClass: 'border-[#FDE68A]',
    };
  }
  if (usAqi <= 150) {
    return {
      level: 'unhealthy_sensitive',
      label: 'Unhealthy for Sensitive Groups',
      advisory: 'Children, seniors, and asthma-prone residents should limit prolonged outdoor exertion.',
      textColorClass: 'text-[#C2410C]',
      surfaceClass: 'bg-[#FFF7ED]',
      borderClass: 'border-[#FED7AA]',
    };
  }
  if (usAqi <= 200) {
    return {
      level: 'unhealthy',
      label: 'Unhealthy Winter Smog',
      advisory: 'Keep windows sealed outside the lowest-PM2.5 window and run indoor filtration.',
      textColorClass: 'text-[#B91C1C]',
      surfaceClass: 'bg-[#FEF2F2]',
      borderClass: 'border-[#FECACA]',
    };
  }
  if (usAqi <= 300) {
    return {
      level: 'very_unhealthy',
      label: 'Very Unhealthy Smog Alert',
      advisory: 'Avoid non-essential outdoor travel; wear fitted N95/FFP2 masks if commuting.',
      textColorClass: 'text-[#991B1B]',
      surfaceClass: 'bg-[#FEF2F2]',
      borderClass: 'border-[#FCA5A5]',
    };
  }
  return {
    level: 'hazardous',
    label: 'Severe Hazardous Inversion',
    advisory: 'Emergency clean-air shelter mode: seal drafts, run continuous HEPA, and avoid combustion indoors.',
    textColorClass: 'text-[#7F1D1D]',
    surfaceClass: 'bg-[#FEF2F2]',
    borderClass: 'border-[#F87171]',
  };
}

export function findSafestVentilationWindow(
  hourly: HourlyForecastPoint[],
): VentilationWindow {
  if (hourly.length === 0) {
    return {
      windowLabel: '13:00 - 15:00',
      avgPm25: 0,
      peakWindowLabel: '20:00 - 22:00',
      peakPm25: 0,
      inversionRisk: 'moderate',
    };
  }

  // Prefer daytime hours (09:00-17:00) for safe air exchange if available
  const daytimeIndices = hourly
    .map((pt, idx) => ({ pt, idx }))
    .filter(({ pt }) => {
      const hour = Number.parseInt(pt.hourLabel.slice(0, 2), 10);
      return Number.isFinite(hour) && hour >= 9 && hour <= 17;
    });

  let bestStart = 0;
  let bestAvg = Number.POSITIVE_INFINITY;
  const candidateStarts =
    daytimeIndices.length >= 2
      ? daytimeIndices.slice(0, daytimeIndices.length - 1).map((d) => d.idx)
      : hourly.slice(0, Math.max(1, hourly.length - 1)).map((_, idx) => idx);

  for (const idx of candidateStarts) {
    const next = hourly[idx + 1] ?? hourly[idx];
    const avg = (hourly[idx].pm25 + next.pm25) / 2;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestStart = idx;
    }
  }

  let peakStart = 0;
  let peakAvg = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < Math.max(1, hourly.length - 1); i++) {
    const next = hourly[i + 1] ?? hourly[i];
    const avg = (hourly[i].pm25 + next.pm25) / 2;
    if (avg > peakAvg) {
      peakAvg = avg;
      peakStart = i;
    }
  }

  const avgWind =
    hourly.reduce((acc, item) => acc + item.windSpeedKmh, 0) / hourly.length;
  const inversionRisk =
    avgWind < 6 || peakAvg > 90
      ? 'high'
      : avgWind < 12 || peakAvg > 45
        ? 'moderate'
        : 'low';

  const bestEnd = hourly[Math.min(bestStart + 1, hourly.length - 1)];
  const peakEnd = hourly[Math.min(peakStart + 1, hourly.length - 1)];

  return {
    windowLabel: `${hourly[bestStart].hourLabel} - ${bestEnd.hourLabel}`,
    avgPm25: Math.round(bestAvg * 10) / 10,
    peakWindowLabel: `${hourly[peakStart].hourLabel} - ${peakEnd.hourLabel}`,
    peakPm25: Math.round(peakAvg * 10) / 10,
    inversionRisk,
  };
}

/**
 * Estimates baseline indoor PM2.5 (µg/m³) from outdoor PM2.5 + home infiltration
 * and indoor combustion sources (unvented gas, biomass cooking, wood/coal heating).
 */
export function calculateBaselineIndoorPm25(
  outdoorPm25: number,
  profile: HouseholdProfile,
): number {
  const safeOutdoor = Math.max(0, outdoorPm25);

  // Typical winter building shell infiltration factor
  let infiltrationFactor =
    profile.homeType === 'apartment'
      ? 0.62
      : profile.homeType === 'townhouse'
        ? 0.68
        : 0.74;

  if (profile.indoorGear.includes('window_seals')) {
    infiltrationFactor -= 0.09;
  }

  let indoorSources = 0;
  if (profile.cookingFuel === 'biomass_solid') {
    indoorSources += 38;
  } else if (profile.cookingFuel === 'natural_gas' || profile.cookingFuel === 'lpg_cylinder') {
    indoorSources += profile.indoorGear.includes('kitchen_exhaust') ? 6 : 16;
  }

  if (profile.heatingFuel === 'wood_coal') {
    indoorSources += 18;
  } else if (profile.heatingFuel === 'kerosene_oil') {
    indoorSources += 14;
  }

  let filtrationMultiplier = 1;
  if (profile.indoorGear.includes('hepa_purifier')) {
    filtrationMultiplier *= 0.68;
  }
  if (profile.indoorGear.includes('box_fan_diy')) {
    filtrationMultiplier *= 0.78;
  }

  const baseline = (safeOutdoor * infiltrationFactor + indoorSources) * filtrationMultiplier;
  return Math.round(baseline * 10) / 10;
}

/**
 * Computes compounded indoor exposure reduction and additive weekly emissions savings
 * using diminishing-returns multiplication for exposure percentages so reduction never
 * exceeds realistic physical bounds (capped at 88%).
 */
export function calculateChoiceImpact(
  outdoorPm25: number,
  profile: HouseholdProfile,
  selectedActions: ImpactActionInput[],
): ImpactSimulationResult {
  const baselineIndoorPm25 = calculateBaselineIndoorPm25(outdoorPm25, profile);

  if (selectedActions.length === 0) {
    return {
      baselineIndoorPm25,
      projectedIndoorPm25: baselineIndoorPm25,
      indoorReductionPct: 0,
      whoGuidelineRatio: Math.round((baselineIndoorPm25 / WHO_24H_PM25_GUIDELINE) * 10) / 10,
      weeklyCo2SavedKg: 0,
      seasonalCo2SavedKg: 0,
      weeklyPm25AvoidedGrams: 0,
      selectedCount: 0,
    };
  }

  let remainingExposureFraction = 1;
  let weeklyCo2SavedKg = 0;
  let weeklyPm25AvoidedGrams = 0;

  for (const action of selectedActions) {
    const boundedPct = Math.min(Math.max(action.exposureReductionPct, 0), 65) / 100;
    remainingExposureFraction *= 1 - boundedPct;
    weeklyCo2SavedKg += Math.max(0, action.weeklyCo2SavedKg);
    weeklyPm25AvoidedGrams += Math.max(0, action.weeklyPm25AvoidedGrams);
  }

  const rawReduction = 1 - remainingExposureFraction;
  const cappedReduction = Math.min(rawReduction, 0.88);
  const projectedIndoorPm25 =
    Math.round(baselineIndoorPm25 * (1 - cappedReduction) * 10) / 10;
  const indoorReductionPct = Math.round(cappedReduction * 100);
  const roundedWeeklyCo2 = Math.round(weeklyCo2SavedKg * 10) / 10;

  return {
    baselineIndoorPm25,
    projectedIndoorPm25,
    indoorReductionPct,
    whoGuidelineRatio: Math.round((projectedIndoorPm25 / WHO_24H_PM25_GUIDELINE) * 10) / 10,
    weeklyCo2SavedKg: roundedWeeklyCo2,
    seasonalCo2SavedKg: Math.round(roundedWeeklyCo2 * 16 * 10) / 10,
    weeklyPm25AvoidedGrams: Math.round(weeklyPm25AvoidedGrams * 10) / 10,
    selectedCount: selectedActions.length,
  };
}
