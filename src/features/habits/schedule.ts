import { daysBetween, toDateKey } from "@/lib/dates";
import type { Habit } from "@/types/habit";
import type { Schedule } from "@/types/schedule";

export function isHabitScheduledForDate(schedule: Schedule, date = new Date()) {
  const day = date.getDay();
  const dateKey = toDateKey(date);

  switch (schedule.kind) {
    case "daily":
      return true;
    case "weekdays":
      return day >= 1 && day <= 5;
    case "weekends":
      return day === 0 || day === 6;
    case "customDays":
      return schedule.days.includes(day as 0 | 1 | 2 | 3 | 4 | 5 | 6);
    case "everyXDays":
      return daysBetween(schedule.anchorDate, dateKey) >= 0 && daysBetween(schedule.anchorDate, dateKey) % schedule.interval === 0;
    case "monthly":
      return date.getDate() === schedule.dayOfMonth;
    case "oneTime":
      return dateKey === schedule.date;
  }
}

export function isHabitActiveOnDate(habit: Habit, date = new Date()) {
  const dateKey = toDateKey(date);
  const createdDateKey = toDateKey(new Date(habit.createdAt));
  const archivedDateKey = habit.archivedAt ? toDateKey(new Date(habit.archivedAt)) : null;

  return createdDateKey <= dateKey && (!archivedDateKey || dateKey < archivedDateKey) && isHabitScheduledForDate(habit.schedule, date);
}

export function isHabitScheduledForDateKey(schedule: Schedule, dateKey: string) {
  return isHabitScheduledForDate(schedule, new Date(`${dateKey}T00:00:00`));
}

export function filterHabitsBySchedule(habits: Habit[], date = new Date()) {
  return habits.filter((habit) => isHabitActiveOnDate(habit, date));
}

export function getScheduledHabitIds(habits: Habit[], date = new Date()) {
  return filterHabitsBySchedule(habits, date).map((habit) => habit.id);
}
