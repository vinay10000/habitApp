export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type DailySchedule = { kind: "daily" };
export type WeekdaySchedule = { kind: "weekdays" };
export type WeekendSchedule = { kind: "weekends" };
export type CustomDaysSchedule = { kind: "customDays"; days: DayOfWeek[] };
export type EveryXDaysSchedule = { kind: "everyXDays"; interval: number; anchorDate: string };
export type MonthlySchedule = { kind: "monthly"; dayOfMonth: number };
export type OneTimeSchedule = { kind: "oneTime"; date: string };

export type Schedule = DailySchedule | WeekdaySchedule | WeekendSchedule | CustomDaysSchedule | EveryXDaysSchedule | MonthlySchedule | OneTimeSchedule;

export type TimeOfDay = "morning" | "afternoon" | "evening" | "anytime";

export type ScheduleKind = Schedule["kind"];

export function isDailySchedule(schedule: Schedule): schedule is DailySchedule {
  return schedule.kind === "daily";
}

export function isRecurringSchedule(schedule: Schedule): schedule is Exclude<Schedule, DailySchedule> {
  return schedule.kind !== "daily";
}

export function getScheduleLabel(schedule: Schedule) {
  switch (schedule.kind) {
    case "daily":
      return "Daily";
    case "weekdays":
      return "Weekdays";
    case "weekends":
      return "Weekends";
    case "customDays":
      return "Custom days";
    case "everyXDays":
      return `Every ${schedule.interval} days`;
    case "monthly":
      return `Monthly on day ${schedule.dayOfMonth}`;
    case "oneTime":
      return "Once";
  }
}
