import assert from "node:assert/strict";

import { isHabitComplete, nextCompletionCount } from "../features/habits/completion";
import { addHabitDefaults, addHabitPresets, draftFromPreset } from "../features/habits/addHabitDraft";
import { isHabitActiveOnDate, isHabitScheduledForDate } from "../features/habits/schedule";
import { calculateCurrentStreak } from "../features/streaks/streaks";
import type { Habit, HabitCompletion } from "../types/habit";

const habit: Habit = {
  id: "read",
  userId: "local-user",
  title: "Read",
  type: "binary",
  category: "learning",
  schedule: { kind: "daily" },
  timeOfDay: "evening",
  streak: 0,
  createdAt: "2026-05-01T00:00:00.000Z"
};

const countHabit: Habit = { ...habit, id: "water", type: "count", targetCount: 3 };
const negativeHabit: Habit = { ...habit, id: "sugar", type: "negative" };
const completion: HabitCompletion = {
  id: "read-2026-05-07",
  habitId: "read",
  userId: "local-user",
  completedOn: "2026-05-07",
  count: 1,
  createdAt: "2026-05-07T00:00:00.000Z"
};

assert.equal(isHabitScheduledForDate({ kind: "weekdays" }, new Date("2026-05-07T12:00:00")), true);
assert.equal(isHabitScheduledForDate({ kind: "weekends" }, new Date("2026-05-09T12:00:00")), true);
assert.equal(isHabitScheduledForDate({ kind: "oneTime", date: "2026-05-07" }, new Date("2026-05-07T12:00:00")), true);
assert.equal(isHabitScheduledForDate({ kind: "oneTime", date: "2026-05-07" }, new Date("2026-05-08T12:00:00")), false);
assert.equal(nextCompletionCount(countHabit, { ...completion, habitId: "water", count: 2 }), 3);
assert.equal(isHabitComplete(habit, [completion], "2026-05-07"), true);
assert.equal(isHabitComplete(negativeHabit, [], "2026-05-07"), true);
assert.equal(isHabitComplete(negativeHabit, [{ ...completion, habitId: "sugar" }], "2026-05-07"), false);
assert.equal(calculateCurrentStreak(habit, [completion], new Date("2026-05-07T12:00:00")), 1);
assert.equal(calculateCurrentStreak(negativeHabit, [], new Date("2026-05-07T12:00:00")), 7);
assert.equal(calculateCurrentStreak({ ...negativeHabit, createdAt: "2026-05-07T00:00:00.000Z" }, [], new Date("2026-05-07T12:00:00")), 1);
assert.equal(isHabitActiveOnDate({ ...habit, createdAt: "2026-05-08T00:00:00.000Z" }, new Date("2026-05-07T12:00:00")), false);
assert.deepEqual(addHabitDefaults, {
  title: "",
  type: "binary",
  category: "personal",
  schedule: { kind: "daily" },
  timeOfDay: "anytime",
  reminderMode: "default",
  targetCount: ""
});
assert.deepEqual(draftFromPreset(addHabitPresets[0]), {
  title: "Drink water",
  type: "count",
  category: "health",
  schedule: { kind: "daily" },
  timeOfDay: "morning",
  reminderMode: "default",
  targetCount: "8"
});
assert.deepEqual(draftFromPreset(addHabitPresets.find((preset) => preset.title === "No sugar")!), {
  title: "No sugar",
  type: "negative",
  category: "health",
  schedule: { kind: "daily" },
  timeOfDay: "anytime",
  reminderMode: "default",
  targetCount: ""
});

console.log("domain tests passed");
