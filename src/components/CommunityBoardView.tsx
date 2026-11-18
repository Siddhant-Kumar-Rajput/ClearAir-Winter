import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  HandHeart,
  Megaphone,
  Plus,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  type CommunityPledge,
  type ObservedSmogSource,
  type PledgeCategory,
  type SmogReport,
  type SmogSeverityReport,
  VALIDATION_LIMITS,
} from '../types/airQuality.ts';

interface CommunityBoardViewProps {
  currentCity: string;
  user: User | null;
  displayAlias: string;
  pledges: CommunityPledge[];
  reports: SmogReport[];
  onSignIn: () => void;
  onCreatePledge: (input: {
    city: string;
    category: PledgeCategory;
    actionTitle: string;
    impactExplanation: string;
    weeklyCo2SavedKg: number;
  }) => Promise<void>;
  onSupportPledge: (pledgeId: string) => Promise<void>;
  onDeletePledge: (pledgeId: string) => Promise<void>;
  onCreateReport: (input: {
    city: string;
    neighborhood: string;
    severity: SmogSeverityReport;
    observedSource: ObservedSmogSource;
    note: string;
  }) => Promise<void>;
  onMarkReportHelpful: (reportId: string) => Promise<void>;
  onDeleteReport: (reportId: string) => Promise<void>;
}

type BoardFilter = 'all' | 'alerts' | 'pledges';

const SEVERITY_LABELS: Record<SmogSeverityReport, string> = {
  moderate: 'Moderate Haze',
  unhealthy_sensitive: 'Sensitive Group Alert',
  unhealthy: 'Unhealthy Smog',
  severe: 'Severe Smog Inversion',
};

const SOURCE_LABELS: Record<ObservedSmogSource, string> = {
  traffic_inversion: 'Traffic & cold inversion',
  wood_coal_smoke: 'Residential wood / coal smoke',
  industrial_haze: 'Industrial plume',
  construction_dust: 'Road & construction dust',
  mixed_smog: 'Mixed urban smog',
};

export function CommunityBoardView({
  currentCity,
  user,
  pledges,
  reports,
  onSignIn,
  onCreatePledge,
  onSupportPledge,
  onDeletePledge,
  onCreateReport,
  onMarkReportHelpful,
  onDeleteReport,
}: CommunityBoardViewProps) {
  const [boardFilter, setBoardFilter] = useState<BoardFilter>('all');
  const [cityFilter, setCityFilter] = useState('');
  const [activeComposer, setActiveComposer] = useState<'none' | 'pledge' | 'report'>('none');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Pledge form state
  const [pledgeCategory, setPledgeCategory] = useState<PledgeCategory>('commute');
  const [actionTitle, setActionTitle] = useState('');
  const [impactExplanation, setImpactExplanation] = useState('');
  const [weeklyCo2SavedKg, setWeeklyCo2SavedKg] = useState('6.5');

  // Smog report form state
  const [neighborhood, setNeighborhood] = useState('');
  const [reportSeverity, setReportSeverity] = useState<SmogSeverityReport>('unhealthy');
  const [observedSource, setObservedSource] =
    useState<ObservedSmogSource>('traffic_inversion');
  const [reportNote, setReportNote] = useState('');

  const normalizedFilter = cityFilter.trim().toLowerCase();
  const visibleReports = reports.filter((r) =>
    normalizedFilter ? r.city.toLowerCase().includes(normalizedFilter) : true,
  );
  const visiblePledges = pledges.filter((p) =>
    normalizedFilter ? p.city.toLowerCase().includes(normalizedFilter) : true,
  );

  const totalWeeklyCommunityCo2 = visiblePledges.reduce(
    (sum, item) => sum + item.weeklyCo2SavedKg * item.supportersCount,
    0,
  );

  const handlePledgeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      onSignIn();
      return;
    }
    if (actionTitle.trim().length < VALIDATION_LIMITS.actionTitle.min) {
      setFormError('Please describe your pledge title (at least 3 characters).');
      return;
    }
    if (impactExplanation.trim().length < VALIDATION_LIMITS.impactExplanation.min) {
      setFormError('Please explain how this choice reduces smog or exposure.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await onCreatePledge({
        city: currentCity,
        category: pledgeCategory,
        actionTitle: actionTitle.trim(),
        impactExplanation: impactExplanation.trim(),
        weeklyCo2SavedKg: Number.parseFloat(weeklyCo2SavedKg) || 0,
      });
      setActionTitle('');
      setImpactExplanation('');
      setActiveComposer('none');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save pledge.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      onSignIn();
      return;
    }
    if (neighborhood.trim().length < 1) {
      setFormError('Enter your neighborhood or district name.');
      return;
    }
    if (reportNote.trim().length < VALIDATION_LIMITS.smogNote.min) {
      setFormError('Add a brief observation note (at least 5 characters).');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await onCreateReport({
        city: currentCity,
        neighborhood: neighborhood.trim(),
        severity: reportSeverity,
        observedSource,
        note: reportNote.trim(),
      });
      setNeighborhood('');
      setReportNote('');
      setActiveComposer('none');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to post smog alert.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="community-board-heading"
      className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 space-y-6"
    >
      {/* Header & Collective Impact Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#F1F5F9] pb-5">
        <div className="space-y-1">
          <h2
            id="community-board-heading"
            className="text-xl font-bold text-[#0F172A]"
          >
            Neighborhood Smog Alerts & Community Action Board
          </h2>
          <p className="text-sm text-[#475569]">
            Live community observations and shared clean-air commitments ·{' '}
            <span className="font-mono tabular-nums font-medium text-[#15803D]">
              {Math.round(totalWeeklyCommunityCo2 * 10) / 10} kg CO₂e/week
            </span>{' '}
            collective neighborhood commitment
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (!user) {
                onSignIn();
                return;
              }
              setFormError(null);
              setActiveComposer(activeComposer === 'report' ? 'none' : 'report');
            }}
            className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Megaphone aria-hidden="true" className="w-4 h-4 text-[#B45309]" />
            <span>Post Smog Alert</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!user) {
                onSignIn();
                return;
              }
              setFormError(null);
              setActiveComposer(activeComposer === 'pledge' ? 'none' : 'pledge');
            }}
            className="min-h-[40px] px-3.5 py-2 text-xs font-medium text-white bg-[#0369A1] hover:bg-[#075985] rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus aria-hidden="true" className="w-4 h-4" />
            <span>Share Clean Pledge</span>
          </button>
        </div>
      </div>

      {!user && (
        <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-[#334155]">
            Browsing public neighborhood updates as a guest. Sign in with Google to post local smog alerts, publish pledges, or upvote neighbor actions.
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="min-h-[38px] px-4 py-1.5 text-xs font-medium text-white bg-[#0369A1] hover:bg-[#075985] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            Sign In with Google
          </button>
        </div>
      )}

      {/* Composer Forms */}
      {activeComposer === 'pledge' && (
        <form
          onSubmit={handlePledgeSubmit}
          className="p-4 sm:p-5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#0F172A]">
              Publish a Clean-Air Pledge for {currentCity}
            </h3>
            <button
              type="button"
              onClick={() => setActiveComposer('none')}
              className="text-xs text-[#475569] hover:text-[#0F172A] cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label
                htmlFor="pledge-title"
                className="block text-xs font-medium text-[#334155] mb-1"
              >
                Action commitment
              </label>
              <input
                id="pledge-title"
                type="text"
                maxLength={VALIDATION_LIMITS.actionTitle.max}
                required
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
                placeholder="e.g., Carpool 3 school runs per week and avoid morning engine idling"
                className="w-full min-h-[40px] px-3 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
              />
            </div>

            <div>
              <label
                htmlFor="pledge-category"
                className="block text-xs font-medium text-[#334155] mb-1"
              >
                Category
              </label>
              <select
                id="pledge-category"
                value={pledgeCategory}
                onChange={(e) =>
                  setPledgeCategory(e.target.value as PledgeCategory)
                }
                className="w-full min-h-[40px] px-3 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
              >
                <option value="commute">Clean Commute</option>
                <option value="heating">Low-Emission Heating</option>
                <option value="indoor_air">Indoor Air Care</option>
                <option value="cooking">Clean Cooking</option>
                <option value="community">Neighborhood Action</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-3">
              <label
                htmlFor="pledge-impact"
                className="block text-xs font-medium text-[#334155] mb-1"
              >
                Direct impact explanation
              </label>
              <input
                id="pledge-impact"
                type="text"
                maxLength={VALIDATION_LIMITS.impactExplanation.max}
                required
                value={impactExplanation}
                onChange={(e) => setImpactExplanation(e.target.value)}
                placeholder="Explain how this reduces local PM2.5 or household indoor exposure..."
                className="w-full min-h-[40px] px-3 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
              />
            </div>

            <div>
              <label
                htmlFor="pledge-co2"
                className="block text-xs font-medium text-[#334155] mb-1"
              >
                Est. kg CO₂e/week
              </label>
              <input
                id="pledge-co2"
                type="number"
                step="0.5"
                min={0}
                max={250}
                value={weeklyCo2SavedKg}
                onChange={(e) => setWeeklyCo2SavedKg(e.target.value)}
                className="w-full min-h-[40px] px-3 text-sm font-mono tabular-nums bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
              />
            </div>
          </div>

          {formError && (
            <p role="alert" className="text-xs text-[#B91C1C]">
              {formError}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#0369A1] hover:bg-[#075985] rounded-lg cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Publishing...' : 'Publish Pledge'}
            </button>
          </div>
        </form>
      )}

      {activeComposer === 'report' && (
        <form
          onSubmit={handleReportSubmit}
          className="p-4 sm:p-5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#0F172A]">
              Report Local Winter Smog Conditions in {currentCity}
            </h3>
            <button
              type="button"
              onClick={() => setActiveComposer('none')}
              className="text-xs text-[#475569] hover:text-[#0F172A] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="report-neighborhood"
                className="block text-xs font-medium text-[#334155] mb-1"
              >
                Neighborhood / Street area
              </label>
              <input
                id="report-neighborhood"
                type="text"
                maxLength={VALIDATION_LIMITS.neighborhood.max}
                required
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="e.g., Eastside Valley"
                className="w-full min-h-[40px] px-3 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
              />
            </div>

            <div>
              <label
                htmlFor="report-severity"
                className="block text-xs font-medium text-[#334155] mb-1"
              >
                Observed severity
              </label>
              <select
                id="report-severity"
                value={reportSeverity}
                onChange={(e) =>
                  setReportSeverity(e.target.value as SmogSeverityReport)
                }
                className="w-full min-h-[40px] px-3 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
              >
                <option value="moderate">Moderate Haze</option>
                <option value="unhealthy_sensitive">Sensitive Group Alert</option>
                <option value="unhealthy">Unhealthy Smog</option>
                <option value="severe">Severe Smog Inversion</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="report-source"
                className="block text-xs font-medium text-[#334155] mb-1"
              >
                Primary visible source
              </label>
              <select
                id="report-source"
                value={observedSource}
                onChange={(e) =>
                  setObservedSource(e.target.value as ObservedSmogSource)
                }
                className="w-full min-h-[40px] px-3 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
              >
                <option value="traffic_inversion">Traffic & cold inversion</option>
                <option value="wood_coal_smoke">Wood / coal heating smoke</option>
                <option value="industrial_haze">Industrial haze</option>
                <option value="construction_dust">Construction / road dust</option>
                <option value="mixed_smog">Mixed urban smog</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="report-note"
              className="block text-xs font-medium text-[#334155] mb-1"
            >
              Practical neighbor note
            </label>
            <textarea
              id="report-note"
              rows={2}
              maxLength={VALIDATION_LIMITS.smogNote.max}
              required
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
              placeholder="e.g., Heavy wood-smoke inversion settling along the river corridor; keep classroom windows closed until noon."
              className="w-full p-3 text-sm bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
            />
          </div>

          {formError && (
            <p role="alert" className="text-xs text-[#B91C1C]">
              {formError}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-[#0369A1] hover:bg-[#075985] rounded-lg cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Posting...' : 'Post Smog Alert'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter community feed"
          className="flex items-center gap-1 p-1 bg-[#F1F5F9] rounded-lg self-start"
        >
          {(
            [
              { id: 'all', label: 'All Updates' },
              { id: 'alerts', label: `Smog Alerts (${visibleReports.length})` },
              { id: 'pledges', label: `Clean Pledges (${visiblePledges.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={boardFilter === tab.id}
              onClick={() => setBoardFilter(tab.id)}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                boardFilter === tab.id
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <label htmlFor="community-city-filter" className="sr-only">
            Filter community posts by city
          </label>
          <input
            id="community-city-filter"
            type="text"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Filter by city..."
            className="w-full min-h-[38px] px-3 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
          />
        </div>
      </div>

      {/* Feed Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(boardFilter === 'all' || boardFilter === 'alerts') && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
              <AlertTriangle aria-hidden="true" className="w-4 h-4 text-[#B45309]" />
              <span>Neighborhood Smog Observations</span>
            </h3>
            {visibleReports.length === 0 ? (
              <p className="text-sm text-[#64748B] p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                No neighborhood smog observations posted yet for this filter. Post the first update to alert nearby families.
              </p>
            ) : (
              <div className="space-y-3">
                {visibleReports.map((report) => {
                  const isOwner = user?.uid === report.authorUid;
                  return (
                    <article
                      key={report.id}
                      className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-[#475569]">
                        <span className="font-semibold text-[#B45309]">
                          {SEVERITY_LABELS[report.severity]}
                        </span>
                        <span>
                          {report.neighborhood} · {report.city}
                        </span>
                      </div>
                      <p className="text-sm text-[#0F172A] leading-relaxed">
                        {report.note}
                      </p>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E2E8F0] text-xs text-[#64748B]">
                        <span>
                          {SOURCE_LABELS[report.observedSource]} · by{' '}
                          {report.displayAlias}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              user ? onMarkReportHelpful(report.id) : onSignIn()
                            }
                            className="px-2.5 py-1 min-h-[32px] text-xs font-medium text-[#334155] bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] rounded-md inline-flex items-center gap-1 cursor-pointer"
                          >
                            <ThumbsUp aria-hidden="true" className="w-3.5 h-3.5" />
                            <span className="font-mono tabular-nums">
                              {report.helpfulCount}
                            </span>
                          </button>
                          {isOwner && (
                            <button
                              type="button"
                              aria-label="Delete smog report"
                              onClick={() => onDeleteReport(report.id)}
                              className="p-1.5 text-[#B91C1C] hover:bg-[#FEE2E2] rounded-md cursor-pointer"
                            >
                              <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {(boardFilter === 'all' || boardFilter === 'pledges') && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
              <HandHeart aria-hidden="true" className="w-4 h-4 text-[#15803D]" />
              <span>Community Clean-Air Pledges</span>
            </h3>
            {visiblePledges.length === 0 ? (
              <p className="text-sm text-[#64748B] p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                No clean-air pledges shared yet for this filter. Share a practical household commitment to inspire neighbors.
              </p>
            ) : (
              <div className="space-y-3">
                {visiblePledges.map((pledge) => {
                  const isOwner = user?.uid === pledge.authorUid;
                  return (
                    <article
                      key={pledge.id}
                      className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-[#475569]">
                        <span className="capitalize font-medium text-[#15803D]">
                          {pledge.category.replace('_', ' ')} · {pledge.city}
                        </span>
                        <span className="font-mono tabular-nums text-[#0F172A]">
                          {pledge.weeklyCo2SavedKg} kg CO₂e/wk
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-[#0F172A]">
                        {pledge.actionTitle}
                      </h4>
                      <p className="text-xs text-[#334155] leading-relaxed">
                        {pledge.impactExplanation}
                      </p>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E2E8F0] text-xs text-[#64748B]">
                        <span>Shared by {pledge.displayAlias}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              user ? onSupportPledge(pledge.id) : onSignIn()
                            }
                            className="px-2.5 py-1 min-h-[32px] text-xs font-medium text-[#0369A1] bg-white border border-[#CBD5E1] hover:bg-[#EFF6FF] rounded-md inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Support</span>
                            <span className="font-mono tabular-nums font-semibold">
                              ({pledge.supportersCount})
                            </span>
                          </button>
                          {isOwner && (
                            <button
                              type="button"
                              aria-label="Delete clean pledge"
                              onClick={() => onDeletePledge(pledge.id)}
                              className="p-1.5 text-[#B91C1C] hover:bg-[#FEE2E2] rounded-md cursor-pointer"
                            >
                              <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
