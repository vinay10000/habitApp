import type { Schedule, TimeOfDay } from "./schedule";

export type HabitType = "binary" | "count" | "timer" | "negative";
export type HabitCategory = "health" | "learning" | "fitness" | "mindfulness" | "productivity" | "personal";

export type HabitCompletionCount = number;

export type Habit = {
  id: string;
  userId: string;
  title: string;
  type: HabitType;
  category: HabitCategory;
  schedule: Schedule;
  timeOfDay: TimeOfDay;
  targetCount?: number | null;
  streak: number;
  createdAt: string;
  archivedAt?: string | null;
};

export type HabitCompletion = {
  id: string;
  habitId: string;
  userId: string;
  completedOn: string;
  count: HabitCompletionCount;
  createdAt: string;
};

export type HabitWithCompletion = Habit & {
  completionCount: HabitCompletionCount;
  isComplete: boolean;
};

export type NewHabitInput = Pick<Habit, "title" | "type" | "category" | "schedule" | "timeOfDay" | "targetCount">;
