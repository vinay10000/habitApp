import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export async function scheduleDailyReminder(remaining: number, hour = 20) {
  if (Platform.OS !== "android") {
    return;
  }

  const permission = await Notifications.requestPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Notification permission is required for reminders.");
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  if (remaining <= 0) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
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

  await Notifications.cancelAllScheduledNotificationsAsync();
}
