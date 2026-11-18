import { describe, expect, it } from 'vitest';
import {
  advisorChatRequestSchema,
  citySearchQuerySchema,
  generatePlanRequestSchema,
  liveAirQualityQuerySchema,
} from '../validation.ts';

const VALID_SNAPSHOT = {
  city: 'Lahore',
  country: 'Pakistan',
  latitude: 31.5497,
  longitude: 74.3436,
  observedAt: '2026-11-18T10:00',
  usAqi: 215,
  pm25: 165.4,
  pm10: 210.2,
  no2: 48.1,
  co: 920,
  temperatureC: 15.2,
  windSpeedKmh: 4.3,
  humidityPct: 68,
  ventilation: {
    windowLabel: '14:00 - 15:00',
    avgPm25: 112.5,
    peakWindowLabel: '22:00 - 23:00',
    peakPm25: 220,
    inversionRisk: 'high' as const,
  },
};

const VALID_PROFILE = {
  displayAlias: 'Khan Household',
  city: 'Lahore',
  country: 'Pakistan',
  latitude: 31.5497,
  longitude: 74.3436,
  residentsCount: 5,
  sensitiveGroups: ['children' as const, 'seniors' as const],
  homeType: 'townhouse' as const,
  heatingFuel: 'natural_gas' as const,
  cookingFuel: 'natural_gas' as const,
  commuteMode: 'car_petrol_diesel' as const,
  indoorGear: ['kitchen_exhaust' as const],
};

describe('server input validation schemas', () => {
  it('validates city search query bounds', () => {
    expect(citySearchQuerySchema.safeParse({ q: 'a' }).success).toBe(false);
    expect(citySearchQuerySchema.safeParse({ q: 'Warsaw' }).success).toBe(true);
    expect(
      citySearchQuerySchema.safeParse({ q: 'x'.repeat(120) }).success,
    ).toBe(false);
  });

  it('rejects out-of-range GPS coordinates', () => {
    expect(
      liveAirQualityQuerySchema.safeParse({ lat: 95, lon: 10 }).success,
    ).toBe(false);
    expect(
      liveAirQualityQuerySchema.safeParse({ lat: 28.61, lon: 77.2 }).success,
    ).toBe(true);
  });

  it('validates generatePlanRequestSchema and rejects invalid fuels', () => {
    expect(
      generatePlanRequestSchema.safeParse({
        snapshot: VALID_SNAPSHOT,
        profile: VALID_PROFILE,
      }).success,
    ).toBe(true);

    expect(
      generatePlanRequestSchema.safeParse({
        snapshot: VALID_SNAPSHOT,
        profile: { ...VALID_PROFILE, heatingFuel: 'reactor' },
      }).success,
    ).toBe(false);
  });

  it('enforces advisor question character caps and history bounds', () => {
    expect(
      advisorChatRequestSchema.safeParse({
        snapshot: VALID_SNAPSHOT,
        profile: VALID_PROFILE,
        history: [],
        question: '?',
      }).success,
    ).toBe(false);

    expect(
      advisorChatRequestSchema.safeParse({
        snapshot: VALID_SNAPSHOT,
        profile: VALID_PROFILE,
        history: [],
        question: 'x'.repeat(601),
      }).success,
    ).toBe(false);

    expect(
      advisorChatRequestSchema.safeParse({
        snapshot: VALID_SNAPSHOT,
        profile: VALID_PROFILE,
        history: [{ role: 'user', text: 'Should we run HEPA all night?' }],
        question: 'What target indoor PM2.5 should we aim for?',
      }).success,
    ).toBe(true);
  });
});
