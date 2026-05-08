import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

type PermissionState = "idle" | "granted" | "denied" | "unavailable";

type PersistedOnboarding = {
  completed: boolean;
  displayName: string;
  notificationPermission: PermissionState;
  voicePermission: PermissionState;
};

type OnboardingState = PersistedOnboarding & {
  loaded: boolean;
  load: () => Promise<void>;
  setDisplayName: (displayName: string) => void;
  setNotificationPermission: (permission: PermissionState) => void;
  setVoicePermission: (permission: PermissionState) => void;
  complete: (displayName: string) => Promise<void>;
  reset: () => Promise<void>;
};

const key = "habit.onboarding.v1";

const defaults: PersistedOnboarding = {
  completed: false,
  displayName: "",
  notificationPermission: "idle",
  voicePermission: "idle"
};

function normalizePermission(value: unknown): PermissionState {
  return value === "granted" || value === "denied" || value === "unavailable" ? value : "idle";
}

function normalizeStoredOnboarding(value: unknown): PersistedOnboarding {
  if (!value || typeof value !== "object") {
    return defaults;
  }

  const stored = value as Partial<PersistedOnboarding>;

  return {
    completed: stored.completed === true,
    displayName: typeof stored.displayName === "string" ? stored.displayName : "",
    notificationPermission: normalizePermission(stored.notificationPermission),
    voicePermission: normalizePermission(stored.voicePermission)
  };
}

function persist(state: PersistedOnboarding) {
  void AsyncStorage.setItem(key, JSON.stringify(state));
}

function currentPersisted(state: OnboardingState): PersistedOnboarding {
  return {
    completed: state.completed,
    displayName: state.displayName,
    notificationPermission: state.notificationPermission,
    voicePermission: state.voicePermission
  };
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...defaults,
  loaded: false,
  load: async () => {
    const raw = await AsyncStorage.getItem(key);
    let loaded = defaults;

    try {
      loaded = raw ? normalizeStoredOnboarding(JSON.parse(raw)) : defaults;
    } catch {
      await AsyncStorage.removeItem(key);
    }

    set({ ...loaded, loaded: true });
  },
  setDisplayName: (displayName) => {
    set({ displayName });
    persist({ ...currentPersisted(get()), displayName });
  },
  setNotificationPermission: (notificationPermission) => {
    set({ notificationPermission });
    persist({ ...currentPersisted(get()), notificationPermission });
  },
  setVoicePermission: (voicePermission) => {
    set({ voicePermission });
    persist({ ...currentPersisted(get()), voicePermission });
  },
  complete: async (displayName) => {
    const next = {
      completed: true,
      displayName: displayName.trim(),
      notificationPermission: get().notificationPermission,
      voicePermission: get().voicePermission
    };

    await AsyncStorage.setItem(key, JSON.stringify(next));
    set({ ...next, loaded: true });
  },
  reset: async () => {
    await AsyncStorage.removeItem(key);
    set({ ...defaults, loaded: true });
  }
}));

export type { PermissionState };
