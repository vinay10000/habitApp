import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { isHabitComplete } from "@/features/habits/completion";
import { isHabitActiveOnDate } from "@/features/habits/schedule";
import { toDateKey } from "@/lib/dates";
import type { Habit, HabitCompletion } from "@/types/habit";
import type { HabitReminderPreference } from "@/store/settingsStore";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

const defaultReminderId = "habit-reminder-default";
const habitReminderPrefix = "habit-reminder-habit-";

function habitReminderId(habitId: string) {
  return `${habitReminderPrefix}${habitId}`;
}

async function cancelHabitReminder(habitId: string) {
  await Notifications.cancelScheduledNotificationAsync(habitReminderId(habitId)).catch(() => undefined);
}

async function ensureAndroidPermission() {
  if (Platform.OS !== "android") {
    return false;
  }

  const permission = await Notifications.requestPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Notification permission is required for reminders.");
  }

  return true;
}

export async function scheduleDailyReminder(remaining: number, hour = 20) {
  if (!(await ensureAndroidPermission())) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(defaultReminderId).catch(() => undefined);

  if (remaining <= 0) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: defaultReminderId,
    content: {
      title: "One tap and done",
      body: remaining === 1 ? "1 habit left today." : `${remaining} habits left today.`,
      sound: false
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute: 0,
      repeats: true
    }
  });
}

export async function cancelDailyReminder() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(defaultReminderId).catch(() => undefined);
}

export async function scheduleHabitReminders(
  habits: Habit[],
  completions: HabitCompletion[],
  preferences: Record<string, HabitReminderPreference>,
  defaultHour = 20
) {
  if (!(await ensureAndroidPermission())) {
    return;
  }

  const today = toDateKey();

  await Promise.all(habits.map((habit) => cancelHabitReminder(habit.id)));

  await Promise.all(
    habits.map(async (habit) => {
      const preference = preferences[habit.id] ?? { mode: "default", hour: defaultHour };

      if (preference.mode !== "custom" || habit.archivedAt || !isHabitActiveOnDate(habit) || isHabitComplete(habit, completions, today)) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        identifier: habitReminderId(habit.id),
        content: {
          title: habit.title,
          body: "Still open for today.",
          sound: false,
          data: { habitId: habit.id }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: preference.hour,
          minute: 0,
          repeats: true
        }
      });
    })
  );
}

export async function syncReminderSchedule(options: {
  habits: Habit[];
  completions: HabitCompletion[];
  dailyReminder: boolean;
  reminderHour: number;
  habitReminders: Record<string, HabitReminderPreference>;
}) {
  const today = toDateKey();
  const activeHabits = options.habits.filter((habit) => isHabitActiveOnDate(habit));
  const remainingDefaultHabits = activeHabits.filter((habit) => {
    const preference = options.habitReminders[habit.id];
    return preference?.mode !== "off" && preference?.mode !== "custom" && !isHabitComplete(habit, options.completions, today);
  });

  if (options.dailyReminder) {
    await scheduleDailyReminder(remainingDefaultHabits.length, options.reminderHour);
  } else {
    await cancelDailyReminder();
  }

  await scheduleHabitReminders(options.habits, options.completions, options.habitReminders, options.reminderHour);
}
