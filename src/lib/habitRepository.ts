import { supabase } from "@/lib/supabase";
import { normalizeAICommandResult } from "@/features/habits/aiValidation";
import type { AICommandRequest, AICommandResult } from "@/types/ai";
import type { Database, Json } from "@/types/database";
import type { Habit, HabitCompletion } from "@/types/habit";

const localUserId = "local-user";

type HabitRow = Database["public"]["Tables"]["habits"]["Row"];
type CompletionRow = Database["public"]["Tables"]["habit_completions"]["Row"];

function toHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    type: row.type,
    category: row.category,
    schedule: row.schedule,
    timeOfDay: row.time_of_day,
    targetCount: row.target_count,
    streak: row.streak,
    createdAt: row.created_at,
    archivedAt: row.archived_at
  };
}

function toCompletion(row: CompletionRow): HabitCompletion {
  return {
    id: row.id,
    habitId: row.habit_id,
    userId: row.user_id,
    completedOn: row.completed_on,
    count: row.count,
    createdAt: row.created_at
  };
}

function getRemoteClient(userId: string) {
  return supabase && userId !== localUserId ? supabase : null;
}

function isMissingTableError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  const message = error instanceof Error ? error.message : String((error as { message?: string } | null)?.message ?? "");

  return code === "PGRST205" || /could not find the table|schema cache/i.test(message);
}

async function functionErrorMessage(error: unknown) {
  const context = (error as { context?: Response } | null)?.context;

  if (context) {
    const text = await context.clone().text().catch(() => "");

    if (text) {
      try {
        const payload = JSON.parse(text) as { code?: string; message?: string; error?: string };
        return [payload.code, payload.message ?? payload.error].filter(Boolean).join(": ");
      } catch {
        return text;
      }
    }
  }

  return error instanceof Error ? error.message : "Edge function failed.";
}

function isMissingFunctionMessage(message: string) {
  return /NOT_FOUND|Requested function was not found/i.test(message);
}

export async function fetchRemoteHabits(userId: string) {
  const client = getRemoteClient(userId);

  if (!client) {
    return [];
  }

  const { data, error } = await client.from("habits").select("*").eq("user_id", userId).order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }

    throw error;
  }

  return data.map(toHabit);
}

export async function fetchRemoteCompletions(userId: string) {
  const client = getRemoteClient(userId);

  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("habit_completions")
    .select("*")
    .eq("user_id", userId)
    .order("completed_on", { ascending: true });

  if (error) {
    if (isMissingTableError(error)) {
      return [];
    }

    throw error;
  }

  return data.map(toCompletion);
}

export async function createRemoteHabit(habit: Habit) {
  const client = getRemoteClient(habit.userId);

  if (!client) {
    return;
  }

  const record: Database["public"]["Tables"]["habits"]["Insert"] = {
    id: habit.id,
    user_id: habit.userId,
    title: habit.title,
    type: habit.type,
    category: habit.category,
    schedule: habit.schedule,
    time_of_day: habit.timeOfDay,
    target_count: habit.targetCount ?? null,
    streak: habit.streak,
    created_at: habit.createdAt,
    archived_at: habit.archivedAt ?? null
  };

  const { error } = await (client.from("habits") as any).insert(record);

  if (error) {
    throw error;
  }
}

export async function updateRemoteHabit(habit: Habit) {
  const client = getRemoteClient(habit.userId);

  if (!client) {
    return;
  }

  const record: Database["public"]["Tables"]["habits"]["Update"] = {
    title: habit.title,
    type: habit.type,
    category: habit.category,
    schedule: habit.schedule,
    time_of_day: habit.timeOfDay,
    target_count: habit.targetCount ?? null,
    streak: habit.streak,
    archived_at: habit.archivedAt ?? null
  };

  const { error } = await (client.from("habits") as any).update(record).eq("id", habit.id).eq("user_id", habit.userId);

  if (error) {
    throw error;
  }
}

export async function upsertRemoteCompletion(completion: HabitCompletion) {
  const client = getRemoteClient(completion.userId);

  if (!client) {
    return;
  }

  const record: Database["public"]["Tables"]["habit_completions"]["Insert"] = {
    id: completion.id,
    habit_id: completion.habitId,
    user_id: completion.userId,
    completed_on: completion.completedOn,
    count: completion.count,
    created_at: completion.createdAt
  };

  const { error } = await (client.from("habit_completions") as any).upsert(record, { onConflict: "habit_id,completed_on" });

  if (error) {
    throw error;
  }
}

export async function deleteRemoteCompletion(userId: string, habitId: string, completedOn: string) {
  const client = getRemoteClient(userId);

  if (!client) {
    return;
  }

  const { error } = await client
    .from("habit_completions")
    .delete()
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .eq("completed_on", completedOn);

  if (error) {
    throw error;
  }
}

export async function upsertRemoteStreak(habit: Habit) {
  const client = getRemoteClient(habit.userId);

  if (!client) {
    return;
  }

  const record: Database["public"]["Tables"]["streaks"]["Insert"] = {
    habit_id: habit.id,
    user_id: habit.userId,
    current_count: habit.streak,
    best_count: habit.streak,
    updated_at: new Date().toISOString()
  };

  const { error } = await (client.from("streaks") as any).upsert(record, { onConflict: "habit_id" });

  if (error) {
    throw error;
  }
}

export async function logRemoteAIEvent(userId: string, eventType: string, input: Json, output: Json | null) {
  const client = getRemoteClient(userId);

  if (!client) {
    return;
  }

  const record: Database["public"]["Tables"]["ai_events"]["Insert"] = {
    user_id: userId,
    event_type: eventType,
    input,
    output
  };

  const { error } = await (client.from("ai_events") as any).insert(record);

  if (error) {
    return;
  }
}

export async function invokeRemoteAICommand(userId: string, request: AICommandRequest): Promise<AICommandResult | null> {
  const client = getRemoteClient(userId);

  if (!client) {
    return null;
  }

  const { data, error } = await client.functions.invoke<AICommandResult>("parse-habit", {
    body: request
  });

  if (error) {
    const message = await functionErrorMessage(error);

    if (isMissingFunctionMessage(message)) {
      return null;
    }

    throw new Error(message);
  }

  const result = normalizeAICommandResult(data);
  await logRemoteAIEvent(userId, "parse-habit", request as unknown as Json, (result ?? null) as Json | null);
  return result;
}

export async function transcribeRemoteAudio(userId: string, audio: { base64: string; mimeType: string }) {
  const client = getRemoteClient(userId);

  if (!client) {
    return null;
  }

  const { data, error } = await client.functions.invoke<{ text: string }>("transcribe-audio", {
    body: audio
  });

  if (error) {
    const message = await functionErrorMessage(error);
    throw new Error(isMissingFunctionMessage(message) ? "The transcribe-audio edge function is not deployed." : message);
  }

  await logRemoteAIEvent(userId, "transcribe-audio", { mimeType: audio.mimeType }, { text: data?.text ?? "" });
  return data?.text ?? "";
}

export async function invokeRemoteRoutineBuilder(userId: string, prompt: string, request: Omit<AICommandRequest, "transcript">) {
  const client = getRemoteClient(userId);

  if (!client) {
    return null;
  }

  const { data, error } = await client.functions.invoke<AICommandResult>("routine-builder", {
    body: { ...request, prompt }
  });

  if (error) {
    const message = await functionErrorMessage(error);

    if (isMissingFunctionMessage(message)) {
      return null;
    }

    throw new Error(message);
  }

  const result = normalizeAICommandResult(data);
  await logRemoteAIEvent(userId, "routine-builder", { prompt } as Json, (result ?? null) as Json | null);
  return result;
}
