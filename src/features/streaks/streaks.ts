import { isHabitScheduledForDate } from "@/features/habits/schedule";
import { isHabitComplete } from "@/features/habits/completion";
import { toDateKey } from "@/lib/dates";
import type { Habit, HabitCompletion } from "@/types/habit";

function hasCompletionOnDate(habit: Habit, completions: HabitCompletion[], dateKey: string) {
  return isHabitComplete(habit, completions, dateKey);
}

export function calculateCurrentStreak(habit: Habit, completions: HabitCompletion[], today = new Date()) {
  if (habit.schedule.kind === "oneTime") {
    return isHabitComplete(habit, completions, habit.schedule.date) ? 1 : 0;
  }

  let streak = 0;
  let recoveryDays = 1;
  const cursor = new Date(today);

  for (let index = 0; index < 365; index += 1) {
    if (!isHabitScheduledForDate(habit.schedule, cursor)) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    const dateKey = toDateKey(cursor);
    const createdDateKey = toDateKey(new Date(habit.createdAt));

    if (dateKey < createdDateKey) {
      break;
    }

    if (!hasCompletionOnDate(habit, completions, dateKey)) {
      if (habit.type !== "negative" && recoveryDays > 0 && streak > 0) {
        recoveryDays -= 1;
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }

      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function getStreakState(habit: Habit, completions: HabitCompletion[], today = new Date()) {
  const streak = calculateCurrentStreak(habit, completions, today);

  return {
    streak,
    isActive: streak > 0,
    label: streak === 1 ? "1 day" : `${streak} days`
  };
}

export function isStreakBroken(habit: Habit, completions: HabitCompletion[], today = new Date()) {
  return calculateCurrentStreak(habit, completions, today) === 0;
}

export function streakDaySpan(habit: Habit, completions: HabitCompletion[], today = new Date()) {
  return calculateCurrentStreak(habit, completions, today);
}

export function streakHasMinimumDays(habit: Habit, completions: HabitCompletion[], minimumDays: number, today = new Date()) {
  return calculateCurrentStreak(habit, completions, today) >= minimumDays;
}

export function calculateBestStreak(habit: Habit, completions: HabitCompletion[], today = new Date()) {
  if (habit.schedule.kind === "oneTime") {
    return isHabitComplete(habit, completions, habit.schedule.date) ? 1 : 0;
  }

  let best = 0;
  let current = 0;
  const createdDateKey = toDateKey(new Date(habit.createdAt));
  const cursor = new Date(`${createdDateKey}T12:00:00`);
  const end = new Date(today);

  for (let index = 0; index < 730 && cursor <= end; index += 1) {
    if (!isHabitScheduledForDate(habit.schedule, cursor)) {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    const dateKey = toDateKey(cursor);

    if (hasCompletionOnDate(habit, completions, dateKey)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return best;
}
