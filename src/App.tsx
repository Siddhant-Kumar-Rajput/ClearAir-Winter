import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdvisorChatPanel } from './components/AdvisorChatPanel.tsx';
import { CommunityBoardView } from './components/CommunityBoardView.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { HouseholdProfilePanel } from './components/HouseholdProfilePanel.tsx';
import { ImpactSimulatorPanel } from './components/ImpactSimulatorPanel.tsx';
import { LocationTelemetryBar } from './components/LocationTelemetryBar.tsx';
import { TailoredPlanView } from './components/TailoredPlanView.tsx';
import { TopNav, type WorkspaceTab } from './components/TopNav.tsx';
import {
  askAdvisorApi,
  fetchLiveAirQualityApi,
  generateTailoredPlanApi,
  searchCitiesApi,
} from './lib/apiClient.ts';
import {
  auth,
  googleProvider,
  testFirestoreConnection,
} from './lib/firebase.ts';
import {
  createCommunityPledge,
  createSmogReport,
  deleteCommunityPledge,
  deleteSavedRoutine,
  deleteSmogReport,
  loadHouseholdProfile,
  markSmogReportHelpful,
  saveHouseholdProfile,
  saveRoutineToCloud,
  subscribeCommunityPledges,
  subscribeSavedRoutines,
  subscribeSmogReports,
  supportCommunityPledge,
} from './lib/firestoreStore.ts';
import type {
  AdvisorMessage,
  AirQualitySnapshot,
  CityMatch,
  CommunityPledge,
  HouseholdProfile,
  ObservedSmogSource,
  PledgeCategory,
  SavedRoutineRecord,
  SmogReport,
  SmogSeverityReport,
  TailoredPlanResponse,
} from './types/airQuality.ts';
import { calculateChoiceImpact } from './utils/impactCalculator.ts';

const DEFAULT_PROFILE: HouseholdProfile = {
  displayAlias: 'My Household',
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
  indoorGear: ['kitchen_exhaust', 'n95_masks'],
};

function ClearAirWorkspace() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');

  // Auth & Firebase Readiness
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Location & Live Air Quality Telemetry
  const [snapshot, setSnapshot] = useState<AirQualitySnapshot | null>(null);
  const [loadingAq, setLoadingAq] = useState(true);
  const [aqError, setAqError] = useState<string | null>(null);

  // Household Profile
  const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_PROFILE);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSavedNote, setProfileSavedNote] = useState<string | null>(null);

  // GenAI Plan & Impact Simulator
  const [plan, setPlan] = useState<TailoredPlanResponse | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savedPlanNote, setSavedPlanNote] = useState<string | null>(null);
  const [savedRoutines, setSavedRoutines] = useState<SavedRoutineRecord[]>([]);

  // Advisor Chat
  const [advisorMessages, setAdvisorMessages] = useState<AdvisorMessage[]>([]);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorError, setAdvisorError] = useState<string | null>(null);

  // Community Board
  const [pledges, setPledges] = useState<CommunityPledge[]>([]);
  const [reports, setReports] = useState<SmogReport[]>([]);

  const loadCityAirQuality = useCallback(
    async (params: {
      lat: number;
      lon: number;
      city?: string;
      country?: string;
    }) => {
      setLoadingAq(true);
      setAqError(null);
      try {
        const next = await fetchLiveAirQualityApi(params);
        setSnapshot(next);
        setProfile((prev) => ({
          ...prev,
          city: next.city,
          country: next.country,
          latitude: next.latitude,
          longitude: next.longitude,
        }));
      } catch (err) {
        setAqError(
          err instanceof Error
            ? err.message
            : 'Unable to retrieve air quality telemetry.',
        );
      } finally {
        setLoadingAq(false);
      }
    },
    [],
  );

  // Initial Firebase connection check + default city load
  useEffect(() => {
    void testFirestoreConnection();
    void loadCityAirQuality({
      lat: DEFAULT_PROFILE.latitude,
      lon: DEFAULT_PROFILE.longitude,
      city: DEFAULT_PROFILE.city,
      country: DEFAULT_PROFILE.country,
    });
  }, [loadCityAirQuality]);

  // Auth state listener + saved profile hydration
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        try {
          const saved = await loadHouseholdProfile(nextUser.uid);
          if (saved) {
            setProfile(saved);
            void loadCityAirQuality({
              lat: saved.latitude,
              lon: saved.longitude,
              city: saved.city,
              country: saved.country,
            });
          } else if (nextUser.displayName) {
            setProfile((prev) => ({
              ...prev,
              displayAlias: nextUser.displayName!.slice(0, 60),
            }));
          }
        } catch (err) {
          console.error('Failed to load cloud household profile:', err);
        }
      } else {
        setSavedRoutines([]);
      }
    });
    return () => unsub();
  }, [loadCityAirQuality]);

  // Public Community Listeners (Always available for public visibility == 'public' items)
  useEffect(() => {
    const unsubPledges = subscribeCommunityPledges(setPledges);
    const unsubReports = subscribeSmogReports(setReports);
    return () => {
      unsubPledges();
      unsubReports();
    };
  }, []);

  // Private Saved Routines Listener (Only when authenticated)
  useEffect(() => {
    if (!authReady || !user) return;
    const unsub = subscribeSavedRoutines(user.uid, setSavedRoutines);
    return () => unsub();
  }, [authReady, user]);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Google sign-in was cancelled.',
      );
    }
  };

  const handleSignOut = async () => {
    setAuthError(null);
    await signOut(auth);
  };

  const handleSelectCity = (city: CityMatch) => {
    void loadCityAirQuality({
      lat: city.latitude,
      lon: city.longitude,
      city: city.name,
      country: city.country,
    });
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setAqError('Browser geolocation is not supported on this device.');
      return;
    }
    setLoadingAq(true);
    setAqError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void loadCityAirQuality({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      (geoErr) => {
        setLoadingAq(false);
        setAqError(
          geoErr.code === geoErr.PERMISSION_DENIED
            ? 'Location access was denied. Please search your city above.'
            : 'Unable to determine GPS coordinates. Please search your city above.',
        );
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  const handleSaveProfileCloud = async () => {
    if (!user) return;
    setSavingProfile(true);
    setProfileSavedNote(null);
    try {
      await saveHouseholdProfile(user.uid, profile);
      setProfileSavedNote('Saved to cloud');
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Could not save profile.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const availableSimulatorActions = useMemo(() => {
    if (!plan) return [];
    return [
      ...plan.dailyRoutine.map((r) => ({
        id: `routine:${r.id}`,
        label: `${r.timeWindow} — ${r.title}`,
        exposureReductionPct: r.exposureReductionPct,
        weeklyCo2SavedKg: r.weeklyCo2SavedKg,
        weeklyPm25AvoidedGrams: r.weeklyPm25AvoidedGrams,
      })),
      ...plan.indoorHacks.map((h) => ({
        id: `hack:${h.id}`,
        label: h.title,
        exposureReductionPct: h.exposureReductionPct,
        weeklyCo2SavedKg: h.weeklyCo2SavedKg,
        weeklyPm25AvoidedGrams: h.weeklyPm25AvoidedGrams,
      })),
      ...plan.sustainableAlternatives.map((a) => ({
        id: `alt:${a.id}`,
        label: a.alternative,
        exposureReductionPct: a.exposureReductionPct,
        weeklyCo2SavedKg: a.weeklyCo2SavedKg,
        weeklyPm25AvoidedGrams: a.weeklyPm25AvoidedGrams,
      })),
    ];
  }, [plan]);

  const handleGeneratePlan = async () => {
    if (!snapshot) return;
    setGeneratingPlan(true);
    setPlanError(null);
    setSavedPlanNote(null);
    try {
      const generated = await generateTailoredPlanApi(snapshot, profile);
      setPlan(generated);
      // Pre-select recommended high-impact routine + top hacks in simulator
      const initialIds = [
        ...generated.dailyRoutine.slice(0, 2).map((r) => `routine:${r.id}`),
        ...generated.indoorHacks.slice(0, 2).map((h) => `hack:${h.id}`),
        ...generated.sustainableAlternatives.slice(0, 1).map((a) => `alt:${a.id}`),
      ];
      setSelectedActionIds(initialIds);
      if (activeTab === 'overview') {
        setActiveTab('plan');
      }
    } catch (err) {
      setPlanError(
        err instanceof Error ? err.message : 'Unable to generate smog plan.',
      );
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleToggleAction = (id: string) => {
    setSelectedActionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSavePlanCloud = async () => {
    if (!user || !snapshot || !plan) return;
    setSavingPlan(true);
    setSavedPlanNote(null);
    try {
      const selectedSet = new Set(selectedActionIds);
      const activeItems = availableSimulatorActions.filter((a) =>
        selectedSet.has(a.id),
      );
      const impact = calculateChoiceImpact(snapshot.pm25, profile, activeItems);

      await saveRoutineToCloud(user.uid, profile, {
        city: snapshot.city,
        aqiAtGeneration: snapshot.usAqi,
        pm25AtGeneration: snapshot.pm25,
        summary: plan.headline,
        ventilationWindow: snapshot.ventilation.windowLabel,
        highlights: [
          ...plan.dailyRoutine.map((r) => `${r.timeWindow}: ${r.title}`),
          ...plan.indoorHacks.map((h) => h.title),
        ].slice(0, 10),
        selectedActionIds,
        estimatedPm25ReductionPct: impact.indoorReductionPct,
        estimatedWeeklyCo2SavedKg: impact.weeklyCo2SavedKg,
      });
      setSavedPlanNote('Plan saved to your account');
    } catch (err) {
      setPlanError(
        err instanceof Error ? err.message : 'Failed to save plan to cloud.',
      );
    } finally {
      setSavingPlan(false);
    }
  };

  const handleAskAdvisor = async (question: string) => {
    if (!snapshot) return;
    const nowLabel = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const userMsg: AdvisorMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: question,
      timestamp: nowLabel,
    };
    const nextHistory = [...advisorMessages, userMsg];
    setAdvisorMessages(nextHistory);
    setAdvisorLoading(true);
    setAdvisorError(null);

    try {
      const reply = await askAdvisorApi({
        snapshot,
        profile,
        history: advisorMessages.map((m) => ({ role: m.role, text: m.text })),
        question,
      });
      setAdvisorMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    } catch (err) {
      setAdvisorError(
        err instanceof Error ? err.message : 'Advisor could not respond.',
      );
    } finally {
      setAdvisorLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 px-4 py-2 bg-[#0369A1] text-white text-sm font-medium rounded-lg"
      >
        Skip to main content
      </a>

      <TopNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        authReady={authReady}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      <main
        id="main-content"
        className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6"
      >
        {authError && (
          <div
            role="alert"
            className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-sm text-[#991B1B] flex items-center justify-between gap-4"
          >
            <span>{authError}</span>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              className="text-xs font-medium underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Always-present Live Location & AQI Telemetry Anchor */}
        <LocationTelemetryBar
          snapshot={snapshot}
          loading={loadingAq}
          error={aqError}
          onSelectCity={handleSelectCity}
          onUseGps={handleUseGps}
          onSearchCities={searchCitiesApi}
        />

        {/* Workspace Tab Views */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <HouseholdProfilePanel
              profile={profile}
              onChange={setProfile}
              onGeneratePlan={handleGeneratePlan}
              generatingPlan={generatingPlan}
              canSaveCloud={Boolean(user)}
              onSaveProfileCloud={handleSaveProfileCloud}
              savingProfile={savingProfile}
              profileSavedNote={profileSavedNote}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7">
                <TailoredPlanView
                  plan={plan}
                  loading={generatingPlan}
                  error={planError}
                  city={snapshot?.city ?? profile.city}
                  selectedActionIds={selectedActionIds}
                  onToggleAction={handleToggleAction}
                  onGeneratePlan={handleGeneratePlan}
                  canSaveCloud={Boolean(user)}
                  onSavePlanCloud={handleSavePlanCloud}
                  savingPlan={savingPlan}
                  savedNote={savedPlanNote}
                  savedRoutines={savedRoutines}
                  onDeleteSavedRoutine={async (id) => {
                    if (user) await deleteSavedRoutine(user.uid, id);
                  }}
                  onPromptSignIn={handleSignIn}
                />
              </div>

              <div className="lg:col-span-5">
                <AdvisorChatPanel
                  city={snapshot?.city ?? profile.city}
                  messages={advisorMessages}
                  loading={advisorLoading}
                  error={advisorError}
                  onSendQuestion={handleAskAdvisor}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plan' && (
          <div className="space-y-6">
            <HouseholdProfilePanel
              profile={profile}
              onChange={setProfile}
              onGeneratePlan={handleGeneratePlan}
              generatingPlan={generatingPlan}
              canSaveCloud={Boolean(user)}
              onSaveProfileCloud={handleSaveProfileCloud}
              savingProfile={savingProfile}
              profileSavedNote={profileSavedNote}
            />
            <TailoredPlanView
              plan={plan}
              loading={generatingPlan}
              error={planError}
              city={snapshot?.city ?? profile.city}
              selectedActionIds={selectedActionIds}
              onToggleAction={handleToggleAction}
              onGeneratePlan={handleGeneratePlan}
              canSaveCloud={Boolean(user)}
              onSavePlanCloud={handleSavePlanCloud}
              savingPlan={savingPlan}
              savedNote={savedPlanNote}
              savedRoutines={savedRoutines}
              onDeleteSavedRoutine={async (id) => {
                if (user) await deleteSavedRoutine(user.uid, id);
              }}
              onPromptSignIn={handleSignIn}
            />
          </div>
        )}

        {activeTab === 'impact' && (
          <div className="space-y-6">
            <ImpactSimulatorPanel
              outdoorPm25={snapshot?.pm25 ?? 45}
              city={snapshot?.city ?? profile.city}
              profile={profile}
              availableActions={availableSimulatorActions}
              selectedActionIds={selectedActionIds}
              onToggleAction={handleToggleAction}
              onSelectAll={() =>
                setSelectedActionIds(availableSimulatorActions.map((a) => a.id))
              }
              onClearAll={() => setSelectedActionIds([])}
            />
            <AdvisorChatPanel
              city={snapshot?.city ?? profile.city}
              messages={advisorMessages}
              loading={advisorLoading}
              error={advisorError}
              onSendQuestion={handleAskAdvisor}
            />
          </div>
        )}

        {activeTab === 'community' && (
          <CommunityBoardView
            currentCity={snapshot?.city ?? profile.city}
            user={user}
            displayAlias={profile.displayAlias}
            pledges={pledges}
            reports={reports}
            onSignIn={handleSignIn}
            onCreatePledge={async (input) => {
              if (!user) return;
              await createCommunityPledge({
                authorUid: user.uid,
                displayAlias: profile.displayAlias || user.displayName || 'Neighbor',
                ...input,
              });
            }}
            onSupportPledge={supportCommunityPledge}
            onDeletePledge={deleteCommunityPledge}
            onCreateReport={async (input) => {
              if (!user) return;
              await createSmogReport({
                authorUid: user.uid,
                displayAlias: profile.displayAlias || user.displayName || 'Neighbor',
                ...input,
              });
            }}
            onMarkReportHelpful={markSmogReportHelpful}
            onDeleteReport={deleteSmogReport}
          />
        )}
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#64748B]">
          <span>ClearAir Winter · Household & Community Air Quality Assistant</span>
          <span>Live air quality telemetry via Open-Meteo · Guidance for informational planning</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ClearAirWorkspace />
    </ErrorBoundary>
  );
}
