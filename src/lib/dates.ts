const MILLISECONDS_PER_DAY = 86_400_000;

function toUtcMidnight(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return Date.UTC(year, month - 1, day);
}

export function isDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);

  return next;
}

export function daysBetween(startDateKey: string, endDateKey: string) {
  return Math.trunc((toUtcMidnight(endDateKey) - toUtcMidnight(startDateKey)) / MILLISECONDS_PER_DAY);
}

export function isSameDateKey(left: string, right: string) {
  return left === right;
}

export function clampDateKey(dateKey: string) {
  return isDateKey(dateKey) ? dateKey : toDateKey(new Date(dateKey));
}
