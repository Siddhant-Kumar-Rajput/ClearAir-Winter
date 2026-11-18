import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  type CommunityPledge,
  type HouseholdProfile,
  type ObservedSmogSource,
  type PledgeCategory,
  type SavedRoutineRecord,
  type SmogReport,
  type SmogSeverityReport,
  VALIDATION_LIMITS,
} from '../types/airQuality.ts';
import { sanitizeTextInput } from '../utils/impactCalculator.ts';
import { db, handleFirestoreError, OperationType } from './firebase.ts';

function makeDocId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${random}`;
}

export async function loadHouseholdProfile(
  uid: string,
): Promise<HouseholdProfile | null> {
  const docPath = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data() as HouseholdProfile;
    return {
      displayAlias: data.displayAlias,
      city: data.city,
      country: data.country,
      latitude: data.latitude,
      longitude: data.longitude,
      residentsCount: data.residentsCount,
      sensitiveGroups: data.sensitiveGroups ?? [],
      homeType: data.homeType,
      heatingFuel: data.heatingFuel,
      cookingFuel: data.cookingFuel,
      commuteMode: data.commuteMode,
      indoorGear: data.indoorGear ?? [],
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

export async function saveHouseholdProfile(
  uid: string,
  profile: HouseholdProfile,
): Promise<void> {
  const docPath = `users/${uid}`;
  const ref = doc(db, 'users', uid);

  const payloadBase = {
    uid,
    displayAlias: sanitizeTextInput(
      profile.displayAlias || 'My Household',
      VALIDATION_LIMITS.displayAlias.max,
    ),
    city: sanitizeTextInput(profile.city, VALIDATION_LIMITS.city.max),
    country: sanitizeTextInput(profile.country, VALIDATION_LIMITS.country.max),
    latitude: Number(profile.latitude),
    longitude: Number(profile.longitude),
    residentsCount: Math.min(20, Math.max(1, Math.round(profile.residentsCount))),
    sensitiveGroups: profile.sensitiveGroups.slice(
      0,
      VALIDATION_LIMITS.sensitiveGroupsMax,
    ),
    homeType: profile.homeType,
    heatingFuel: profile.heatingFuel,
    cookingFuel: profile.cookingFuel,
    commuteMode: profile.commuteMode,
    indoorGear: profile.indoorGear.slice(0, VALIDATION_LIMITS.indoorGearMax),
  };

  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        ...payloadBase,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayAlias: payloadBase.displayAlias,
        city: payloadBase.city,
        country: payloadBase.country,
        latitude: payloadBase.latitude,
        longitude: payloadBase.longitude,
        residentsCount: payloadBase.residentsCount,
        sensitiveGroups: payloadBase.sensitiveGroups,
        homeType: payloadBase.homeType,
        heatingFuel: payloadBase.heatingFuel,
        cookingFuel: payloadBase.cookingFuel,
        commuteMode: payloadBase.commuteMode,
        indoorGear: payloadBase.indoorGear,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export function subscribeSavedRoutines(
  uid: string,
  onData: (items: SavedRoutineRecord[]) => void,
): Unsubscribe {
  const colPath = `users/${uid}/routines`;
  const q = query(
    collection(db, 'users', uid, 'routines'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(15),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: SavedRoutineRecord[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SavedRoutineRecord, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, colPath);
    },
  );
}

export async function saveRoutineToCloud(
  uid: string,
  profile: HouseholdProfile,
  input: {
    city: string;
    aqiAtGeneration: number;
    pm25AtGeneration: number;
    summary: string;
    ventilationWindow: string;
    highlights: string[];
    selectedActionIds: string[];
    estimatedPm25ReductionPct: number;
    estimatedWeeklyCo2SavedKg: number;
  },
): Promise<string> {
  // Ensure parent user document exists first for Master Gate integrity
  await saveHouseholdProfile(uid, profile);

  const routineId = makeDocId('rtn');
  const docPath = `users/${uid}/routines/${routineId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'routines', routineId), {
      uid,
      city: sanitizeTextInput(input.city, VALIDATION_LIMITS.city.max),
      aqiAtGeneration: Math.min(1000, Math.max(0, input.aqiAtGeneration)),
      pm25AtGeneration: Math.min(2000, Math.max(0, input.pm25AtGeneration)),
      summary: sanitizeTextInput(input.summary, VALIDATION_LIMITS.summary.max),
      ventilationWindow: sanitizeTextInput(
        input.ventilationWindow,
        VALIDATION_LIMITS.ventilationWindow.max,
      ),
      highlights: input.highlights
        .slice(0, VALIDATION_LIMITS.highlightsMax)
        .map((h) => sanitizeTextInput(h, 220))
        .filter((h) => h.length > 0),
      selectedActionIds: input.selectedActionIds
        .slice(0, VALIDATION_LIMITS.selectedActionIdsMax)
        .map((id) => sanitizeTextInput(id, 80))
        .filter((id) => id.length > 0),
      estimatedPm25ReductionPct: Math.min(
        100,
        Math.max(0, input.estimatedPm25ReductionPct),
      ),
      estimatedWeeklyCo2SavedKg: Math.min(
        500,
        Math.max(0, input.estimatedWeeklyCo2SavedKg),
      ),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return routineId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function deleteSavedRoutine(
  uid: string,
  routineId: string,
): Promise<void> {
  const docPath = `users/${uid}/routines/${routineId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'routines', routineId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export function subscribeCommunityPledges(
  onData: (pledges: CommunityPledge[]) => void,
): Unsubscribe {
  const colPath = 'community_pledges';
  const q = query(
    collection(db, colPath),
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
    limit(30),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: CommunityPledge[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CommunityPledge, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, colPath);
    },
  );
}

export async function createCommunityPledge(input: {
  authorUid: string;
  displayAlias: string;
  city: string;
  category: PledgeCategory;
  actionTitle: string;
  impactExplanation: string;
  weeklyCo2SavedKg: number;
}): Promise<void> {
  const pledgeId = makeDocId('plg');
  const docPath = `community_pledges/${pledgeId}`;
  try {
    await setDoc(doc(db, 'community_pledges', pledgeId), {
      authorUid: input.authorUid,
      displayAlias: sanitizeTextInput(
        input.displayAlias || 'Neighbor',
        VALIDATION_LIMITS.displayAlias.max,
      ),
      city: sanitizeTextInput(input.city, VALIDATION_LIMITS.city.max),
      category: input.category,
      actionTitle: sanitizeTextInput(
        input.actionTitle,
        VALIDATION_LIMITS.actionTitle.max,
      ),
      impactExplanation: sanitizeTextInput(
        input.impactExplanation,
        VALIDATION_LIMITS.impactExplanation.max,
      ),
      weeklyCo2SavedKg: Math.min(250, Math.max(0, Number(input.weeklyCo2SavedKg))),
      supportersCount: 1,
      visibility: 'public',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function supportCommunityPledge(pledgeId: string): Promise<void> {
  const docPath = `community_pledges/${pledgeId}`;
  try {
    await updateDoc(doc(db, 'community_pledges', pledgeId), {
      supportersCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteCommunityPledge(pledgeId: string): Promise<void> {
  const docPath = `community_pledges/${pledgeId}`;
  try {
    await deleteDoc(doc(db, 'community_pledges', pledgeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export function subscribeSmogReports(
  onData: (reports: SmogReport[]) => void,
): Unsubscribe {
  const colPath = 'smog_reports';
  const q = query(
    collection(db, colPath),
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
    limit(30),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: SmogReport[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SmogReport, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, colPath);
    },
  );
}

export async function createSmogReport(input: {
  authorUid: string;
  displayAlias: string;
  city: string;
  neighborhood: string;
  severity: SmogSeverityReport;
  observedSource: ObservedSmogSource;
  note: string;
}): Promise<void> {
  const reportId = makeDocId('rpt');
  const docPath = `smog_reports/${reportId}`;
  try {
    await setDoc(doc(db, 'smog_reports', reportId), {
      authorUid: input.authorUid,
      displayAlias: sanitizeTextInput(
        input.displayAlias || 'Neighbor',
        VALIDATION_LIMITS.displayAlias.max,
      ),
      city: sanitizeTextInput(input.city, VALIDATION_LIMITS.city.max),
      neighborhood: sanitizeTextInput(
        input.neighborhood,
        VALIDATION_LIMITS.neighborhood.max,
      ),
      severity: input.severity,
      observedSource: input.observedSource,
      note: sanitizeTextInput(input.note, VALIDATION_LIMITS.smogNote.max),
      helpfulCount: 1,
      visibility: 'public',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function markSmogReportHelpful(reportId: string): Promise<void> {
  const docPath = `smog_reports/${reportId}`;
  try {
    await updateDoc(doc(db, 'smog_reports', reportId), {
      helpfulCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteSmogReport(reportId: string): Promise<void> {
  const docPath = `smog_reports/${reportId}`;
  try {
    await deleteDoc(doc(db, 'smog_reports', reportId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}
