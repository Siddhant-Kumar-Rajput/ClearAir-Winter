import {
  CheckCircle2,
  Circle,
  ListTodo,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  buildTaskDraftsFromPlan,
  createGoogleTask,
  deleteGoogleTask,
  ensureClearAirTaskList,
  listTaskLists,
  listTasksInList,
  updateGoogleTaskStatus,
  type GoogleTaskItem,
  type GoogleTaskList,
  type SmogTaskDraft,
} from '../lib/googleTasks.ts';
import type { TailoredPlanResponse } from '../types/airQuality.ts';

interface GoogleTasksPanelProps {
  city: string;
  plan: TailoredPlanResponse | null;
  selectedActionIds: string[];
  accessToken: string | null;
  onConnectTasks: () => Promise<void>;
  onTokenExpired: () => void;
}

type PendingConfirmation =
  | {
      kind: 'sync_plan';
      drafts: SmogTaskDraft[];
      targetListTitle: string;
    }
  | {
      kind: 'toggle_status';
      task: GoogleTaskItem;
      nextStatus: 'needsAction' | 'completed';
    }
  | {
      kind: 'delete_task';
      task: GoogleTaskItem;
    };

export function GoogleTasksPanel({
  city,
  plan,
  selectedActionIds,
  accessToken,
  onConnectTasks,
  onTokenExpired,
}: GoogleTasksPanelProps) {
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [activeListId, setActiveListId] = useState<string>('');
  const [tasks, setTasks] = useState<GoogleTaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [pendingConfirm, setPendingConfirm] =
    useState<PendingConfirmation | null>(null);

  const loadTasksWorkspace = useCallback(
    async (token: string, preferredListId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const clearAirList = await ensureClearAirTaskList(token);
        const allLists = await listTaskLists(token);
        setTaskLists(allLists);
        const chosenId =
          preferredListId && allLists.some((l) => l.id === preferredListId)
            ? preferredListId
            : clearAirList.id;
        setActiveListId(chosenId);
        const items = await listTasksInList(token, chosenId);
        setTasks(items);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Unable to load Google Tasks.';
        if (
          msg.toLowerCase().includes('invalid credentials') ||
          msg.includes('401')
        ) {
          onTokenExpired();
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [onTokenExpired],
  );

  useEffect(() => {
    if (accessToken) {
      void loadTasksWorkspace(accessToken);
    } else {
      setTaskLists([]);
      setTasks([]);
      setActiveListId('');
    }
  }, [accessToken, loadTasksWorkspace]);

  const handleSelectList = async (nextId: string) => {
    setActiveListId(nextId);
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const items = await listTasksInList(accessToken, nextId);
      setTasks(items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to switch task list.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!accessToken || !activeListId) return;
    const trimmed = newTaskTitle.trim();
    if (trimmed.length < 2) return;

    setMutating(true);
    setError(null);
    setStatusMessage(null);
    try {
      const created = await createGoogleTask(accessToken, activeListId, {
        title: trimmed,
        notes: `Added from ClearAir Winter (${city})`,
      });
      setTasks((prev) => [created, ...prev]);
      setNewTaskTitle('');
      setStatusMessage(`Added "${created.title}" to Google Tasks.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.');
    } finally {
      setMutating(false);
    }
  };

  const requestSyncPlanToTasks = () => {
    if (!plan) return;
    const drafts = buildTaskDraftsFromPlan(plan, city, selectedActionIds);
    if (drafts.length === 0) return;
    const listTitle =
      taskLists.find((l) => l.id === activeListId)?.title ?? 'ClearAir Winter';
    setPendingConfirm({
      kind: 'sync_plan',
      drafts,
      targetListTitle: listTitle,
    });
  };

  const executeConfirmedAction = async () => {
    if (!pendingConfirm || !accessToken || !activeListId) return;
    const action = pendingConfirm;
    setPendingConfirm(null);
    setMutating(true);
    setError(null);
    setStatusMessage(null);

    try {
      if (action.kind === 'sync_plan') {
        const createdItems: GoogleTaskItem[] = [];
        for (const draft of action.drafts) {
          const item = await createGoogleTask(accessToken, activeListId, draft);
          createdItems.push(item);
        }
        setTasks((prev) => [...createdItems, ...prev]);
        setStatusMessage(
          `Synced ${createdItems.length} winter smog action(s) to "${action.targetListTitle}".`,
        );
      } else if (action.kind === 'toggle_status') {
        const updated = await updateGoogleTaskStatus(
          accessToken,
          activeListId,
          action.task.id,
          action.nextStatus,
        );
        setTasks((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t)),
        );
        setStatusMessage(
          action.nextStatus === 'completed'
            ? `Marked "${updated.title}" completed.`
            : `Reopened "${updated.title}".`,
        );
      } else if (action.kind === 'delete_task') {
        await deleteGoogleTask(accessToken, activeListId, action.task.id);
        setTasks((prev) => prev.filter((t) => t.id !== action.task.id));
        setStatusMessage(`Removed "${action.task.title}" from Google Tasks.`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Google Tasks update did not complete.',
      );
    } finally {
      setMutating(false);
    }
  };

  return (
    <section
      aria-labelledby="google-tasks-heading"
      className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F1F5F9] pb-4">
        <div>
          <h2
            id="google-tasks-heading"
            className="text-lg font-semibold text-[#0F172A] flex items-center gap-2"
          >
            <ListTodo aria-hidden="true" className="w-5 h-5 text-[#0369A1]" />
            <span>Google Tasks Daily Checklist</span>
          </h2>
          <p className="text-sm text-[#475569] mt-0.5">
            Turn your tailored winter smog routines and indoor hacks into trackable Google Tasks reminders
          </p>
        </div>

        {accessToken && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {plan && (
              <button
                type="button"
                onClick={requestSyncPlanToTasks}
                disabled={mutating || loading}
                className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-[#0369A1] hover:bg-[#075985] rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0369A1]"
              >
                Send Plan Actions to Google Tasks
              </button>
            )}
            <button
              type="button"
              onClick={() => loadTasksWorkspace(accessToken, activeListId)}
              disabled={loading || mutating}
              aria-label="Refresh Google Tasks"
              className="min-h-[40px] px-3 py-2 text-xs font-medium text-[#334155] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              <RefreshCw
                aria-hidden="true"
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              />
              <span>Refresh</span>
            </button>
          </div>
        )}
      </div>

      {!accessToken ? (
        <div className="p-4 sm:p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <p className="text-sm font-medium text-[#0F172A]">
              Connect Google Tasks to sync your daily clean-air routine
            </p>
            <p className="text-xs text-[#475569]">
              With your permission, ClearAir Winter creates a dedicated “ClearAir Winter” checklist in Google Tasks so your household can check off airing windows, filtration checks, and commute swaps.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void onConnectTasks()}
            className="gsi-material-button inline-flex items-center gap-3 px-4 py-2.5 min-h-[42px] bg-white border border-[#747775] hover:bg-[#F8FAFC] rounded-full text-sm font-medium text-[#1F1F1F] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0369A1]"
          >
            <span className="w-[18px] h-[18px] shrink-0" aria-hidden="true">
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="block w-full h-full"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
            </span>
            <span>Sign in with Google</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Task list switcher + custom add task */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="google-task-list-select"
                className="text-xs font-medium text-[#334155] whitespace-nowrap"
              >
                Task list:
              </label>
              <select
                id="google-task-list-select"
                value={activeListId}
                onChange={(e) => void handleSelectList(e.target.value)}
                className="min-h-[38px] px-3 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
              >
                {taskLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>
            </div>

            <form
              onSubmit={handleAddCustomTask}
              className="flex items-center gap-2 flex-1 md:max-w-md"
            >
              <label htmlFor="new-google-task-input" className="sr-only">
                Add a clean-air reminder to Google Tasks
              </label>
              <input
                id="new-google-task-input"
                type="text"
                maxLength={140}
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add custom smog reminder (e.g., Check HEPA filter)..."
                className="flex-1 min-h-[38px] px-3 text-sm bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
              />
              <button
                type="submit"
                disabled={mutating || newTaskTitle.trim().length < 2}
                className="min-h-[38px] px-3.5 py-1.5 text-xs font-medium text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg inline-flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                <Plus aria-hidden="true" className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </form>
          </div>

          {statusMessage && (
            <p
              role="status"
              aria-live="polite"
              className="text-xs font-medium text-[#15803D]"
            >
              {statusMessage}
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-[#B91C1C]">
              {error}
            </p>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[#475569] py-4">
              <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin text-[#0369A1]" />
              <span>Loading Google Tasks...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-sm text-[#475569]">
              No tasks in this list yet. Add a custom reminder above or click{' '}
              <strong className="text-[#0F172A]">
                Send Plan Actions to Google Tasks
              </strong>{' '}
              after generating your smog plan.
            </div>
          ) : (
            <ul className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-lg bg-[#F8FAFC]">
              {tasks.map((task) => {
                const isDone = task.status === 'completed';
                return (
                  <li
                    key={task.id}
                    className="p-3.5 flex items-start justify-between gap-3"
                  >
                    <button
                      type="button"
                      disabled={mutating}
                      onClick={() =>
                        setPendingConfirm({
                          kind: 'toggle_status',
                          task,
                          nextStatus: isDone ? 'needsAction' : 'completed',
                        })
                      }
                      aria-label={
                        isDone
                          ? `Mark "${task.title}" as incomplete`
                          : `Mark "${task.title}" as completed`
                      }
                      className="flex items-start gap-3 text-left flex-1 min-w-0 cursor-pointer"
                    >
                      {isDone ? (
                        <CheckCircle2
                          aria-hidden="true"
                          className="w-5 h-5 text-[#15803D] mt-0.5 shrink-0"
                        />
                      ) : (
                        <Circle
                          aria-hidden="true"
                          className="w-5 h-5 text-[#64748B] mt-0.5 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div
                          className={`text-sm font-medium ${
                            isDone
                              ? 'line-through text-[#64748B]'
                              : 'text-[#0F172A]'
                          }`}
                        >
                          {task.title}
                        </div>
                        {task.notes && (
                          <p className="text-xs text-[#475569] mt-0.5 whitespace-pre-line line-clamp-2">
                            {task.notes}
                          </p>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={mutating}
                      onClick={() =>
                        setPendingConfirm({ kind: 'delete_task', task })
                      }
                      aria-label={`Delete task "${task.title}"`}
                      className="p-2 text-[#B91C1C] hover:bg-[#FEE2E2] rounded-lg shrink-0 cursor-pointer"
                    >
                      <Trash2 aria-hidden="true" className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Explicit Confirmation Dialog for Mutating / Destructive Operations */}
      {pendingConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-task-dialog-title"
          className="fixed inset-0 z-50 bg-[#0F172A]/45 flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4 shadow-lg">
            <h3
              id="confirm-task-dialog-title"
              className="text-base font-semibold text-[#0F172A]"
            >
              {pendingConfirm.kind === 'sync_plan'
                ? `Add ${pendingConfirm.drafts.length} task(s) to "${pendingConfirm.targetListTitle}"?`
                : pendingConfirm.kind === 'delete_task'
                  ? 'Delete task from Google Tasks?'
                  : pendingConfirm.nextStatus === 'completed'
                    ? 'Mark Google Task as completed?'
                    : 'Reopen Google Task?'}
            </h3>

            {pendingConfirm.kind === 'sync_plan' && (
              <div className="space-y-2">
                <p className="text-sm text-[#475569]">
                  The following winter smog actions will be created in your Google Tasks list:
                </p>
                <ul className="max-h-40 overflow-y-auto text-xs text-[#334155] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 space-y-1.5 list-disc list-inside">
                  {pendingConfirm.drafts.map((d) => (
                    <li key={d.title}>{d.title}</li>
                  ))}
                </ul>
              </div>
            )}

            {pendingConfirm.kind === 'toggle_status' && (
              <p className="text-sm text-[#475569]">
                Update status of{' '}
                <strong className="text-[#0F172A]">
                  “{pendingConfirm.task.title}”
                </strong>{' '}
                in Google Tasks to{' '}
                <strong className="text-[#0F172A]">
                  {pendingConfirm.nextStatus === 'completed'
                    ? 'Completed'
                    : 'Needs Action'}
                </strong>
                ?
              </p>
            )}

            {pendingConfirm.kind === 'delete_task' && (
              <p className="text-sm text-[#475569]">
                Are you sure you want to delete{' '}
                <strong className="text-[#0F172A]">
                  “{pendingConfirm.task.title}”
                </strong>{' '}
                from your Google Tasks? This action cannot be undone.
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                className="min-h-[40px] px-4 py-2 text-sm font-medium text-[#334155] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void executeConfirmedAction()}
                className={`min-h-[40px] px-4 py-2 text-sm font-medium text-white rounded-lg cursor-pointer ${
                  pendingConfirm.kind === 'delete_task'
                    ? 'bg-[#B91C1C] hover:bg-[#991B1B]'
                    : 'bg-[#0369A1] hover:bg-[#075985]'
                }`}
              >
                {pendingConfirm.kind === 'delete_task' ? 'Delete' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
