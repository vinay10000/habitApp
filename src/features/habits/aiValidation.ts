import { isDateKey } from "@/lib/dates";
import type { AICommandResult, AIConfidence, AIHabitDraft, AIHabitPatch } from "@/types/ai";
import type { HabitCategory, HabitType } from "@/types/habit";
import type { DayOfWeek, Schedule, TimeOfDay } from "@/types/schedule";

const confidenceValues: AIConfidence[] = ["high", "medium", "low"];
const habitTypes: HabitType[] = ["binary", "count", "timer", "negative"];
const habitCategories: HabitCategory[] = ["health", "learning", "fitness", "mindfulness", "productivity", "personal"];
const timesOfDay: TimeOfDay[] = ["morning", "afternoon", "evening", "anytime"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && options.includes(value as T);
}

function toPositiveInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

function normalizeSchedule(value: unknown): Schedule | null {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }

  switch (value.kind) {
    case "daily":
      return { kind: "daily" };
    case "weekdays":
      return { kind: "weekdays" };
    case "weekends":
      return { kind: "weekends" };
    case "customDays": {
      if (!Array.isArray(value.days)) {
        return null;
      }

      const days = Array.from(new Set(value.days));
      const validDays = days.every((day): day is DayOfWeek => Number.isInteger(day) && day >= 0 && day <= 6);
      return validDays && days.length > 0 ? { kind: "customDays", days } : null;
    }
    case "everyXDays": {
      const interval = toPositiveInteger(value.interval);
      return interval && interval <= 366 && typeof value.anchorDate === "string" && isDateKey(value.anchorDate)
        ? { kind: "everyXDays", interval, anchorDate: value.anchorDate }
        : null;
    }
    case "monthly": {
      const dayOfMonth = toPositiveInteger(value.dayOfMonth);
      return dayOfMonth && dayOfMonth <= 31 ? { kind: "monthly", dayOfMonth } : null;
    }
    case "oneTime":
      return typeof value.date === "string" && isDateKey(value.date) ? { kind: "oneTime", date: value.date } : null;
    default:
      return null;
  }
}

function normalizeDraft(value: unknown): AIHabitDraft | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";
  const schedule = normalizeSchedule(value.schedule);

  if (
    !title ||
    title.length > 120 ||
    !isOneOf(value.type, habitTypes) ||
    !isOneOf(value.category, habitCategories) ||
    !isOneOf(value.timeOfDay, timesOfDay) ||
    !schedule
  ) {
    return null;
  }

  const targetCount = value.targetCount === undefined || value.targetCount === null ? undefined : toPositiveInteger(value.targetCount);

  if ((value.targetCount !== undefined && value.targetCount !== null && !targetCount) || (targetCount && targetCount > 1440)) {
    return null;
  }

  return {
    title,
    type: value.type,
    schedule,
    timeOfDay: value.timeOfDay,
    category: value.category,
    ...(targetCount ? { targetCount } : {})
  };
}

function normalizePatch(value: unknown): AIHabitPatch | null {
  if (!isRecord(value)) {
    return null;
  }

  const patch: AIHabitPatch = {};

  if (value.title !== undefined) {
    if (typeof value.title !== "string" || !value.title.trim() || value.title.trim().length > 120) {
      return null;
    }
    patch.title = value.title.trim();
  }

  if (value.type !== undefined) {
    if (!isOneOf(value.type, habitTypes)) {
      return null;
    }
    patch.type = value.type;
  }

  if (value.category !== undefined) {
    if (!isOneOf(value.category, habitCategories)) {
      return null;
    }
    patch.category = value.category;
  }

  if (value.timeOfDay !== undefined) {
    if (!isOneOf(value.timeOfDay, timesOfDay)) {
      return null;
    }
    patch.timeOfDay = value.timeOfDay;
  }

  if (value.schedule !== undefined) {
    const schedule = normalizeSchedule(value.schedule);
    if (!schedule) {
      return null;
    }
    patch.schedule = schedule;
  }

  if (value.targetCount !== undefined) {
    const targetCount = value.targetCount === null ? undefined : toPositiveInteger(value.targetCount);
    if (value.targetCount !== null && (!targetCount || targetCount > 1440)) {
      return null;
    }
    if (targetCount) {
      patch.targetCount = targetCount;
    }
  }

  return patch;
}

export function normalizeAICommandResult(value: unknown): AICommandResult | null {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }

  if (value.kind === "needsPreview") {
    return typeof value.reason === "string" && typeof value.transcript === "string"
      ? { kind: "needsPreview", reason: value.reason, transcript: value.transcript }
      : null;
  }

  if (!isOneOf(value.confidence, confidenceValues)) {
    return null;
  }

  switch (value.kind) {
    case "createHabit": {
      const draft = normalizeDraft(value.draft);
      return draft ? { kind: "createHabit", confidence: value.confidence, draft } : null;
    }
    case "completeHabit":
      return typeof value.habitId === "string" && value.habitId ? { kind: "completeHabit", confidence: value.confidence, habitId: value.habitId } : null;
    case "editHabit": {
      const patch = normalizePatch(value.patch);
      return typeof value.habitId === "string" && value.habitId && patch && typeof value.previewText === "string"
        ? { kind: "editHabit", confidence: value.confidence, habitId: value.habitId, patch, previewText: value.previewText }
        : null;
    }
    case "routine": {
      if (!Array.isArray(value.drafts) || typeof value.previewText !== "string") {
        return null;
      }

      const drafts = value.drafts.map(normalizeDraft);
      return drafts.length > 0 && drafts.length <= 5 && drafts.every(Boolean)
        ? { kind: "routine", confidence: value.confidence, drafts: drafts as AIHabitDraft[], previewText: value.previewText }
        : null;
    }
    default:
      return null;
  }
}
