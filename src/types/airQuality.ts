export type SensitiveGroup =
  | 'children'
  | 'seniors'
  | 'asthma_respiratory'
  | 'pregnant';

export type HomeType =
  | 'apartment'
  | 'townhouse'
  | 'detached_house'
  | 'shared_housing';

export type HeatingFuel =
  | 'electric_heat_pump'
  | 'natural_gas'
  | 'wood_coal'
  | 'district_heating'
  | 'kerosene_oil';

export type CookingFuel =
  | 'induction_electric'
  | 'natural_gas'
  | 'lpg_cylinder'
  | 'biomass_solid';

export type CommuteMode =
  | 'car_petrol_diesel'
  | 'car_ev_hybrid'
  | 'public_transit'
  | 'walk_bike'
  | 'remote_wfh';

export type IndoorGear =
  | 'hepa_purifier'
  | 'box_fan_diy'
  | 'kitchen_exhaust'
  | 'window_seals'
  | 'hygrometer'
  | 'n95_masks';

export interface HouseholdProfile {
  displayAlias: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  residentsCount: number;
  sensitiveGroups: SensitiveGroup[];
  homeType: HomeType;
  heatingFuel: HeatingFuel;
  cookingFuel: CookingFuel;
  commuteMode: CommuteMode;
  indoorGear: IndoorGear[];
}

export interface CityMatch {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

export interface HourlyForecastPoint {
  time: string;
  hourLabel: string;
  pm25: number;
  pm10: number;
  usAqi: number;
  windSpeedKmh: number;
  temperatureC: number;
}

export interface VentilationWindow {
  windowLabel: string;
  avgPm25: number;
  peakWindowLabel: string;
  peakPm25: number;
  inversionRisk: 'low' | 'moderate' | 'high';
}

export interface DailyAirQualityPoint {
  date: string;
  dayLabel: string;
  avgPm25: number;
  peakPm25: number;
  avgUsAqi: number;
}

export interface AirQualitySnapshot {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  observedAt: string;
  usAqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  co: number;
  temperatureC: number;
  windSpeedKmh: number;
  humidityPct: number;
  ventilation: VentilationWindow;
  hourly: HourlyForecastPoint[];
  dailyHistory: DailyAirQualityPoint[];
}

export type AqiSeverityLevel =
  | 'good'
  | 'moderate'
  | 'unhealthy_sensitive'
  | 'unhealthy'
  | 'very_unhealthy'
  | 'hazardous';

export interface AqiSeverityInfo {
  level: AqiSeverityLevel;
  label: string;
  advisory: string;
  textColorClass: string;
  surfaceClass: string;
  borderClass: string;
}

export interface RoutineSlot {
  id: string;
  timeWindow: string;
  title: string;
  action: string;
  whyItMatters: string;
  exposureReductionPct: number;
  weeklyCo2SavedKg: number;
  weeklyPm25AvoidedGrams: number;
}

export interface IndoorHack {
  id: string;
  title: string;
  costTier: 'zero_cost' | 'low_cost' | 'equipment';
  steps: string;
  directImpactExplanation: string;
  exposureReductionPct: number;
  weeklyCo2SavedKg: number;
  weeklyPm25AvoidedGrams: number;
}

export interface SustainableAlternative {
  id: string;
  category: 'commute' | 'heating' | 'cooking' | 'community';
  replaces: string;
  alternative: string;
  whyItMatters: string;
  exposureReductionPct: number;
  weeklyCo2SavedKg: number;
  weeklyPm25AvoidedGrams: number;
}

export interface TailoredPlanResponse {
  headline: string;
  whySmogHappensHere: string;
  ventilationGuidance: string;
  dailyRoutine: RoutineSlot[];
  indoorHacks: IndoorHack[];
  sustainableAlternatives: SustainableAlternative[];
}

export interface AdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export type PledgeCategory =
  | 'commute'
  | 'heating'
  | 'indoor_air'
  | 'cooking'
  | 'community';

export interface CommunityPledge {
  id: string;
  authorUid: string;
  displayAlias: string;
  city: string;
  category: PledgeCategory;
  actionTitle: string;
  impactExplanation: string;
  weeklyCo2SavedKg: number;
  supportersCount: number;
  visibility: 'public';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type SmogSeverityReport =
  | 'moderate'
  | 'unhealthy_sensitive'
  | 'unhealthy'
  | 'severe';

export type ObservedSmogSource =
  | 'traffic_inversion'
  | 'wood_coal_smoke'
  | 'industrial_haze'
  | 'construction_dust'
  | 'mixed_smog';

export interface SmogReport {
  id: string;
  authorUid: string;
  displayAlias: string;
  city: string;
  neighborhood: string;
  severity: SmogSeverityReport;
  observedSource: ObservedSmogSource;
  note: string;
  helpfulCount: number;
  visibility: 'public';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SavedRoutineRecord {
  id: string;
  uid: string;
  city: string;
  aqiAtGeneration: number;
  pm25AtGeneration: number;
  summary: string;
  ventilationWindow: string;
  highlights: string[];
  selectedActionIds: string[];
  estimatedPm25ReductionPct: number;
  estimatedWeeklyCo2SavedKg: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Validation constants synchronized with firebase-blueprint.json & firestore.rules.
 */
export const VALIDATION_LIMITS = {
  idPattern: /^[a-zA-Z0-9_-]+$/,
  displayAlias: { min: 1, max: 60 },
  city: { min: 1, max: 120 },
  country: { min: 1, max: 80 },
  neighborhood: { min: 1, max: 100 },
  actionTitle: { min: 3, max: 140 },
  impactExplanation: { min: 5, max: 400 },
  smogNote: { min: 5, max: 360 },
  summary: { min: 1, max: 1200 },
  ventilationWindow: { min: 1, max: 140 },
  sensitiveGroupsMax: 4,
  indoorGearMax: 6,
  highlightsMax: 10,
  selectedActionIdsMax: 20,
} as const;
