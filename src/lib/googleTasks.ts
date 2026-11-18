import type { TailoredPlanResponse } from '../types/airQuality.ts';
import { sanitizeTextInput } from '../utils/impactCalculator.ts';

const TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1';

export interface GoogleTaskList {
  id: string;
  title: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
}

export interface SmogTaskDraft {
  title: string;
  notes: string;
}

async function tasksFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${TASKS_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number };
  } & T;

  if (!res.ok) {
    const message =
      data.error?.message || `Google Tasks request failed (${res.status}).`;
    throw new Error(message);
  }
  return data;
}

export async function listTaskLists(
  accessToken: string,
): Promise<GoogleTaskList[]> {
  const data = await tasksFetch<{ items?: GoogleTaskList[] }>(
    accessToken,
    '/users/@me/lists',
  );
  return data.items ?? [];
}

export async function ensureClearAirTaskList(
  accessToken: string,
  listTitle = 'ClearAir Winter',
): Promise<GoogleTaskList> {
  const existing = await listTaskLists(accessToken);
  const found = existing.find(
    (l) => l.title.toLowerCase() === listTitle.toLowerCase(),
  );
  if (found) return found;

  return tasksFetch<GoogleTaskList>(accessToken, '/users/@me/lists', {
    method: 'POST',
    body: JSON.stringify({ title: listTitle }),
  });
}

export async function listTasksInList(
  accessToken: string,
  taskListId: string,
): Promise<GoogleTaskItem[]> {
  const safeListId = encodeURIComponent(taskListId);
  const data = await tasksFetch<{ items?: GoogleTaskItem[] }>(
    accessToken,
    `/lists/${safeListId}/tasks?showCompleted=true&showHidden=true&maxResults=40`,
  );
  return (data.items ?? []).filter((t) => Boolean(t.title?.trim()));
}

export async function createGoogleTask(
  accessToken: string,
  taskListId: string,
  draft: SmogTaskDraft,
): Promise<GoogleTaskItem> {
  const safeListId = encodeURIComponent(taskListId);
  const todayIso = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z';
  return tasksFetch<GoogleTaskItem>(
    accessToken,
    `/lists/${safeListId}/tasks`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: sanitizeTextInput(draft.title, 200),
        notes: sanitizeTextInput(draft.notes, 800),
        due: todayIso,
      }),
    },
  );
}

export async function updateGoogleTaskStatus(
  accessToken: string,
  taskListId: string,
  taskId: string,
  status: 'needsAction' | 'completed',
): Promise<GoogleTaskItem> {
  const safeListId = encodeURIComponent(taskListId);
  const safeTaskId = encodeURIComponent(taskId);
  return tasksFetch<GoogleTaskItem>(
    accessToken,
    `/lists/${safeListId}/tasks/${safeTaskId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  );
}

export async function deleteGoogleTask(
  accessToken: string,
  taskListId: string,
  taskId: string,
): Promise<void> {
  const safeListId = encodeURIComponent(taskListId);
  const safeTaskId = encodeURIComponent(taskId);
  await tasksFetch<void>(
    accessToken,
    `/lists/${safeListId}/tasks/${safeTaskId}`,
    { method: 'DELETE' },
  );
}

export function buildTaskDraftsFromPlan(
  plan: TailoredPlanResponse,
  city: string,
  selectedActionIds: string[],
): SmogTaskDraft[] {
  const selectedSet = new Set(selectedActionIds);
  const drafts: SmogTaskDraft[] = [];

  for (const r of plan.dailyRoutine) {
    if (selectedSet.size === 0 || selectedSet.has(`routine:${r.id}`)) {
      drafts.push({
        title: `[${r.timeWindow}] ${r.title} (${city})`,
        notes: `${r.action}\nImpact: ${r.whyItMatters} (-${r.exposureReductionPct}% exposure, ${r.weeklyCo2SavedKg} kg CO2e/wk)`,
      });
    }
  }

  for (const h of plan.indoorHacks) {
    if (selectedSet.has(`hack:${h.id}`)) {
      drafts.push({
        title: `Indoor Air: ${h.title}`,
        notes: `${h.steps}\nImpact: ${h.directImpactExplanation} (-${h.exposureReductionPct}% indoor PM2.5)`,
      });
    }
  }

  for (const a of plan.sustainableAlternatives) {
    if (selectedSet.has(`alt:${a.id}`)) {
      drafts.push({
        title: `Clean Swap: ${a.alternative}`,
        notes: `Replaces ${a.replaces}. ${a.whyItMatters} (${a.weeklyCo2SavedKg} kg CO2e/wk, ${a.weeklyPm25AvoidedGrams} g PM2.5 avoided)`,
      });
    }
  }

  return drafts.slice(0, 10);
}
