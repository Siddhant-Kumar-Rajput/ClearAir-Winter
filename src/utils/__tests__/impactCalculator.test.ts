import { describe, expect, it } from 'vitest';
import type { HourlyForecastPoint, HouseholdProfile } from '../../types/airQuality.ts';
import {
  calculateBaselineIndoorPm25,
  calculateChoiceImpact,
  classifyAqiSeverity,
  findSafestVentilationWindow,
  sanitizeTextInput,
} from '../impactCalculator.ts';

const SAMPLE_PROFILE: HouseholdProfile = {
  displayAlias: 'Test Family',
  city: 'New Delhi',
  country: 'India',
  latitude: 28.6139,
  longitude: 77.209,
  residentsCount: 4,
  sensitiveGroups: ['children'],
  homeType: 'apartment',
  heatingFuel: 'electric_heat_pump',
  cookingFuel: 'natural_gas',
  commuteMode: 'car_petrol_diesel',
  indoorGear: ['kitchen_exhaust'],
};

describe('impactCalculator', () => {
  it('classifies AQI severity levels accurately with non-color-only labels', () => {
    expect(classifyAqiSeverity(32).level).toBe('good');
    expect(classifyAqiSeverity(85).level).toBe('moderate');
    expect(classifyAqiSeverity(130).level).toBe('unhealthy_sensitive');
    expect(classifyAqiSeverity(180).level).toBe('unhealthy');
    expect(classifyAqiSeverity(245).level).toBe('very_unhealthy');
    expect(classifyAqiSeverity(360).level).toBe('hazardous');
    expect(classifyAqiSeverity(245).label).toContain('Very Unhealthy');
  });

  it('finds the lowest daytime PM2.5 ventilation window and peak smog hours', () => {
    const hourly: HourlyForecastPoint[] = [
      { time: '2026-11-18T06:00', hourLabel: '06:00', pm25: 140, pm10: 190, usAqi: 195, windSpeedKmh: 3, temperatureC: 8 },
      { time: '2026-11-18T10:00', hourLabel: '10:00', pm25: 90, pm10: 120, usAqi: 165, windSpeedKmh: 7, temperatureC: 14 },
      { time: '2026-11-18T13:00', hourLabel: '13:00', pm25: 42, pm10: 65, usAqi: 118, windSpeedKmh: 12, temperatureC: 19 },
      { time: '2026-11-18T14:00', hourLabel: '14:00', pm25: 38, pm10: 60, usAqi: 108, windSpeedKmh: 13, temperatureC: 20 },
      { time: '2026-11-18T21:00', hourLabel: '21:00', pm25: 180, pm10: 240, usAqi: 230, windSpeedKmh: 2, temperatureC: 10 },
      { time: '2026-11-18T22:00', hourLabel: '22:00', pm25: 195, pm10: 255, usAqi: 245, windSpeedKmh: 2, temperatureC: 9 },
    ];

    const window = findSafestVentilationWindow(hourly);
    expect(window.windowLabel).toBe('13:00 - 14:00');
    expect(window.avgPm25).toBe(40);
    expect(window.peakWindowLabel).toBe('21:00 - 22:00');
    expect(window.inversionRisk).toBe('high');
  });

  it('reflects indoor filtration and combustion sources in baseline PM2.5', () => {
    const withoutHepa = calculateBaselineIndoorPm25(120, SAMPLE_PROFILE);
    const withHepa = calculateBaselineIndoorPm25(120, {
      ...SAMPLE_PROFILE,
      indoorGear: ['kitchen_exhaust', 'hepa_purifier', 'window_seals'],
    });
    const withWoodHeat = calculateBaselineIndoorPm25(120, {
      ...SAMPLE_PROFILE,
      heatingFuel: 'wood_coal',
      cookingFuel: 'biomass_solid',
    });

    expect(withHepa).toBeLessThan(withoutHepa);
    expect(withWoodHeat).toBeGreaterThan(withoutHepa);
  });

  it('computes diminishing-returns exposure reduction and additive weekly emissions', () => {
    const result = calculateChoiceImpact(140, SAMPLE_PROFILE, [
      { id: 'a', exposureReductionPct: 40, weeklyCo2SavedKg: 8.5, weeklyPm25AvoidedGrams: 12 },
      { id: 'b', exposureReductionPct: 30, weeklyCo2SavedKg: 4.5, weeklyPm25AvoidedGrams: 18 },
    ]);

    expect(result.selectedCount).toBe(2);
    expect(result.indoorReductionPct).toBe(58);
    expect(result.projectedIndoorPm25).toBeLessThan(result.baselineIndoorPm25);
    expect(result.weeklyCo2SavedKg).toBe(13);
    expect(result.seasonalCo2SavedKg).toBe(208);
    expect(result.weeklyPm25AvoidedGrams).toBe(30);
  });

  it('sanitizes control characters and respects max length', () => {
    const dirty = '  Delhi\u0000\n\t Smog   Alert  ';
    expect(sanitizeTextInput(dirty, 14)).toBe('Delhi Smog Ale');
  });
});
