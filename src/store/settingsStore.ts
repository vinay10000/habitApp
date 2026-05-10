import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { setActiveTheme } from "@/theme/tokens";

export type ThemeName = "amoled" | "monochrome" | "paper" | "pastel";

export type HabitReminderPreference = {
  mode: "default" | "custom" | "off";
  hour: number;
};

export type SettingsState = {
  theme: ThemeName;
  dailyReminder: boolean;
  smartReminderCopy: boolean;
  reduceMotion: boolean;
  reminderHour: number;
  habitReminders: Record<string, HabitReminderPreference>;
  loaded: boolean;
  setTheme: (theme: ThemeName) => void;
  setReminderHour: (hour: number) => void;
  setHabitReminder: (habitId: string, reminder: HabitReminderPreference) => void;
  toggle: (key: "dailyReminder" | "smartReminderCopy" | "reduceMotion") => void;
  load: () => Promise<void>;
};

const key = "habit.settings.v1";
const defaults = {
  theme: "amoled" as ThemeName,
  dailyReminder: true,
  smartReminderCopy: true,
  reduceMotion: true,
  reminderHour: 20,
  habitReminders: {} as Record<string, HabitReminderPreference>
};

function isThemeName(value: unknown): value is ThemeName {
  return value === "amoled" || value === "monochrome" || value === "paper" || value === "pastel";
}

function normalizeStoredSettings(value: unknown) {
  if (!value || typeof value !== "object") {
    return defaults;
  }

  const stored = value as Partial<typeof defaults>;
  const habitReminders: Record<string, HabitReminderPreference> = {};

  if (stored.habitReminders && typeof stored.habitReminders === "object") {
    Object.entries(stored.habitReminders as Record<string, Partial<HabitReminderPreference>>).forEach(([habitId, reminder]) => {
      const mode = reminder.mode === "custom" || reminder.mode === "off" ? reminder.mode : "default";
      const hour = typeof reminder.hour === "number" && Number.isFinite(reminder.hour)
        ? Math.min(23, Math.max(0, Math.round(reminder.hour)))
        : defaults.reminderHour;

      habitReminders[habitId] = { mode, hour };
    });
  }

  return {
    theme: isThemeName(stored.theme) ? stored.theme : defaults.theme,
    dailyReminder: typeof stored.dailyReminder === "boolean" ? stored.dailyReminder : defaults.dailyReminder,
    smartReminderCopy: typeof stored.smartReminderCopy === "boolean" ? stored.smartReminderCopy : defaults.smartReminderCopy,
    reduceMotion: typeof stored.reduceMotion === "boolean" ? stored.reduceMotion : defaults.reduceMotion,
    reminderHour: typeof stored.reminderHour === "number" && Number.isFinite(stored.reminderHour)
      ? Math.min(23, Math.max(0, Math.round(stored.reminderHour)))
      : defaults.reminderHour,
    habitReminders
  };
}

function persist(state: SettingsState) {
  void AsyncStorage.setItem(
    key,
    JSON.stringify({
      theme: state.theme,
      dailyReminder: state.dailyReminder,
      smartReminderCopy: state.smartReminderCopy,
      reduceMotion: state.reduceMotion,
      reminderHour: state.reminderHour,
      habitReminders: state.habitReminders
    })
  );
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaults,
  loaded: false,
  setTheme: (theme) => {
    setActiveTheme(theme);
    set({ theme });
    persist(get());
  },
  setReminderHour: (hour) => {
    set({ reminderHour: Math.min(23, Math.max(0, Math.round(hour))) });
    persist(get());
  },
  setHabitReminder: (habitId, reminder) => {
    set((state) => ({
      habitReminders: {
        ...state.habitReminders,
        [habitId]: {
          mode: reminder.mode,
          hour: Math.min(23, Math.max(0, Math.round(reminder.hour)))
        }
      }
    }));
    persist(get());
  },
  toggle: (setting) => {
    set((state) => ({ [setting]: !state[setting] }));
    persist(get());
  },
  load: async () => {
    const raw = await AsyncStorage.getItem(key);
    let loaded = defaults;

    try {
      loaded = raw ? normalizeStoredSettings(JSON.parse(raw)) : defaults;
    } catch {
      await AsyncStorage.removeItem(key);
    }

    setActiveTheme(loaded.theme);
    set({ ...loaded, loaded: true });
  }
}));
