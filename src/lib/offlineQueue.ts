import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  createRemoteHabit,
  deleteRemoteCompletion,
  updateRemoteHabit,
  upsertRemoteCompletion
} from "@/lib/habitRepository";
import type { Habit, HabitCompletion } from "@/types/habit";

export type OfflineQueueItem =
  | {
      id: string;
      type: "createHabit";
      payload: Habit;
      createdAt: string;
    }
  | {
      id: string;
      type: "completeHabit";
      payload: HabitCompletion;
      createdAt: string;
    }
  | {
      id: string;
      type: "deleteCompletion";
      payload: { userId: string; habitId: string; completedOn: string };
      createdAt: string;
    }
  | {
      id: string;
      type: "updateHabit";
      payload: Habit;
      createdAt: string;
    };

export type OfflineQueueInput = Omit<OfflineQueueItem, "id" | "createdAt">;

const key = "habit.offline.queue.v1";

async function persistQueue(items: OfflineQueueItem[]) {
  if (!items.length) {
    await clearOfflineQueue();
    return;
  }

  await AsyncStorage.setItem(key, JSON.stringify(items));
}

async function replayOfflineAction(item: OfflineQueueItem) {
  switch (item.type) {
    case "createHabit":
      await createRemoteHabit(item.payload);
      return;
    case "completeHabit":
      await upsertRemoteCompletion(item.payload);
      return;
    case "deleteCompletion":
      await deleteRemoteCompletion(item.payload.userId, item.payload.habitId, item.payload.completedOn);
      return;
    case "updateHabit":
      await updateRemoteHabit(item.payload);
      return;
  }
}

export async function enqueueOfflineAction(item: OfflineQueueInput) {
  const current = await getOfflineQueue();
  const next: OfflineQueueItem = {
    id: `${Date.now()}-${current.length}`,
    createdAt: new Date().toISOString(),
    ...item
  } as OfflineQueueItem;

  await persistQueue([...current, next]);
}

export async function getOfflineQueue() {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as OfflineQueueItem[]) : [];
}

export async function flushOfflineQueue() {
  const pending = await getOfflineQueue();
  const remaining = [...pending];
  let replayed = 0;

  while (remaining.length) {
    const [item] = remaining;
    await replayOfflineAction(item);
    remaining.shift();
    replayed += 1;
    await persistQueue(remaining);
  }

  return { replayed, remaining: remaining.length };
}

export async function clearOfflineQueue() {
  await AsyncStorage.removeItem(key);
}
