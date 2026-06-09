const MONTHS_FR = [
  "JANVIER",
  "FÉVRIER",
  "MARS",
  "AVRIL",
  "MAI",
  "JUIN",
  "JUILLET",
  "AOÛT",
  "SEPTEMBRE",
  "OCTOBRE",
  "NOVEMBRE",
  "DÉCEMBRE",
];

const DAYS_FR = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function formatWeekLabel(monday: Date): string {
  const sunday = addDays(monday, 6);
  const d1 = monday.getDate();
  const d2 = sunday.getDate();
  const m = MONTHS_FR[sunday.getMonth()];
  if (monday.getMonth() === sunday.getMonth()) {
    return `${d1} — ${d2} ${m}`;
  }
  const m1 = MONTHS_FR[monday.getMonth()];
  return `${d1} ${m1} — ${d2} ${m}`;
}

export function dayNameShort(date: Date): string {
  return DAYS_FR[date.getDay()];
}

export function buildWeekMondays(pastCount = 6, futureCount = 4): Date[] {
  const current = mondayOf(new Date());
  const weeks: Date[] = [];
  for (let i = pastCount; i > 0; i -= 1) {
    weeks.push(addDays(current, -7 * i));
  }
  weeks.push(current);
  for (let i = 1; i <= futureCount; i += 1) {
    weeks.push(addDays(current, 7 * i));
  }
  return weeks;
}

export type WeekKind = "past" | "current" | "future";

export function weekKind(monday: Date): WeekKind {
  const current = mondayOf(new Date()).getTime();
  const t = monday.getTime();
  if (t < current) return "past";
  if (t > current) return "future";
  return "current";
}
