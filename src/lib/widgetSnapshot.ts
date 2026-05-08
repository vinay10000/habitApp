import AsyncStorage from "@react-native-async-storage/async-storage";

import { isHabitComplete } from "@/features/habits/completion";
import { toDateKey } from "@/lib/dates";
import { updateNativeWidget } from "@/lib/habitWidgetNative";
import type { Habit, HabitCompletion } from "@/types/habit";

export const WIDGET_SNAPSHOT_KEY = "habit.widget.snapshot.v1";

export type WidgetHabit = {
  id: string;
  title: string;
  done: boolean;
  streak: number;
};

export type WidgetSnapshot = {
  dateKey: string;
  done: number;
  total: number;
  remaining: number;
  progress: number;
  bestStreak: number;
  nextHabit: WidgetHabit | null;
  habits: WidgetHabit[];
  updatedAt: string;
};

export function createWidgetSnapshot(habits: Habit[], completions: HabitCompletion[], date = new Date()): WidgetSnapshot {
  const dateKey = toDateKey(date);
  const widgetHabits = habits.slice(0, 5).map((habit) => ({
    id: habit.id,
    title: habit.title,
    done: isHabitComplete(habit, completions, dateKey),
    streak: habit.streak
  }));
  const done = widgetHabits.filter((habit) => habit.done).length;
  const total = widgetHabits.length;
  const nextHabit = widgetHabits.find((habit) => !habit.done) ?? null;

  return {
    dateKey,
    done,
    total,
    remaining: Math.max(total - done, 0),
    progress: total ? Math.round((done / total) * 100) : 0,
    bestStreak: widgetHabits.reduce((best, habit) => Math.max(best, habit.streak), 0),
    nextHabit,
    habits: widgetHabits,
    updatedAt: new Date().toISOString()
  };
}

export async function persistWidgetSnapshot(snapshot: WidgetSnapshot) {
  await AsyncStorage.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
  updateNativeWidget(snapshot);
}
