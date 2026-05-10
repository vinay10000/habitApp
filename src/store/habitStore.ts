import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getCompletionForHabit, isHabitComplete, nextCompletionCount } from "@/features/habits/completion";
import { isHabitActiveOnDate } from "@/features/habits/schedule";
import { calculateCurrentStreak } from "@/features/streaks/streaks";
import { toDateKey } from "@/lib/dates";
import { createUuid } from "@/lib/ids";
import { enqueueOfflineAction, flushOfflineQueue } from "@/lib/offlineQueue";
import { getAndroidRecordingStatus, startAndroidVoiceRecording, stopAndroidVoiceRecording } from "@/lib/voiceRecording";
import { createWidgetSnapshot, persistWidgetSnapshot } from "@/lib/widgetSnapshot";
import { useSettingsStore } from "@/store/settingsStore";
import {
  createRemoteHabit,
  deleteRemoteCompletion,
  fetchRemoteCompletions,
  fetchRemoteHabits,
  invokeRemoteAICommand,
  invokeRemoteRoutineBuilder,
  transcribeRemoteAudio,
  updateRemoteHabit,
  upsertRemoteCompletion,
  upsertRemoteStreak
} from "@/lib/habitRepository";
import type { AICommandRequest, AICommandResult } from "@/types/ai";
import type { Habit, HabitCategory, HabitCompletion, HabitType } from "@/types/habit";
import type { Schedule, TimeOfDay } from "@/types/schedule";

const demoUserId = "local-user";
const localSnapshotKey = "habit.local.snapshot.v1";

const initialHabits: Habit[] = [];

type LocalSnapshot = {
  habits: Habit[];
  completions: HabitCompletion[];
};

type NewHabitInput = {
  title: string;
  type: HabitType;
  category: HabitCategory;
  schedule: Schedule;
  timeOfDay: TimeOfDay;
  targetCount?: number;
};

function parseReminderHour(text: string) {
  const match = text.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\b/i);

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.toLowerCase();

  if (!Number.isFinite(hour) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  if (meridiem?.startsWith("p") && hour < 12) {
    hour += 12;
  }

  if (meridiem?.startsWith("a") && hour === 12) {
    hour = 0;
  }

  return { hour, minute };
}

function formatReminderTime(hour: number, minute = 0) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function explicitScheduleFromText(normalized: string): Schedule | null {
  if (/\b(weekdays|weekday)\b/.test(normalized)) return { kind: "weekdays" };
  if (/\b(weekends|weekend)\b/.test(normalized)) return { kind: "weekends" };
  if (/\b(tomorrow)\b/.test(normalized)) return { kind: "oneTime", date: toDateKey(new Date(Date.now() + 86_400_000)) };
  if (/\b(today|once|one time|one-time)\b/.test(normalized)) return { kind: "oneTime", date: toDateKey() };
  if (/\b(monthly|every month)\b/.test(normalized)) return { kind: "monthly", dayOfMonth: new Date().getDate() };
  if (/\b(daily|every day|each day)\b/.test(normalized)) return { kind: "daily" };
  return null;
}

function timeOfDayFromHour(hour: number): TimeOfDay {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

type VoiceFlowState = "idle" | "recording" | "transcribing" | "parsing" | "preview" | "applied";

type LastUndo =
  | { kind: "createdHabits"; habits: Habit[] }
  | { kind: "completedHabit"; habitId: string; previousCompletion: HabitCompletion | null }
  | { kind: "editedHabit"; habit: Habit };

type TimerSession = {
  habitId: string;
  startedAt: number;
  elapsedSeconds: number;
  running: boolean;
};

type VoiceMeter = {
  durationMillis: number;
  level: number;
  samples: number[];
};

type HabitStore = {
  userId: string;
  habits: Habit[];
  completions: HabitCompletion[];
  loading: boolean;
  recording: boolean;
  error: string | null;
  lastAIResult: AICommandResult | null;
  lastTranscript: string | null;
  voiceFlowState: VoiceFlowState;
  voiceMeter: VoiceMeter;
  pendingAIResult: AICommandResult | null;
  lastUndo: LastUndo | null;
  timerSession: TimerSession | null;
  addHabit: (input: NewHabitInput) => Habit;
  archiveHabit: (habitId: string) => void;
  completeHabit: (habitId: string, amount?: number) => void;
  uncompleteHabit: (habitId: string) => void;
  toggleHabitCompletion: (habitId: string) => void;
  runVoiceCommand: (transcript: string) => Promise<void>;
  startVoiceRecording: () => Promise<void>;
  refreshVoiceMeter: () => Promise<void>;
  stopVoiceRecordingAndRun: () => Promise<void>;
  stopVoiceRecordingAndTranscribe: () => Promise<string | null>;
  parseVoiceCommand: (transcript: string) => Promise<AICommandResult>;
  buildRoutine: (prompt: string) => Promise<void>;
  previewAIResult: (result: AICommandResult) => void;
  confirmPendingAIResult: () => void;
  undoLastAIAction: () => void;
  applyAIResult: (result: AICommandResult, options?: { force?: boolean }) => void;
  startTimerSession: (habitId: string) => void;
  pauseTimerSession: () => void;
  resumeTimerSession: () => void;
  cancelTimerSession: () => void;
  finishTimerSession: () => void;
  loadForUser: (userId: string) => Promise<void>;
  resetLocalDemo: () => void;
  todayHabits: () => Habit[];
};

function updateWidgetSnapshot(habits: Habit[], completions: HabitCompletion[]) {
  const todayHabits = habits.filter((habit) => isHabitActiveOnDate(habit));
  void persistWidgetSnapshot(createWidgetSnapshot(todayHabits, completions));
}

function persistLocalSnapshot(userId: string, snapshot: LocalSnapshot) {
  if (userId !== demoUserId) {
    return;
  }

  void AsyncStorage.setItem(localSnapshotKey, JSON.stringify(snapshot));
}

async function loadLocalSnapshot(): Promise<LocalSnapshot> {
  const raw = await AsyncStorage.getItem(localSnapshotKey);

  if (!raw) {
    return { habits: initialHabits, completions: [] };
  }

  const parsed = JSON.parse(raw) as Partial<LocalSnapshot>;

  return {
    habits: parsed.habits ?? initialHabits,
    completions: parsed.completions ?? []
  };
}

function syncHabitUpdate(habit: Habit, setError: (message: string) => void) {
  void updateRemoteHabit(habit).catch((error: Error) => {
    void enqueueOfflineAction({ type: "updateHabit", payload: habit });
    setError(error.message);
  });
}

function commandRequest(transcript: string, habits: Habit[]): AICommandRequest {
  return {
    transcript,
    dateKey: toDateKey(),
    habits: habits.map((habit) => ({
      id: habit.id,
      title: habit.title,
      type: habit.type,
      category: habit.category,
      timeOfDay: habit.timeOfDay
    }))
  };
}

function localAICommand(transcript: string, habits: Habit[]): AICommandResult {
  const normalized = transcript.trim().toLowerCase();
  const matchedHabit = habits.find((habit) => normalized.includes(habit.title.toLowerCase()));

  if (/(done|finished|complete|completed|skipped|slip)/.test(normalized) && matchedHabit) {
    return { kind: "completeHabit", confidence: "high", habitId: matchedHabit.id };
  }

  if (/routine|morning routine|study routine|healthy routine/.test(normalized)) {
    return {
      kind: "routine",
      confidence: "medium",
      previewText: "Create a simple three-step routine.",
      drafts: [
        {
          title: normalized.includes("study") ? "Plan study block" : "Drink water",
          type: "binary",
          schedule: { kind: "daily" },
          timeOfDay: "morning",
          category: normalized.includes("study") ? "learning" : "health"
        },
        {
          title: normalized.includes("study") ? "Deep work" : "Move for 10 minutes",
          type: normalized.includes("study") ? "timer" : "binary",
          schedule: { kind: "weekdays" },
          timeOfDay: normalized.includes("study") ? "afternoon" : "morning",
          category: normalized.includes("study") ? "productivity" : "fitness",
          targetCount: normalized.includes("study") ? 25 : undefined
        },
        {
          title: normalized.includes("study") ? "Review notes" : "Wind down",
          type: "binary",
          schedule: { kind: "daily" },
          timeOfDay: "evening",
          category: normalized.includes("study") ? "learning" : "mindfulness"
        }
      ]
    };
  }

  if (/move|increase|pause|change/.test(normalized) && matchedHabit) {
    const timeOfDay: TimeOfDay | undefined = normalized.includes("morning")
      ? "morning"
      : normalized.includes("afternoon")
        ? "afternoon"
        : normalized.includes("evening") || normalized.includes("night")
          ? "evening"
          : undefined;

    return {
      kind: "editHabit",
      confidence: timeOfDay ? "high" : "medium",
      habitId: matchedHabit.id,
      patch: timeOfDay ? { timeOfDay } : {},
      previewText: timeOfDay ? `Move ${matchedHabit.title} to ${timeOfDay}.` : `Review edits for ${matchedHabit.title}.`
    };
  }

  const title = transcript
    .replace(/^(create|add|start|build)\s+/i, "")
    .replace(/\s+(at\s*)?\d{1,2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?)?/i, "")
    .replace(/\s+(today|tomorrow|once|one time|one-time|daily|every day|weekdays|weekends|nightly|monthly|morning|afternoon|evening|night).*$/i, "")
    .trim();
  const explicitSchedule = explicitScheduleFromText(normalized);
  const reminder = parseReminderHour(transcript);
  const timeOfDay: TimeOfDay = reminder
    ? timeOfDayFromHour(reminder.hour)
    : normalized.includes("morning")
    ? "morning"
    : normalized.includes("afternoon")
      ? "afternoon"
      : normalized.includes("night") || normalized.includes("evening") || normalized.includes("sleep")
        ? "evening"
        : "anytime";
  const category: HabitCategory = /workout|gym|walk|run|fitness/.test(normalized)
    ? "fitness"
    : /read|study|learn|dsa|code/.test(normalized)
      ? "learning"
      : /meditat|journal|mindful/.test(normalized)
        ? "mindfulness"
        : /water|sleep|sugar|smoking/.test(normalized)
          ? "health"
          : "personal";
  const type: HabitType = /no |avoid|stop|quit/.test(normalized) ? "negative" : /minutes|focus|timer/.test(normalized) ? "timer" : "binary";

  if (!title) {
    return { kind: "needsPreview", reason: "I need a habit name before creating it.", transcript };
  }

  if (!explicitSchedule || !reminder) {
    const missing = [
      !reminder ? "reminder time" : null,
      !explicitSchedule ? "repeat" : null
    ].filter(Boolean).join(" and ");

    return { kind: "needsPreview", reason: `I need ${missing} before creating this habit.`, transcript };
  }

  return {
    kind: "createHabit",
    confidence: normalized.length > 8 ? "high" : "medium",
    draft: {
      title: title.replace(/^./, (letter) => letter.toUpperCase()),
      type,
      schedule: explicitSchedule,
      timeOfDay,
      category,
      targetCount: type === "timer" ? 25 : undefined,
      reminderTime: formatReminderTime(reminder.hour, reminder.minute)
    }
  };
}

function reminderHourFromTime(value?: string) {
  if (!value) {
    return null;
  }

  const [hour] = value.split(":").map(Number);
  return Number.isFinite(hour) ? Math.min(23, Math.max(0, Math.round(hour))) : null;
}

export const useHabitStore = create<HabitStore>((set, get) => ({
  userId: demoUserId,
  habits: initialHabits,
  completions: [],
  loading: false,
  recording: false,
  error: null,
  lastAIResult: null,
  lastTranscript: null,
  voiceFlowState: "idle",
  voiceMeter: { durationMillis: 0, level: 0, samples: Array.from({ length: 24 }, () => 0.08) },
  pendingAIResult: null,
  lastUndo: null,
  timerSession: null,
  addHabit: (input) => {
    const now = new Date().toISOString();
    const userId = get().userId;
    const { reminderTime: _reminderTime, ...habitInput } = input as NewHabitInput & { reminderTime?: string };
    const habit: Habit = {
      id: createUuid(),
      userId,
      streak: 0,
      createdAt: now,
      ...habitInput
    };

    set((state) => {
      const habits = [...state.habits, habit];
      updateWidgetSnapshot(habits, state.completions);
      persistLocalSnapshot(state.userId, { habits, completions: state.completions });
      return { habits };
    });
    void createRemoteHabit(habit).catch((error: Error) => {
      void enqueueOfflineAction({ type: "createHabit", payload: habit });
      set({ error: error.message });
    });

    return habit;
  },
  archiveHabit: (habitId) => {
    const archivedAt = new Date().toISOString();

    set((state) => {
      const habits = state.habits.map((habit) => (habit.id === habitId ? { ...habit, archivedAt } : habit));
      const archivedHabit = habits.find((habit) => habit.id === habitId);

      if (archivedHabit) {
        syncHabitUpdate(archivedHabit, (message) => set({ error: message }));
      }
      updateWidgetSnapshot(habits, state.completions);
      persistLocalSnapshot(state.userId, { habits, completions: state.completions });
      return { habits };
    });
  },
  completeHabit: (habitId, amount) => {
    const dateKey = toDateKey();
    const habit = get().habits.find((item) => item.id === habitId);

    if (!habit) {
      return;
    }

    set((state) => {
      const existing = state.completions.find(
        (completion) => completion.habitId === habitId && completion.completedOn === dateKey
      );
      const nextCount = amount ? Math.min((existing?.count ?? 0) + amount, habit.targetCount ?? amount) : nextCompletionCount(habit, existing);
      const nextCompletion: HabitCompletion = existing
        ? { ...existing, count: nextCount }
        : {
            id: createUuid(),
            habitId,
            userId: habit.userId,
            completedOn: dateKey,
            count: nextCount,
            createdAt: new Date().toISOString()
          };
      const completions = existing
        ? state.completions.map((completion) => (completion.id === existing.id ? nextCompletion : completion))
        : [...state.completions, nextCompletion];
      const habits = state.habits.map((item) =>
        item.id === habitId ? { ...item, streak: calculateCurrentStreak(item, completions) } : item
      );
      const updatedHabit = habits.find((item) => item.id === habitId);

      void upsertRemoteCompletion(nextCompletion).catch((error: Error) => {
        void enqueueOfflineAction({ type: "completeHabit", payload: nextCompletion });
        set({ error: error.message });
      });
      if (updatedHabit) {
        void upsertRemoteStreak(updatedHabit).catch((error: Error) => set({ error: error.message }));
      }
      updateWidgetSnapshot(habits, completions);
      persistLocalSnapshot(state.userId, { habits, completions });

      return { completions, habits };
    });
  },
  uncompleteHabit: (habitId) => {
    const dateKey = toDateKey();
    const habit = get().habits.find((item) => item.id === habitId);

    if (!habit) {
      return;
    }

    set((state) => {
      const completions = state.completions.filter(
        (completion) => !(completion.habitId === habitId && completion.completedOn === dateKey)
      );
      const habits = state.habits.map((item) =>
        item.id === habitId ? { ...item, streak: calculateCurrentStreak(item, completions) } : item
      );
      const updatedHabit = habits.find((item) => item.id === habitId);

      void deleteRemoteCompletion(habit.userId, habitId, dateKey).catch((error: Error) => {
        void enqueueOfflineAction({ type: "deleteCompletion", payload: { userId: habit.userId, habitId, completedOn: dateKey } });
        set({ error: error.message });
      });
      if (updatedHabit) {
        void upsertRemoteStreak(updatedHabit).catch((error: Error) => set({ error: error.message }));
      }
      updateWidgetSnapshot(habits, completions);
      persistLocalSnapshot(state.userId, { habits, completions });

      return { completions, habits };
    });
  },
  toggleHabitCompletion: (habitId) => {
    const habit = get().habits.find((item) => item.id === habitId);

    if (!habit) {
      return;
    }

    const completed = isHabitComplete(habit, get().completions, toDateKey());

    if (completed) {
      if (habit.type === "negative") {
        get().completeHabit(habitId);
        return;
      }

      get().uncompleteHabit(habitId);
      return;
    }

    if (habit.type === "negative") {
      get().uncompleteHabit(habitId);
      return;
    }

    get().completeHabit(habitId);
  },
  runVoiceCommand: async (transcript) => {
    if (!transcript.trim()) {
      return;
    }

    set({ loading: true, error: null, lastTranscript: transcript, voiceFlowState: "parsing", pendingAIResult: null });

    try {
      const result = (await invokeRemoteAICommand(get().userId, commandRequest(transcript, get().habits))) ?? localAICommand(transcript, get().habits);
      get().applyAIResult(result);
      set({ lastAIResult: result, loading: false });
    } catch (error) {
      set({ loading: false, voiceFlowState: "idle", error: error instanceof Error ? error.message : "Could not parse voice command." });
    }
  },
  startVoiceRecording: async () => {
    set({
      error: null,
      voiceFlowState: "recording",
      voiceMeter: { durationMillis: 0, level: 0, samples: Array.from({ length: 24 }, () => 0.08) }
    });

    try {
      await startAndroidVoiceRecording();
      set({ recording: true });
    } catch (error) {
      set({ recording: false, voiceFlowState: "idle", error: error instanceof Error ? error.message : "Could not start recording." });
    }
  },
  refreshVoiceMeter: async () => {
    if (!get().recording) {
      return;
    }

    try {
      const status = await getAndroidRecordingStatus();
      const level = Math.max(0.06, Math.min(1, (status.metering + 60) / 60));
      set((state) => ({
        voiceMeter: {
          durationMillis: status.durationMillis,
          level,
          samples: [...state.voiceMeter.samples.slice(1), level]
        }
      }));
    } catch {
    }
  },
  parseVoiceCommand: async (transcript) => {
    const request = commandRequest(transcript, get().habits);
    return (await invokeRemoteAICommand(get().userId, request)) ?? localAICommand(transcript, get().habits);
  },
  stopVoiceRecordingAndRun: async () => {
    set({ loading: true, recording: false, error: null, voiceFlowState: "transcribing" });

    try {
      const audio = await stopAndroidVoiceRecording();
      const transcript = await transcribeRemoteAudio(get().userId, { base64: audio.base64, mimeType: audio.mimeType });

      if (transcript === null) {
        set({
          loading: false,
          voiceFlowState: "idle",
          error: "Voice was recorded, but cloud transcription is not configured. Use the typed command or sign in with Supabase enabled."
        });
        return;
      }

      if (!transcript.trim()) {
        set({ loading: false, voiceFlowState: "idle", error: "No speech detected." });
        return;
      }

      await get().runVoiceCommand(transcript);
    } catch (error) {
      set({ loading: false, voiceFlowState: "idle", error: error instanceof Error ? error.message : "Could not transcribe recording." });
    }
  },
  stopVoiceRecordingAndTranscribe: async () => {
    set({ loading: true, recording: false, error: null, voiceFlowState: "transcribing" });

    try {
      const audio = await stopAndroidVoiceRecording();
      const transcript = await transcribeRemoteAudio(get().userId, { base64: audio.base64, mimeType: audio.mimeType });

      if (transcript === null) {
        set({
          loading: false,
          voiceFlowState: "idle",
          error: "Voice was recorded, but cloud transcription is not configured. Type the text below to keep going."
        });
        return null;
      }

      set({ loading: false, lastTranscript: transcript, voiceFlowState: transcript.trim() ? "parsing" : "idle" });
      return transcript;
    } catch (error) {
      set({ loading: false, voiceFlowState: "idle", error: error instanceof Error ? error.message : "Could not transcribe recording." });
      return null;
    }
  },
  buildRoutine: async (prompt) => {
    set({ loading: true, error: null });

    try {
      const result = (await invokeRemoteRoutineBuilder(get().userId, prompt, { dateKey: toDateKey(), habits: commandRequest("", get().habits).habits })) ?? localAICommand(prompt, get().habits);
      get().applyAIResult(result);
      set({ lastAIResult: result, loading: false });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "Could not build routine." });
    }
  },
  previewAIResult: (result) => {
    set({ pendingAIResult: result, lastAIResult: result, voiceFlowState: "preview", loading: false });
  },
  confirmPendingAIResult: () => {
    const pending = get().pendingAIResult;

    if (pending) {
      get().applyAIResult(pending, { force: true });
    }
  },
  undoLastAIAction: () => {
    const undo = get().lastUndo;

    if (!undo) {
      return;
    }

    if (undo.kind === "createdHabits") {
      undo.habits.forEach((habit) => get().archiveHabit(habit.id));
      set({ lastUndo: null, voiceFlowState: "idle" });
      return;
    }

    if (undo.kind === "completedHabit") {
      const dateKey = toDateKey();
      const previousCompletion = undo.previousCompletion;
      set((state) => {
        const completions = previousCompletion
          ? state.completions.some((completion) => completion.id === previousCompletion.id)
            ? state.completions.map((completion) => (completion.id === previousCompletion.id ? previousCompletion : completion))
            : [...state.completions, previousCompletion]
          : state.completions.filter((completion) => !(completion.habitId === undo.habitId && completion.completedOn === dateKey));
        const habits = state.habits.map((habit) =>
          habit.id === undo.habitId ? { ...habit, streak: calculateCurrentStreak(habit, completions) } : habit
        );
        const habit = state.habits.find((item) => item.id === undo.habitId);
        const updatedHabit = habits.find((item) => item.id === undo.habitId);

        if (previousCompletion) {
          void upsertRemoteCompletion(previousCompletion).catch((error: Error) => {
            void enqueueOfflineAction({ type: "completeHabit", payload: previousCompletion });
            set({ error: error.message });
          });
        } else if (habit) {
          void deleteRemoteCompletion(habit.userId, undo.habitId, dateKey).catch((error: Error) => {
            void enqueueOfflineAction({ type: "deleteCompletion", payload: { userId: habit.userId, habitId: undo.habitId, completedOn: dateKey } });
            set({ error: error.message });
          });
        }
        if (updatedHabit) {
          void upsertRemoteStreak(updatedHabit).catch((error: Error) => set({ error: error.message }));
        }

        updateWidgetSnapshot(habits, completions);
        persistLocalSnapshot(state.userId, { habits, completions });
        return { completions, habits, lastUndo: null, voiceFlowState: "idle" };
      });
      return;
    }

    if (undo.kind === "editedHabit") {
      set((state) => {
        const habits = state.habits.map((habit) => (habit.id === undo.habit.id ? undo.habit : habit));
        syncHabitUpdate(undo.habit, (message) => set({ error: message }));
        updateWidgetSnapshot(habits, state.completions);
        persistLocalSnapshot(state.userId, { habits, completions: state.completions });
        return { habits, lastUndo: null, voiceFlowState: "idle" };
      });
    }
  },
  applyAIResult: (result, options) => {
    const force = options?.force ?? false;

    if (result.kind === "needsPreview" || result.confidence !== "high" || (result.kind === "editHabit" && !force) || (result.kind === "routine" && !force)) {
      get().previewAIResult(result);
      return;
    }

    if (result.kind === "createHabit") {
      const habit = get().addHabit(result.draft);
      const reminderHour = reminderHourFromTime(result.draft.reminderTime);

      if (reminderHour !== null) {
        useSettingsStore.getState().setHabitReminder(habit.id, { mode: "custom", hour: reminderHour });
      }
      set({ lastUndo: { kind: "createdHabits", habits: [habit] }, pendingAIResult: null, voiceFlowState: "applied" });
      return;
    }

    if (result.kind === "completeHabit") {
      const previousCompletion = getCompletionForHabit(result.habitId, get().completions);
      get().completeHabit(result.habitId);
      set({ lastUndo: { kind: "completedHabit", habitId: result.habitId, previousCompletion: previousCompletion ? { ...previousCompletion } : null }, pendingAIResult: null, voiceFlowState: "applied" });
      return;
    }

    if (result.kind === "routine") {
      const habits = result.drafts.map((draft) => get().addHabit(draft));
      set({ lastUndo: { kind: "createdHabits", habits }, pendingAIResult: null, voiceFlowState: "applied" });
      return;
    }

    if (result.kind === "editHabit") {
      const previousHabit = get().habits.find((habit) => habit.id === result.habitId);

      if (!previousHabit) {
        set({ pendingAIResult: null, voiceFlowState: "idle" });
        return;
      }

      set((state) => {
        const habits = state.habits.map((habit) =>
          habit.id === result.habitId
            ? {
                ...habit,
                title: result.patch.title ?? habit.title,
                type: result.patch.type ?? habit.type,
                category: result.patch.category ?? habit.category,
                schedule: result.patch.schedule ?? habit.schedule,
                timeOfDay: result.patch.timeOfDay ?? habit.timeOfDay,
                targetCount: result.patch.targetCount ?? habit.targetCount
              }
            : habit
        );
        const updatedHabit = habits.find((habit) => habit.id === result.habitId);

        if (updatedHabit) {
          syncHabitUpdate(updatedHabit, (message) => set({ error: message }));
        }
        updateWidgetSnapshot(habits, state.completions);
        persistLocalSnapshot(state.userId, { habits, completions: state.completions });
        return { habits, lastUndo: { kind: "editedHabit", habit: previousHabit }, pendingAIResult: null, voiceFlowState: "applied" };
      });
    }
  },
  startTimerSession: (habitId) => {
    set({ timerSession: { habitId, startedAt: Date.now(), elapsedSeconds: 0, running: true } });
  },
  pauseTimerSession: () => {
    const session = get().timerSession;

    if (!session || !session.running) {
      return;
    }

    set({ timerSession: { ...session, elapsedSeconds: session.elapsedSeconds + Math.floor((Date.now() - session.startedAt) / 1000), running: false } });
  },
  resumeTimerSession: () => {
    const session = get().timerSession;

    if (!session || session.running) {
      return;
    }

    set({ timerSession: { ...session, startedAt: Date.now(), running: true } });
  },
  cancelTimerSession: () => {
    set({ timerSession: null });
  },
  finishTimerSession: () => {
    const session = get().timerSession;

    if (!session) {
      return;
    }

    const elapsedSeconds = session.elapsedSeconds + (session.running ? Math.floor((Date.now() - session.startedAt) / 1000) : 0);
    const minutes = Math.max(1, Math.ceil(elapsedSeconds / 60));
    get().completeHabit(session.habitId, minutes);
    set({ timerSession: null });
  },
  loadForUser: async (userId) => {
    if (userId === demoUserId) {
      get().resetLocalDemo();
      return;
    }

    set({ userId, loading: true, error: null });

    try {
      const [loadedHabits, loadedCompletions] = await Promise.all([
        fetchRemoteHabits(userId),
        fetchRemoteCompletions(userId)
      ]);
      const replay = await flushOfflineQueue();
      const [habits, completions] = replay.replayed > 0
        ? await Promise.all([
            fetchRemoteHabits(userId),
            fetchRemoteCompletions(userId)
          ])
        : [loadedHabits, loadedCompletions];
      updateWidgetSnapshot(habits, completions);
      set({
        habits,
        completions,
        loading: false,
        error: replay.remaining > 0 ? "Some offline changes are still waiting to sync." : null
      });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "Could not load habits." });
    }
  },
  resetLocalDemo: () => {
    set({
      userId: demoUserId,
      loading: true,
      recording: false,
      error: null,
      lastAIResult: null,
      lastTranscript: null,
      voiceFlowState: "idle",
      voiceMeter: { durationMillis: 0, level: 0, samples: Array.from({ length: 24 }, () => 0.08) },
      pendingAIResult: null,
      lastUndo: null,
      timerSession: null
    });
    void loadLocalSnapshot()
      .then(({ habits, completions }) => {
        updateWidgetSnapshot(habits, completions);
        set({
          habits,
          completions,
          loading: false
        });
      })
      .catch((error: Error) => {
        updateWidgetSnapshot(initialHabits, []);
        set({
          habits: initialHabits,
          completions: [],
          loading: false,
          error: error.message
        });
      });
  },
  todayHabits: () => get().habits.filter((habit) => isHabitActiveOnDate(habit))
}));
