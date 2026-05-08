import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { setActiveTheme } from "@/theme/tokens";

export type ThemeName = "amoled" | "monochrome" | "paper" | "pastel";

export type SettingsState = {
  theme: ThemeName;
  dailyReminder: boolean;
  smartReminderCopy: boolean;
  reduceMotion: boolean;
  reminderHour: number;
  loaded: boolean;
  setTheme: (theme: ThemeName) => void;
  setReminderHour: (hour: number) => void;
  toggle: (key: "dailyReminder" | "smartReminderCopy" | "reduceMotion") => void;
  load: () => Promise<void>;
};

const key = "habit.settings.v1";
const defaults = {
  theme: "amoled" as ThemeName,
  dailyReminder: true,
  smartReminderCopy: true,
  reduceMotion: true,
  reminderHour: 20
};

function isThemeName(value: unknown): value is ThemeName {
  return value === "amoled" || value === "monochrome" || value === "paper" || value === "pastel";
}

function normalizeStoredSettings(value: unknown) {
  if (!value || typeof value !== "object") {
    return defaults;
  }

  const stored = value as Partial<typeof defaults>;

  return {
    theme: isThemeName(stored.theme) ? stored.theme : defaults.theme,
    dailyReminder: typeof stored.dailyReminder === "boolean" ? stored.dailyReminder : defaults.dailyReminder,
    smartReminderCopy: typeof stored.smartReminderCopy === "boolean" ? stored.smartReminderCopy : defaults.smartReminderCopy,
    reduceMotion: typeof stored.reduceMotion === "boolean" ? stored.reduceMotion : defaults.reduceMotion,
    reminderHour: typeof stored.reminderHour === "number" && Number.isFinite(stored.reminderHour)
      ? Math.min(23, Math.max(0, Math.round(stored.reminderHour)))
      : defaults.reminderHour
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
      reminderHour: state.reminderHour
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
