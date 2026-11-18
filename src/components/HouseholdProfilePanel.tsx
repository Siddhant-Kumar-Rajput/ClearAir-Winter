import { Check, Loader2, Sparkles } from 'lucide-react';
import type {
  CommuteMode,
  CookingFuel,
  HeatingFuel,
  HomeType,
  HouseholdProfile,
  IndoorGear,
  SensitiveGroup,
} from '../types/airQuality.ts';
import { VALIDATION_LIMITS } from '../types/airQuality.ts';

interface HouseholdProfilePanelProps {
  profile: HouseholdProfile;
  onChange: (next: HouseholdProfile) => void;
  onGeneratePlan: () => void;
  generatingPlan: boolean;
  canSaveCloud: boolean;
  onSaveProfileCloud: () => void;
  savingProfile: boolean;
  profileSavedNote: string | null;
}

const SENSITIVE_OPTIONS: Array<{ id: SensitiveGroup; label: string }> = [
  { id: 'children', label: 'Infants or children' },
  { id: 'seniors', label: 'Older adults (65+)' },
  { id: 'asthma_respiratory', label: 'Asthma or respiratory care' },
  { id: 'pregnant', label: 'Pregnancy' },
];

const GEAR_OPTIONS: Array<{ id: IndoorGear; label: string }> = [
  { id: 'hepa_purifier', label: 'HEPA air purifier' },
  { id: 'box_fan_diy', label: 'Box fan + MERV-13 filter' },
  { id: 'kitchen_exhaust', label: 'Vented kitchen hood' },
  { id: 'window_seals', label: 'Window draft seals' },
  { id: 'hygrometer', label: 'Humidity meter' },
  { id: 'n95_masks', label: 'N95 / FFP2 masks' },
];

export function HouseholdProfilePanel({
  profile,
  onChange,
  onGeneratePlan,
  generatingPlan,
  canSaveCloud,
  onSaveProfileCloud,
  savingProfile,
  profileSavedNote,
}: HouseholdProfilePanelProps) {
  const toggleSensitive = (group: SensitiveGroup) => {
    const exists = profile.sensitiveGroups.includes(group);
    const next = exists
      ? profile.sensitiveGroups.filter((g) => g !== group)
      : [...profile.sensitiveGroups, group].slice(
          0,
          VALIDATION_LIMITS.sensitiveGroupsMax,
        );
    onChange({ ...profile, sensitiveGroups: next });
  };

  const toggleGear = (gear: IndoorGear) => {
    const exists = profile.indoorGear.includes(gear);
    const next = exists
      ? profile.indoorGear.filter((g) => g !== gear)
      : [...profile.indoorGear, gear].slice(0, VALIDATION_LIMITS.indoorGearMax);
    onChange({ ...profile, indoorGear: next });
  };

  return (
    <section
      aria-labelledby="household-profile-heading"
      className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2
            id="household-profile-heading"
            className="text-lg font-semibold text-[#0F172A]"
          >
            Household & Lifestyle Profile
          </h2>
          <p className="text-sm text-[#475569]">
            Tailors routines, indoor air hacks, and fuel/commute swaps to your home
          </p>
        </div>
        {canSaveCloud && (
          <div className="flex items-center gap-3">
            {profileSavedNote && (
              <span className="text-xs text-[#15803D] font-medium">
                {profileSavedNote}
              </span>
            )}
            <button
              type="button"
              onClick={onSaveProfileCloud}
              disabled={savingProfile}
              className="px-3.5 py-2 min-h-[40px] text-xs font-medium text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0369A1]"
            >
              {savingProfile ? 'Saving...' : 'Save Household Defaults'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="household-alias"
            className="block text-xs font-medium text-[#334155] mb-1.5"
          >
            Household name
          </label>
          <input
            id="household-alias"
            type="text"
            maxLength={VALIDATION_LIMITS.displayAlias.max}
            value={profile.displayAlias}
            onChange={(e) =>
              onChange({ ...profile, displayAlias: e.target.value })
            }
            className="w-full min-h-[40px] px-3 text-sm text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
          />
        </div>

        <div>
          <label
            htmlFor="residents-count"
            className="block text-xs font-medium text-[#334155] mb-1.5"
          >
            People in household
          </label>
          <input
            id="residents-count"
            type="number"
            min={1}
            max={20}
            value={profile.residentsCount}
            onChange={(e) =>
              onChange({
                ...profile,
                residentsCount: Math.min(
                  20,
                  Math.max(1, Number.parseInt(e.target.value || '1', 10)),
                ),
              })
            }
            className="w-full min-h-[40px] px-3 text-sm font-mono tabular-nums text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
          />
        </div>

        <div>
          <label
            htmlFor="home-type"
            className="block text-xs font-medium text-[#334155] mb-1.5"
          >
            Home structure
          </label>
          <select
            id="home-type"
            value={profile.homeType}
            onChange={(e) =>
              onChange({ ...profile, homeType: e.target.value as HomeType })
            }
            className="w-full min-h-[40px] px-3 text-sm text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
          >
            <option value="apartment">Apartment / Flat</option>
            <option value="townhouse">Townhouse / Duplex</option>
            <option value="detached_house">Detached House</option>
            <option value="shared_housing">Shared / Multi-family Home</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="heating-fuel"
            className="block text-xs font-medium text-[#334155] mb-1.5"
          >
            Primary winter heating
          </label>
          <select
            id="heating-fuel"
            value={profile.heatingFuel}
            onChange={(e) =>
              onChange({
                ...profile,
                heatingFuel: e.target.value as HeatingFuel,
              })
            }
            className="w-full min-h-[40px] px-3 text-sm text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
          >
            <option value="natural_gas">Natural gas furnace / boiler</option>
            <option value="electric_heat_pump">Electric heat pump / radiator</option>
            <option value="district_heating">Municipal district heating</option>
            <option value="wood_coal">Wood stove / coal / solid fuel</option>
            <option value="kerosene_oil">Kerosene / heating oil</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="cooking-fuel"
            className="block text-xs font-medium text-[#334155] mb-1.5"
          >
            Daily cooking setup
          </label>
          <select
            id="cooking-fuel"
            value={profile.cookingFuel}
            onChange={(e) =>
              onChange({
                ...profile,
                cookingFuel: e.target.value as CookingFuel,
              })
            }
            className="w-full min-h-[40px] px-3 text-sm text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
          >
            <option value="natural_gas">Natural gas range</option>
            <option value="induction_electric">Induction / electric stove</option>
            <option value="lpg_cylinder">LPG gas cylinder</option>
            <option value="biomass_solid">Solid biomass / charcoal</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="commute-mode"
            className="block text-xs font-medium text-[#334155] mb-1.5"
          >
            Primary daily commute
          </label>
          <select
            id="commute-mode"
            value={profile.commuteMode}
            onChange={(e) =>
              onChange({
                ...profile,
                commuteMode: e.target.value as CommuteMode,
              })
            }
            className="w-full min-h-[40px] px-3 text-sm text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
          >
            <option value="car_petrol_diesel">Petrol / diesel car</option>
            <option value="car_ev_hybrid">EV or plug-in hybrid</option>
            <option value="public_transit">Metro / bus / rail transit</option>
            <option value="walk_bike">Walking or cycling</option>
            <option value="remote_wfh">Mostly work from home</option>
          </select>
        </div>
      </div>

      {/* Sensitive Groups & Indoor Gear */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2 border-t border-[#F1F5F9]">
        <fieldset>
          <legend className="text-xs font-medium text-[#334155] mb-2">
            Health & sensitive household members
          </legend>
          <div className="flex flex-wrap gap-2">
            {SENSITIVE_OPTIONS.map((opt) => {
              const active = profile.sensitiveGroups.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSensitive(opt.id)}
                  className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-lg border transition-colors inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0369A1] ${
                    active
                      ? 'bg-[#EFF6FF] border-[#0369A1] text-[#0369A1]'
                      : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {active && <Check aria-hidden="true" className="w-3.5 h-3.5" />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-medium text-[#334155] mb-2">
            Clean-air tools already at home
          </legend>
          <div className="flex flex-wrap gap-2">
            {GEAR_OPTIONS.map((opt) => {
              const active = profile.indoorGear.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleGear(opt.id)}
                  className={`px-3 py-2 min-h-[40px] text-xs font-medium rounded-lg border transition-colors inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0369A1] ${
                    active
                      ? 'bg-[#EFF6FF] border-[#0369A1] text-[#0369A1]'
                      : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]'
                  }`}
                >
                  {active && <Check aria-hidden="true" className="w-3.5 h-3.5" />}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#F1F5F9]">
        <p className="text-xs text-[#475569]">
          ClearAir AI uses your local hourly forecast and household setup to quantify exposure and emission savings.
        </p>
        <button
          type="button"
          onClick={onGeneratePlan}
          disabled={generatingPlan}
          className="min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-[#0369A1] hover:bg-[#075985] rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0369A1]"
        >
          {generatingPlan ? (
            <>
              <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
              <span>Building Tailored Plan...</span>
            </>
          ) : (
            <>
              <Sparkles aria-hidden="true" className="w-4 h-4" />
              <span>Generate Tailored Smog Plan</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
