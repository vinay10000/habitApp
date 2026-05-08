import { toDateKey } from "@/lib/dates";
import { createUuid } from "@/lib/ids";
import type { Habit, HabitCompletion } from "@/types/habit";

export function getCompletionForHabit(habitId: string, completions: HabitCompletion[], dateKey = toDateKey()) {
  return completions.find((completion) => completion.habitId === habitId && completion.completedOn === dateKey);
}

export function getCompletionCountForHabit(habitId: string, completions: HabitCompletion[], dateKey = toDateKey()) {
  return getCompletionForHabit(habitId, completions, dateKey)?.count ?? 0;
}

export function getHabitCompletionTarget(habit: Habit) {
  if (habit.type === "count" || habit.type === "timer") {
    return Math.max(1, habit.targetCount ?? 1);
  }

  return 1;
}

export function isHabitComplete(habit: Habit, completions: HabitCompletion[], dateKey = toDateKey()) {
  const completionCount = getCompletionCountForHabit(habit.id, completions, dateKey);

  if (habit.type === "count" || habit.type === "timer") {
    return completionCount >= getHabitCompletionTarget(habit);
  }

  if (habit.type === "negative") {
    return completionCount === 0;
  }

  return completionCount > 0;
}

export function nextCompletionCount(habit: Habit, current?: HabitCompletion) {
  const currentCount = current?.count ?? 0;

  if (habit.type === "count") {
    return Math.min(currentCount + 1, getHabitCompletionTarget(habit));
  }

  if (habit.type === "timer") {
    return Math.min(currentCount + 5, getHabitCompletionTarget(habit));
  }

  return currentCount > 0 ? currentCount : 1;
}

export function completeHabitForDate(habit: Habit, completions: HabitCompletion[], dateKey = toDateKey()) {
  const current = getCompletionForHabit(habit.id, completions, dateKey);
  const nextCount = nextCompletionCount(habit, current);

  return current
    ? completions.map((completion) =>
        completion.id === current.id ? { ...completion, count: nextCount } : completion
      )
    : [
        ...completions,
        {
          id: createUuid(),
          habitId: habit.id,
          userId: habit.userId,
          completedOn: dateKey,
          count: nextCount,
          createdAt: new Date().toISOString()
        }
      ];
}

export function undoHabitCompletionForDate(habitId: string, completions: HabitCompletion[], dateKey = toDateKey()) {
  return completions
    .map((completion) =>
      completion.habitId === habitId && completion.completedOn === dateKey ? { ...completion, count: 0 } : completion
    )
    .filter((completion) => completion.count > 0);
}

export function getHabitCompletionState(habit: Habit, completions: HabitCompletion[], dateKey = toDateKey()) {
  const completionCount = getCompletionCountForHabit(habit.id, completions, dateKey);
  const targetCount = getHabitCompletionTarget(habit);

  return {
    completionCount,
    targetCount,
    isComplete: habit.type === "negative" ? completionCount === 0 : completionCount >= targetCount
  };
}
