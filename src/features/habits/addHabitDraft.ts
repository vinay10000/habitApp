import type { HabitCategory, HabitType } from "@/types/habit";
import type { Schedule, TimeOfDay } from "@/types/schedule";

export type AddHabitReminderMode = "default" | "custom" | "off";

export type AddHabitDraft = {
  title: string;
  type: HabitType;
  category: HabitCategory;
  schedule: Schedule;
  timeOfDay: TimeOfDay;
  reminderMode: AddHabitReminderMode;
  targetCount: string;
};

export type AddHabitPreset = {
  title: string;
  emoji: string;
  type: HabitType;
  category: HabitCategory;
  schedule: Schedule;
  timeOfDay: TimeOfDay;
  targetCount?: string;
  goal: string;
};

export const addHabitDefaults: AddHabitDraft = {
  title: "",
  type: "binary",
  category: "personal",
  schedule: { kind: "daily" },
  timeOfDay: "anytime",
  reminderMode: "default",
  targetCount: ""
};

export const addHabitPresets: AddHabitPreset[] = [
  {
    title: "Drink water",
    emoji: "💧",
    type: "count",
    category: "health",
    schedule: { kind: "daily" },
    timeOfDay: "morning",
    targetCount: "8",
    goal: "8 glasses daily"
  },
  {
    title: "Read",
    emoji: "📖",
    type: "timer",
    category: "learning",
    schedule: { kind: "daily" },
    timeOfDay: "evening",
    targetCount: "20",
    goal: "20 minutes in the evening"
  },
  {
    title: "Deep work",
    emoji: "🎯",
    type: "timer",
    category: "productivity",
    schedule: { kind: "weekdays" },
    timeOfDay: "morning",
    targetCount: "45",
    goal: "45 focused minutes"
  },
  {
    title: "No sugar",
    emoji: "🚫",
    type: "negative",
    category: "health",
    schedule: { kind: "daily" },
    timeOfDay: "anytime",
    goal: "Protect the streak daily"
  },
  {
    title: "Gym",
    emoji: "🏋️",
    type: "binary",
    category: "fitness",
    schedule: { kind: "weekdays" },
    timeOfDay: "evening",
    goal: "Check off on weekdays"
  },
  {
    title: "Journal",
    emoji: "✍️",
    type: "binary",
    category: "mindfulness",
    schedule: { kind: "daily" },
    timeOfDay: "evening",
    goal: "Evening reflection"
  }
];

export function draftFromPreset(preset: AddHabitPreset): AddHabitDraft {
  return {
    ...addHabitDefaults,
    title: preset.title,
    type: preset.type,
    category: preset.category,
    schedule: preset.schedule,
    timeOfDay: preset.timeOfDay,
    targetCount: preset.targetCount ?? ""
  };
}
