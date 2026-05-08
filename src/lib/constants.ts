import { CONTRACT_VERSION } from "./contract-version";

export const APP_NAME = "Habit" as const;
export const APP_TAGLINE = "One tap and done." as const;
export const APP_DESCRIPTION = "A minimal AI-powered habit tracker." as const;

export const TIME_OF_DAY_ORDER = ["morning", "afternoon", "evening", "anytime"] as const;

export const TAB_ROUTES = ["Home", "Streaks", "Analytics", "Settings"] as const;

export const PRESET_HABITS = [
  "Drink Water",
  "Read",
  "Workout",
  "Meditate",
  "Journal",
  "Walk",
  "Code"
] as const;

export { CONTRACT_VERSION };
