import { ArrowDownRight, Leaf, ShieldCheck } from 'lucide-react';
import type { DailyAirQualityPoint, HouseholdProfile } from '../types/airQuality.ts';
import {
  calculateChoiceImpact,
  WHO_24H_PM25_GUIDELINE,
  type ImpactActionInput,
} from '../utils/impactCalculator.ts';
import { ImpactHistoryD3Chart } from './ImpactHistoryD3Chart.tsx';

interface ImpactSimulatorPanelProps {
  outdoorPm25: number;
  city: string;
  dailyHistory: DailyAirQualityPoint[];
  profile: HouseholdProfile;
  availableActions: Array<ImpactActionInput & { label: string }>;
  selectedActionIds: string[];
  onToggleAction: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export function ImpactSimulatorPanel({
  outdoorPm25,
  city,
  dailyHistory,
  profile,
  availableActions,
  selectedActionIds,
  onToggleAction,
  onSelectAll,
  onClearAll,
}: ImpactSimulatorPanelProps) {
  const selectedSet = new Set(selectedActionIds);
  const selectedActions = availableActions.filter((a) => selectedSet.has(a.id));
  const impact = calculateChoiceImpact(outdoorPm25, profile, selectedActions);

  const baselineWidthPct = Math.min(
    100,
    Math.max(12, Math.round((impact.baselineIndoorPm25 / Math.max(outdoorPm25, 40)) * 100)),
  );
  const projectedWidthPct = Math.min(
    100,
    Math.max(6, Math.round((impact.projectedIndoorPm25 / Math.max(outdoorPm25, 40)) * 100)),
  );

  return (
    <section
      aria-labelledby="impact-simulator-heading"
      className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2
            id="impact-simulator-heading"
            className="text-lg font-semibold text-[#0F172A]"
          >
            Direct Choice Impact Simulator
          </h2>
          <p className="text-sm text-[#475569]">
            Toggle actions below to see how your daily choices cut indoor PM2.5 inhalation and neighborhood emissions in {city}
          </p>
        </div>

        {availableActions.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onSelectAll}
              className="px-3 py-1.5 text-xs font-medium text-[#0369A1] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0369A1]"
            >
              Apply All
            </button>
            <button
              type="button"
              onClick={onClearAll}
              className="px-3 py-1.5 text-xs font-medium text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0369A1]"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Quantified 4-Metric Impact Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-live="polite">
        <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
          <div className="text-xs text-[#475569]">Indoor PM2.5 Exposure</div>
          <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-[#0F172A]">
            {impact.projectedIndoorPm25}{' '}
            <span className="text-xs font-sans font-normal text-[#64748B]">
              µg/m³
            </span>
          </div>
          <div className="mt-1 text-xs text-[#15803D] font-medium inline-flex items-center gap-1">
            <ArrowDownRight aria-hidden="true" className="w-3.5 h-3.5" />
            <span className="font-mono tabular-nums">
              -{impact.indoorReductionPct}%
            </span>{' '}
            vs. {impact.baselineIndoorPm25} baseline
          </div>
        </div>

        <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
          <div className="text-xs text-[#475569]">WHO Guideline Ratio</div>
          <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-[#0F172A]">
            {impact.whoGuidelineRatio}x
          </div>
          <div className="mt-1 text-xs text-[#64748B]">
            Relative to {WHO_24H_PM25_GUIDELINE} µg/m³ safe target
          </div>
        </div>

        <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
          <div className="text-xs text-[#475569]">Weekly Carbon Avoided</div>
          <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-[#15803D] inline-flex items-baseline gap-1.5">
            <span>{impact.weeklyCo2SavedKg}</span>
            <span className="text-xs font-sans font-normal text-[#475569]">
              kg CO₂e
            </span>
          </div>
          <div className="mt-1 text-xs font-mono tabular-nums text-[#64748B] flex items-center gap-1">
            <Leaf aria-hidden="true" className="w-3.5 h-3.5 text-[#15803D]" />
            <span>{impact.seasonalCo2SavedKg} kg per winter</span>
          </div>
        </div>

        <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
          <div className="text-xs text-[#475569]">Direct Smog Particles Prevented</div>
          <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-[#0369A1]">
            {impact.weeklyPm25AvoidedGrams}{' '}
            <span className="text-xs font-sans font-normal text-[#64748B]">
              g PM2.5/wk
            </span>
          </div>
          <div className="mt-1 text-xs text-[#64748B] flex items-center gap-1">
            <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 text-[#0369A1]" />
            <span>{impact.selectedCount} active habits selected</span>
          </div>
        </div>
      </div>

      {/* Visual Before/After Bar Comparison */}
      <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[#334155]">
            Estimated Indoor Air Quality Comparison (Outdoor: {outdoorPm25} µg/m³)
          </span>
          <span className="font-mono tabular-nums text-[#475569]">
            WHO Target: {WHO_24H_PM25_GUIDELINE} µg/m³
          </span>
        </div>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#475569]">Without selected changes</span>
              <span className="font-mono tabular-nums text-[#0F172A]">
                {impact.baselineIndoorPm25} µg/m³
              </span>
            </div>
            <div className="h-2.5 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
              <div
                style={{ width: `${baselineWidthPct}%` }}
                className="h-full bg-[#94A3B8] rounded-full transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[#0369A1]">
                With {impact.selectedCount} active choices
              </span>
              <span className="font-mono tabular-nums font-semibold text-[#0369A1]">
                {impact.projectedIndoorPm25} µg/m³
              </span>
            </div>
            <div className="h-2.5 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
              <div
                style={{ width: `${projectedWidthPct}%` }}
                className="h-full bg-[#0369A1] rounded-full transition-all duration-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Historical Air Quality vs. Chosen Habits D3 Chart */}
      <ImpactHistoryD3Chart
        city={city}
        dailyHistory={dailyHistory}
        profile={profile}
        selectedActions={selectedActions}
      />

      {/* Action Toggle List */}
      {availableActions.length === 0 ? (
        <p className="text-sm text-[#475569] py-4 border-t border-[#F1F5F9]">
          Generate a tailored smog plan first to simulate and toggle individual routines, indoor hacks, and fuel/commute alternatives.
        </p>
      ) : (
        <div className="space-y-2 pt-2 border-t border-[#F1F5F9]">
          <h3 className="text-xs font-semibold text-[#334155]">
            Active Habits Included in Simulation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {availableActions.map((action) => {
              const checked = selectedSet.has(action.id);
              return (
                <label
                  key={action.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    checked
                      ? 'bg-[#EFF6FF]/60 border-[#0369A1]/40'
                      : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleAction(action.id)}
                    className="mt-0.5 w-4 h-4 accent-[#0369A1] rounded cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[#0F172A]">
                      {action.label}
                    </div>
                    <div className="text-xs font-mono tabular-nums text-[#475569] mt-0.5">
                      -{action.exposureReductionPct}% exposure ·{' '}
                      {action.weeklyCo2SavedKg} kg CO₂e/wk ·{' '}
                      {action.weeklyPm25AvoidedGrams} g PM2.5/wk
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
