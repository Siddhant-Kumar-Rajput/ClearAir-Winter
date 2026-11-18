import { describe, expect, it } from 'vitest';
import type { TailoredPlanResponse } from '../../types/airQuality.ts';
import { buildTaskDraftsFromPlan } from '../googleTasks.ts';

const SAMPLE_PLAN: TailoredPlanResponse = {
  headline: 'High morning inversion protocol for New Delhi',
  whySmogHappensHere: 'Cold calm air traps emissions near ground level.',
  ventilationGuidance: 'Open windows briefly between 14:00 and 15:00.',
  dailyRoutine: [
    {
      id: 'morning_seal',
      timeWindow: '07:00 - 10:00',
      title: 'Keep windows sealed during morning inversion',
      action: 'Close trickle vents and run kitchen exhaust on low while cooking.',
      whyItMatters: 'Prevents peak traffic PM2.5 from entering bedrooms.',
      exposureReductionPct: 28,
      weeklyCo2SavedKg: 0.5,
      weeklyPm25AvoidedGrams: 4,
    },
    {
      id: 'afternoon_air',
      timeWindow: '14:00 - 15:00',
      title: '15-minute cross-ventilation',
      action: 'Open opposite windows briefly during lowest PM2.5 hour.',
      whyItMatters: 'Flushes indoor CO2 when outdoor particulates dip.',
      exposureReductionPct: 12,
      weeklyCo2SavedKg: 0.2,
      weeklyPm25AvoidedGrams: 1,
    },
  ],
  indoorHacks: [
    {
      id: 'wet_mop',
      title: 'Wet mop floors instead of dry sweeping',
      costTier: 'zero_cost',
      steps: 'Use a damp microfiber mop every evening.',
      directImpactExplanation: 'Prevents settled ultrafine dust from resuspending.',
      exposureReductionPct: 18,
      weeklyCo2SavedKg: 0.1,
      weeklyPm25AvoidedGrams: 2,
    },
  ],
  sustainableAlternatives: [
    {
      id: 'metro_swap',
      category: 'commute',
      replaces: 'Solo petrol car commute',
      alternative: 'Metro + N95 mask on 3 workdays',
      whyItMatters: 'Eliminates tailpipe NOx and cold-start PM2.5.',
      exposureReductionPct: 15,
      weeklyCo2SavedKg: 14.5,
      weeklyPm25AvoidedGrams: 19,
    },
  ],
};

describe('googleTasks plan mapping', () => {
  it('builds bounded Google Task drafts for selected routine, hack, and alternative IDs', () => {
    const drafts = buildTaskDraftsFromPlan(SAMPLE_PLAN, 'New Delhi', [
      'routine:morning_seal',
      'hack:wet_mop',
      'alt:metro_swap',
    ]);

    expect(drafts).toHaveLength(3);
    expect(drafts[0].title).toContain('[07:00 - 10:00]');
    expect(drafts[0].notes).toContain('-28% exposure');
    expect(drafts[1].title).toBe('Indoor Air: Wet mop floors instead of dry sweeping');
    expect(drafts[2].title).toBe('Clean Swap: Metro + N95 mask on 3 workdays');
  });

  it('defaults to all daily routine slots when no specific IDs are selected', () => {
    const drafts = buildTaskDraftsFromPlan(SAMPLE_PLAN, 'New Delhi', []);
    expect(drafts).toHaveLength(2);
    expect(drafts[0].title).toContain('New Delhi');
  });
});
