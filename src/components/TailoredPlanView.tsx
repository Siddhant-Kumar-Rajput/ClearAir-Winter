import {
  BookmarkPlus,
  Check,
  Clock,
  Home,
  Leaf,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import type {
  SavedRoutineRecord,
  TailoredPlanResponse,
} from '../types/airQuality.ts';

interface TailoredPlanViewProps {
  plan: TailoredPlanResponse | null;
  loading: boolean;
  error: string | null;
  city: string;
  selectedActionIds: string[];
  onToggleAction: (id: string) => void;
  onGeneratePlan: () => void;
  canSaveCloud: boolean;
  onSavePlanCloud: () => Promise<void>;
  savingPlan: boolean;
  savedNote: string | null;
  savedRoutines: SavedRoutineRecord[];
  onDeleteSavedRoutine: (routineId: string) => Promise<void>;
  onPromptSignIn: () => void;
}

type SectionFilter = 'all' | 'routine' | 'hacks' | 'alternatives';
type CostFilter = 'all' | 'zero_cost' | 'low_cost' | 'equipment';

const COST_LABELS: Record<'zero_cost' | 'low_cost' | 'equipment', string> = {
  zero_cost: 'Zero-Cost Habit',
  low_cost: 'Low-Cost Supply',
  equipment: 'Equipment',
};

export function TailoredPlanView({
  plan,
  loading,
  error,
  city,
  selectedActionIds,
  onToggleAction,
  onGeneratePlan,
  canSaveCloud,
  onSavePlanCloud,
  savingPlan,
  savedNote,
  savedRoutines,
  onDeleteSavedRoutine,
  onPromptSignIn,
}: TailoredPlanViewProps) {
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('all');
  const [costFilter, setCostFilter] = useState<CostFilter>('all');

  const selectedSet = new Set(selectedActionIds);

  if (loading) {
    return (
      <section
        aria-busy="true"
        aria-live="polite"
        className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center gap-2.5 text-sm font-medium text-[#0369A1]">
          <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
          <span>Generating personalized low-emission routines and indoor air hacks for {city}...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((slot) => (
            <div
              key={slot}
              className="h-32 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        role="alert"
        className="bg-white border border-[#FECACA] rounded-xl p-6 space-y-3"
      >
        <h2 className="text-base font-semibold text-[#991B1B]">
          Could not generate tailored plan
        </h2>
        <p className="text-sm text-[#475569]">{error}</p>
        <button
          type="button"
          onClick={onGeneratePlan}
          className="px-4 py-2 min-h-[40px] text-sm font-medium text-white bg-[#0369A1] hover:bg-[#075985] rounded-lg transition-colors cursor-pointer"
        >
          Retry Plan Generation
        </button>
      </section>
    );
  }

  if (!plan) {
    return (
      <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 space-y-4">
        <h2 className="text-lg font-semibold text-[#0F172A]">
          Your Tailored Smog Plan Ready to Build
        </h2>
        <p className="text-sm text-[#475569] max-w-2xl leading-relaxed">
          Select your household members, home fuels, and indoor equipment above, then click{' '}
          <strong className="text-[#0F172A]">Generate Tailored Smog Plan</strong> to receive
          hour-by-hour routines, practical indoor air hacks, and fuel/commute swaps with clear exposure and carbon impact numbers.
        </p>
        <button
          type="button"
          onClick={onGeneratePlan}
          className="px-4 py-2.5 min-h-[42px] text-sm font-medium text-white bg-[#0369A1] hover:bg-[#075985] rounded-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0369A1]"
        >
          Generate Plan for {city}
        </button>
      </section>
    );
  }

  const filteredHacks =
    costFilter === 'all'
      ? plan.indoorHacks
      : plan.indoorHacks.filter((h) => h.costTier === costFilter);

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="tailored-plan-heading"
        className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 space-y-6"
      >
        {/* Plan Summary & Cloud Save Action */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-[#F1F5F9] pb-5">
          <div className="space-y-2 max-w-3xl">
            <h2
              id="tailored-plan-heading"
              className="text-xl font-bold text-[#0F172A]"
            >
              {plan.headline}
            </h2>
            <p className="text-sm text-[#334155] leading-relaxed">
              {plan.whySmogHappensHere}
            </p>
            <p className="text-sm text-[#0369A1] font-medium">
              Ventilation guidance: {plan.ventilationGuidance}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 shrink-0">
            {canSaveCloud ? (
              <button
                type="button"
                onClick={onSavePlanCloud}
                disabled={savingPlan}
                className="min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#0369A1] hover:bg-[#075985] rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0369A1]"
              >
                <BookmarkPlus aria-hidden="true" className="w-4 h-4" />
                <span>{savingPlan ? 'Saving...' : 'Save Plan to Cloud'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onPromptSignIn}
                className="min-h-[40px] px-4 py-2 text-sm font-medium text-[#0369A1] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0369A1]"
              >
                Sign in to save plan across devices
              </button>
            )}
            {savedNote && (
              <span className="text-xs font-medium text-[#15803D]">
                {savedNote}
              </span>
            )}
          </div>
        </div>

        {/* Interactive Section Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Filter plan sections"
            className="flex flex-wrap items-center gap-1 p-1 bg-[#F1F5F9] rounded-lg"
          >
            {(
              [
                { id: 'all', label: 'All Guidance' },
                { id: 'routine', label: 'Daily Routine' },
                { id: 'hacks', label: 'Indoor Air Hacks' },
                { id: 'alternatives', label: 'Sustainable Swaps' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={sectionFilter === tab.id}
                onClick={() => setSectionFilter(tab.id)}
                className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  sectionFilter === tab.id
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {(sectionFilter === 'all' || sectionFilter === 'hacks') && (
            <div
              role="group"
              aria-label="Filter indoor hacks by cost"
              className="flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-lg"
            >
              {(
                [
                  { id: 'all', label: 'All Costs' },
                  { id: 'zero_cost', label: 'Zero-Cost' },
                  { id: 'low_cost', label: 'Low-Cost' },
                  { id: 'equipment', label: 'Equipment' },
                ] as const
              ).map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  aria-pressed={costFilter === tier.id}
                  onClick={() => setCostFilter(tier.id)}
                  className={`px-2.5 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    costFilter === tier.id
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 1. Low-Emission Daily Routine */}
        {(sectionFilter === 'all' || sectionFilter === 'routine') && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
              <Clock aria-hidden="true" className="w-4 h-4 text-[#0369A1]" />
              <span>Low-Emission Daily Routine</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plan.dailyRoutine.map((slot) => {
                const actionId = `routine:${slot.id}`;
                const active = selectedSet.has(actionId);
                return (
                  <article
                    key={slot.id}
                    className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs text-[#475569]">
                        <span className="font-mono tabular-nums font-medium text-[#0369A1]">
                          {slot.timeWindow}
                        </span>
                        <span className="font-mono tabular-nums">
                          -{slot.exposureReductionPct}% exposure ·{' '}
                          {slot.weeklyCo2SavedKg} kg CO₂e/wk
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-[#0F172A]">
                        {slot.title}
                      </h4>
                      <p className="text-sm text-[#334155] leading-relaxed">
                        {slot.action}
                      </p>
                      <p className="text-xs text-[#475569] leading-relaxed pt-1 border-t border-[#E2E8F0]">
                        <strong className="text-[#0F172A]">Direct impact:</strong>{' '}
                        {slot.whyItMatters}
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => onToggleAction(actionId)}
                      className={`w-full min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                        active
                          ? 'bg-[#EFF6FF] border-[#0369A1] text-[#0369A1]'
                          : 'bg-white border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {active && <Check aria-hidden="true" className="w-3.5 h-3.5" />}
                      <span>
                        {active ? 'Included in Impact Simulator' : 'Add to Daily Simulator'}
                      </span>
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Indoor Air Quality Hacks */}
        {(sectionFilter === 'all' || sectionFilter === 'hacks') && (
          <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
            <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
              <Home aria-hidden="true" className="w-4 h-4 text-[#0369A1]" />
              <span>Indoor Air Quality Hacks</span>
            </h3>
            {filteredHacks.length === 0 ? (
              <p className="text-sm text-[#64748B]">
                No indoor hacks match that cost filter. Select “All Costs” to view all suggestions.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredHacks.map((hack) => {
                  const actionId = `hack:${hack.id}`;
                  const active = selectedSet.has(actionId);
                  return (
                    <article
                      key={hack.id}
                      className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 text-xs text-[#475569]">
                          <span className="font-medium text-[#334155]">
                            {COST_LABELS[hack.costTier]}
                          </span>
                          <span className="font-mono tabular-nums">
                            -{hack.exposureReductionPct}% indoor PM2.5
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-[#0F172A]">
                          {hack.title}
                        </h4>
                        <p className="text-sm text-[#334155] leading-relaxed">
                          {hack.steps}
                        </p>
                        <p className="text-xs text-[#475569] leading-relaxed pt-1 border-t border-[#E2E8F0]">
                          <strong className="text-[#0F172A]">Why it works:</strong>{' '}
                          {hack.directImpactExplanation}
                        </p>
                      </div>

                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => onToggleAction(actionId)}
                        className={`w-full min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                          active
                            ? 'bg-[#EFF6FF] border-[#0369A1] text-[#0369A1]'
                            : 'bg-white border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
                        }`}
                      >
                        {active && <Check aria-hidden="true" className="w-3.5 h-3.5" />}
                        <span>
                          {active ? 'Included in Impact Simulator' : 'Add to Daily Simulator'}
                        </span>
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. Sustainable Alternatives */}
        {(sectionFilter === 'all' || sectionFilter === 'alternatives') && (
          <div className="space-y-3 pt-2 border-t border-[#F1F5F9]">
            <h3 className="text-base font-semibold text-[#0F172A] flex items-center gap-2">
              <Leaf aria-hidden="true" className="w-4 h-4 text-[#15803D]" />
              <span>Sustainable Alternatives & Emission Swaps</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plan.sustainableAlternatives.map((alt) => {
                const actionId = `alt:${alt.id}`;
                const active = selectedSet.has(actionId);
                return (
                  <article
                    key={alt.id}
                    className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2">
                      <div className="text-xs text-[#475569] flex items-center justify-between gap-2">
                        <span className="capitalize font-medium text-[#15803D]">
                          {alt.category}
                        </span>
                        <span className="font-mono tabular-nums">
                          {alt.weeklyCo2SavedKg} kg CO₂e/wk
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-[#0F172A]">
                        {alt.alternative}
                      </h4>
                      <p className="text-xs text-[#64748B]">
                        Replaces: {alt.replaces}
                      </p>
                      <p className="text-xs text-[#334155] leading-relaxed pt-1 border-t border-[#E2E8F0]">
                        {alt.whyItMatters}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-[#0369A1]">
                        Prevents {alt.weeklyPm25AvoidedGrams} g PM2.5/week
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => onToggleAction(actionId)}
                      className={`w-full min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                        active
                          ? 'bg-[#EFF6FF] border-[#0369A1] text-[#0369A1]'
                          : 'bg-white border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {active && <Check aria-hidden="true" className="w-3.5 h-3.5" />}
                      <span>
                        {active ? 'Included in Impact Simulator' : 'Add to Daily Simulator'}
                      </span>
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Saved Cloud Plans History */}
      {canSaveCloud && savedRoutines.length > 0 && (
        <section
          aria-labelledby="saved-routines-heading"
          className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 space-y-4"
        >
          <h3
            id="saved-routines-heading"
            className="text-base font-semibold text-[#0F172A]"
          >
            Saved Household Plans ({savedRoutines.length})
          </h3>
          <div className="divide-y divide-[#E2E8F0]">
            {savedRoutines.map((item) => (
              <div
                key={item.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium text-[#0F172A]">
                    {item.city} · AQI{' '}
                    <span className="font-mono tabular-nums">
                      {item.aqiAtGeneration}
                    </span>{' '}
                    · Window{' '}
                    <span className="font-mono tabular-nums">
                      {item.ventilationWindow}
                    </span>
                  </div>
                  <p className="text-xs text-[#475569] line-clamp-2">
                    {item.summary}
                  </p>
                  <div className="text-xs font-mono tabular-nums text-[#15803D]">
                    -{item.estimatedPm25ReductionPct}% indoor exposure ·{' '}
                    {item.estimatedWeeklyCo2SavedKg} kg CO₂e/wk
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteSavedRoutine(item.id)}
                  aria-label={`Delete saved plan for ${item.city}`}
                  className="px-3 py-1.5 min-h-[36px] text-xs font-medium text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] rounded-lg inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
