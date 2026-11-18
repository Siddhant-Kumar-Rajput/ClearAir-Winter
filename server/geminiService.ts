import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  HouseholdProfile,
  TailoredPlanResponse,
} from '../src/types/airQuality.ts';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add your API key in Settings > Secrets.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      const isRetryable =
        msg.includes('429') ||
        msg.includes('503') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('UNAVAILABLE');
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  throw lastError;
}

interface SnapshotContext {
  city: string;
  country: string;
  usAqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  co: number;
  temperatureC: number;
  windSpeedKmh: number;
  humidityPct: number;
  ventilation: {
    windowLabel: string;
    avgPm25: number;
    peakWindowLabel: string;
    peakPm25: number;
    inversionRisk: string;
  };
}

function buildContextPrompt(
  snapshot: SnapshotContext,
  profile: HouseholdProfile,
): string {
  return [
    `Location: ${snapshot.city}, ${snapshot.country}`,
    `Live Air Quality: US AQI ${snapshot.usAqi}, PM2.5 ${snapshot.pm25} µg/m³, PM10 ${snapshot.pm10} µg/m³, NO2 ${snapshot.no2} µg/m³, CO ${snapshot.co} µg/m³`,
    `Winter Weather: ${snapshot.temperatureC}°C, Wind ${snapshot.windSpeedKmh} km/h, Humidity ${snapshot.humidityPct}%, Thermal Inversion Risk: ${snapshot.ventilation.inversionRisk}`,
    `24h Forecast Windows: Lowest PM2.5 ventilation window ${snapshot.ventilation.windowLabel} (avg ${snapshot.ventilation.avgPm25} µg/m³); Peak smog window ${snapshot.ventilation.peakWindowLabel} (avg ${snapshot.ventilation.peakPm25} µg/m³)`,
    `Household Profile: ${profile.residentsCount} residents, Home: ${profile.homeType}, Sensitive groups: ${profile.sensitiveGroups.length > 0 ? profile.sensitiveGroups.join(', ') : 'none specified'}`,
    `Current Fuels & Commute: Heating=${profile.heatingFuel}, Cooking=${profile.cookingFuel}, Commute=${profile.commuteMode}`,
    `Available Indoor Gear: ${profile.indoorGear.length > 0 ? profile.indoorGear.join(', ') : 'none yet (prioritize zero-cost & DIY options)'}`,
  ].join('\n');
}

export async function generateTailoredSmogPlan(
  snapshot: SnapshotContext,
  profile: HouseholdProfile,
): Promise<TailoredPlanResponse> {
  const ai = getGeminiClient();

  const systemInstruction = [
    'You are ClearAir Winter, an evidence-based urban air quality and household resilience advisor.',
    'Generate practical, culturally respectful, non-alarmist guidance tailored strictly to the provided city AQI, winter weather inversion conditions, and household profile.',
    'For every routine step, indoor air hack, and sustainable alternative, explain the direct physical or emissions impact clearly (mechanism + quantifiable outcome).',
    'Keep strings concise, actionable, and concrete. Do not fabricate medical diagnoses; recommend consulting clinicians for acute symptoms.',
  ].join(' ');

  const prompt = [
    'Create a tailored winter smog action plan for this household based on real-time conditions:',
    buildContextPrompt(snapshot, profile),
    'Requirements:',
    '- Provide 4 time-slotted dailyRoutine items aligned to the actual ventilation window and peak smog window.',
    '- Provide 4 indoorHacks spanning zero_cost, low_cost, and equipment tiers relevant to their indoor gear.',
    '- Provide 3 sustainableAlternatives directly replacing or optimizing their current heatingFuel, cookingFuel, or commuteMode.',
    '- Realistic numeric estimates: exposureReductionPct (3 to 55), weeklyCo2SavedKg (0.5 to 45), weeklyPm25AvoidedGrams (1 to 180).',
  ].join('\n\n');

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            whySmogHappensHere: { type: Type.STRING },
            ventilationGuidance: { type: Type.STRING },
            dailyRoutine: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  timeWindow: { type: Type.STRING },
                  title: { type: Type.STRING },
                  action: { type: Type.STRING },
                  whyItMatters: { type: Type.STRING },
                  exposureReductionPct: { type: Type.NUMBER },
                  weeklyCo2SavedKg: { type: Type.NUMBER },
                  weeklyPm25AvoidedGrams: { type: Type.NUMBER },
                },
                required: [
                  'id',
                  'timeWindow',
                  'title',
                  'action',
                  'whyItMatters',
                  'exposureReductionPct',
                  'weeklyCo2SavedKg',
                  'weeklyPm25AvoidedGrams',
                ],
              },
            },
            indoorHacks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  costTier: {
                    type: Type.STRING,
                    enum: ['zero_cost', 'low_cost', 'equipment'],
                  },
                  steps: { type: Type.STRING },
                  directImpactExplanation: { type: Type.STRING },
                  exposureReductionPct: { type: Type.NUMBER },
                  weeklyCo2SavedKg: { type: Type.NUMBER },
                  weeklyPm25AvoidedGrams: { type: Type.NUMBER },
                },
                required: [
                  'id',
                  'title',
                  'costTier',
                  'steps',
                  'directImpactExplanation',
                  'exposureReductionPct',
                  'weeklyCo2SavedKg',
                  'weeklyPm25AvoidedGrams',
                ],
              },
            },
            sustainableAlternatives: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    enum: ['commute', 'heating', 'cooking', 'community'],
                  },
                  replaces: { type: Type.STRING },
                  alternative: { type: Type.STRING },
                  whyItMatters: { type: Type.STRING },
                  exposureReductionPct: { type: Type.NUMBER },
                  weeklyCo2SavedKg: { type: Type.NUMBER },
                  weeklyPm25AvoidedGrams: { type: Type.NUMBER },
                },
                required: [
                  'id',
                  'category',
                  'replaces',
                  'alternative',
                  'whyItMatters',
                  'exposureReductionPct',
                  'weeklyCo2SavedKg',
                  'weeklyPm25AvoidedGrams',
                ],
              },
            },
          },
          required: [
            'headline',
            'whySmogHappensHere',
            'ventilationGuidance',
            'dailyRoutine',
            'indoorHacks',
            'sustainableAlternatives',
          ],
        },
      },
    }),
  );

  const rawText = response.text?.trim();
  if (!rawText) {
    throw new Error('Gemini returned an empty plan response.');
  }

  return JSON.parse(rawText) as TailoredPlanResponse;
}

export async function askSmogAdvisor(
  snapshot: SnapshotContext,
  profile: HouseholdProfile,
  history: Array<{ role: 'user' | 'assistant'; text: string }>,
  question: string,
): Promise<string> {
  const ai = getGeminiClient();

  const systemInstruction = [
    'You are ClearAir Winter, a practical family air-quality advisor.',
    'Answer concisely (under 180 words) using plain language.',
    'Always ground your answer in the user’s live local AQI, PM2.5, wind/temperature, and household context below, and explicitly explain the direct exposure or emissions impact of the suggested action.',
    '',
    buildContextPrompt(snapshot, profile),
  ].join('\n');

  const transcript = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Family' : 'Advisor'}: ${m.text}`)
    .join('\n');

  const prompt = transcript
    ? `${transcript}\nFamily: ${question}\nAdvisor:`
    : question;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    }),
  );

  const reply = response.text?.trim();
  if (!reply) {
    throw new Error('Advisor returned an empty response.');
  }
  return reply;
}
