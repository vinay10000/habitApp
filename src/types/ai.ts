import type { HabitCategory, HabitType } from "./habit";
import type { Schedule, TimeOfDay } from "./schedule";

export type AIConfidence = "high" | "medium" | "low";

export type AIHabitDraft = {
  title: string;
  type: HabitType;
  schedule: Schedule;
  timeOfDay: TimeOfDay;
  category: HabitCategory;
  targetCount?: number;
  reminderTime?: string;
};

export type AIHabitPatch = Partial<Pick<AIHabitDraft, "title" | "type" | "schedule" | "timeOfDay" | "category" | "targetCount" | "reminderTime">>;

export type AICommandResult =
  | { kind: "createHabit"; confidence: AIConfidence; draft: AIHabitDraft }
  | { kind: "completeHabit"; confidence: AIConfidence; habitId: string }
  | { kind: "editHabit"; confidence: AIConfidence; habitId: string; patch: AIHabitPatch; previewText: string }
  | { kind: "routine"; confidence: AIConfidence; drafts: AIHabitDraft[]; previewText: string }
  | { kind: "needsPreview"; reason: string; transcript: string };

export type AICommandRequest = {
  transcript: string;
  habits: { id: string; title: string; type: HabitType; category: HabitCategory; timeOfDay: TimeOfDay }[];
  dateKey: string;
};
