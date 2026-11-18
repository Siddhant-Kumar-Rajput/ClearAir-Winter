import { z } from 'zod';
import { VALIDATION_LIMITS } from '../src/types/airQuality.ts';

export const citySearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, 'Search query must be at least 2 characters.')
    .max(100, 'Search query is too long.'),
});

export const liveAirQualityQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  city: z.string().trim().min(1).max(VALIDATION_LIMITS.city.max).optional(),
  country: z.string().trim().min(1).max(VALIDATION_LIMITS.country.max).optional(),
});

export const householdProfileSchema = z.object({
  displayAlias: z
    .string()
    .trim()
    .min(1)
    .max(VALIDATION_LIMITS.displayAlias.max)
    .default('My Household'),
  city: z.string().trim().min(1).max(VALIDATION_LIMITS.city.max),
  country: z.string().trim().min(1).max(VALIDATION_LIMITS.country.max),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  residentsCount: z.number().int().min(1).max(20),
  sensitiveGroups: z
    .array(z.enum(['children', 'seniors', 'asthma_respiratory', 'pregnant']))
    .max(VALIDATION_LIMITS.sensitiveGroupsMax),
  homeType: z.enum([
    'apartment',
    'townhouse',
    'detached_house',
    'shared_housing',
  ]),
  heatingFuel: z.enum([
    'electric_heat_pump',
    'natural_gas',
    'wood_coal',
    'district_heating',
    'kerosene_oil',
  ]),
  cookingFuel: z.enum([
    'induction_electric',
    'natural_gas',
    'lpg_cylinder',
    'biomass_solid',
  ]),
  commuteMode: z.enum([
    'car_petrol_diesel',
    'car_ev_hybrid',
    'public_transit',
    'walk_bike',
    'remote_wfh',
  ]),
  indoorGear: z
    .array(
      z.enum([
        'hepa_purifier',
        'box_fan_diy',
        'kitchen_exhaust',
        'window_seals',
        'hygrometer',
        'n95_masks',
      ]),
    )
    .max(VALIDATION_LIMITS.indoorGearMax),
});

export const airQualitySnapshotSchema = z.object({
  city: z.string().trim().min(1).max(VALIDATION_LIMITS.city.max),
  country: z.string().trim().min(1).max(VALIDATION_LIMITS.country.max),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  observedAt: z.string().max(60),
  usAqi: z.number().min(0).max(1000),
  pm25: z.number().min(0).max(2000),
  pm10: z.number().min(0).max(3000),
  no2: z.number().min(0).max(2000),
  co: z.number().min(0).max(100000),
  temperatureC: z.number().min(-60).max(60),
  windSpeedKmh: z.number().min(0).max(300),
  humidityPct: z.number().min(0).max(100),
  ventilation: z.object({
    windowLabel: z.string().max(80),
    avgPm25: z.number().min(0).max(2000),
    peakWindowLabel: z.string().max(80),
    peakPm25: z.number().min(0).max(2000),
    inversionRisk: z.enum(['low', 'moderate', 'high']),
  }),
});

export const generatePlanRequestSchema = z.object({
  snapshot: airQualitySnapshotSchema,
  profile: householdProfileSchema,
});

export const advisorChatRequestSchema = z.object({
  snapshot: airQualitySnapshotSchema,
  profile: householdProfileSchema,
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        text: z.string().trim().min(1).max(1500),
      }),
    )
    .max(12),
  question: z
    .string()
    .trim()
    .min(2, 'Please enter a question.')
    .max(600, 'Question cannot exceed 600 characters.'),
});
