import { extractScheduledDate, extractScheduledTime, toIsoDate } from "./dateParser";
import { normalizeFr } from "./normalize";

const WEEKDAY_NAMES = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const;

const WEEKDAYS: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

export type RecurrencePlan = {
  dates: string[];
  scheduledTime: string | null;
};

type Duration =
  | { unit: "days"; count: number }
  | { unit: "weeks"; count: number }
  | { unit: "months"; count: number };

type Frequency =
  | { mode: "daily"; intervalDays: number }
  | { mode: "weekly"; weekdays: number[]; intervalWeeks: number };

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function addDays(date: Date, days: number): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

const WEEKDAY_FORMS: Record<(typeof WEEKDAY_NAMES)[number], string> = {
  dimanche: "(?:dimanche|dimanches)",
  lundi: "(?:lundi|lundis)",
  mardi: "(?:mardi|mardis)",
  mercredi: "(?:mercredi|mercredis)",
  jeudi: "(?:jeudi|jeudis)",
  vendredi: "(?:vendredi|vendredis)",
  samedi: "(?:samedi|samedis)",
};

function weekdayPattern(name: (typeof WEEKDAY_NAMES)[number]): string {
  return WEEKDAY_FORMS[name];
}

function parseDuration(normalized: string): Duration | null {
  const weekMatch = normalized.match(/\b(?:pendant|sur|durant)\s+(\d+)\s+semaines?\b/);
  if (weekMatch) return { unit: "weeks", count: Number(weekMatch[1]) };

  if (/\b(?:pendant|sur|durant)\s+(?:une?|1)\s+semaines?\b/.test(normalized)) {
    return { unit: "weeks", count: 1 };
  }

  const dayMatch = normalized.match(/\b(?:pendant|sur|durant)\s+(\d+)\s+jours?\b/);
  if (dayMatch) return { unit: "days", count: Number(dayMatch[1]) };

  if (/\b(?:pendant|sur|durant)\s+(?:un|1)\s+jour\b/.test(normalized)) {
    return { unit: "days", count: 1 };
  }

  const monthMatch = normalized.match(/\b(?:pendant|sur|durant)\s+(\d+)\s+mois\b/);
  if (monthMatch) return { unit: "months", count: Number(monthMatch[1]) };

  if (/\b(?:pendant|sur|durant)\s+(?:un|1)\s+mois\b/.test(normalized)) {
    return { unit: "months", count: 1 };
  }

  return null;
}

function hasRecurrenceContext(normalized: string): boolean {
  return /\b(tous les|chaque|toutes les|pendant|durant|quinzaine|une fois sur|sur (?:deux|2|\d))\b/.test(
    normalized,
  );
}

function parseWeeklyInterval(normalized: string, weekday: number): number | null {
  const name = WEEKDAY_NAMES[weekday];
  const day = weekdayPattern(name);

  if (new RegExp(`\\b(?:un|une|1)\\s+${day}\\s+sur\\s+(?:deux|2)\\b`).test(normalized)) return 2;
  if (new RegExp(`\\btous les deux\\s+${day}\\b`).test(normalized)) return 2;
  if (new RegExp(`\\b${day}\\s+sur\\s+(?:deux|2)\\b`).test(normalized)) return 2;
  if (/\bune fois sur deux\b/.test(normalized)) return 2;
  if (/\bune fois sur 2\b/.test(normalized)) return 2;
  if (/\bquinzaine\b/.test(normalized)) return 2;

  const surN = normalized.match(new RegExp(`\\b(?:un|une|1)\\s+${day}\\s+sur\\s+(\\d+)\\b`));
  if (surN) return Math.max(2, Number(surN[1]));

  const everyNWeeksBefore = normalized.match(
    new RegExp(`\\btoutes les (\\d+) semaines?\\s+(?:le\\s+)?${day}\\b`),
  );
  if (everyNWeeksBefore) return Math.max(1, Number(everyNWeeksBefore[1]));

  const everyNWeeksAfter = normalized.match(new RegExp(`\\b${day}\\s+toutes les (\\d+) semaines?\\b`));
  if (everyNWeeksAfter) return Math.max(1, Number(everyNWeeksAfter[1]));

  return null;
}

function weekdayMentioned(normalized: string, weekday: number): boolean {
  const name = WEEKDAY_NAMES[weekday];
  const day = weekdayPattern(name);

  if (parseWeeklyInterval(normalized, weekday) !== null) return true;

  if (new RegExp(`\\b(?:chaque|tous les|toutes les)\\s+${day}\\b`).test(normalized)) return true;

  if (new RegExp(`\\b(?:le|les)\\s+${day}\\b`).test(normalized)) {
    return (
      parseDuration(normalized) !== null ||
      parseWeeklyInterval(normalized, weekday) !== null ||
      hasRecurrenceContext(normalized)
    );
  }

  if (hasRecurrenceContext(normalized) && new RegExp(`\\b${day}\\b`).test(normalized)) {
    return true;
  }

  return false;
}

function parseWeekdays(normalized: string): { weekdays: number[]; intervalWeeks: number } | null {
  const weekdays: number[] = [];
  let intervalWeeks = 1;

  for (let weekday = 0; weekday < 7; weekday += 1) {
    if (!weekdayMentioned(normalized, weekday)) continue;
    weekdays.push(weekday);
    const interval = parseWeeklyInterval(normalized, weekday);
    if (interval !== null) intervalWeeks = Math.max(intervalWeeks, interval);
  }

  if (weekdays.length === 0) return null;
  return { weekdays, intervalWeeks };
}

function parseFrequency(normalized: string): Frequency | null {
  if (/\b(tous les jours|chaque jour|quotidien|quotidiennement|tous les soirs|tous les matins)\b/.test(normalized)) {
    return { mode: "daily", intervalDays: 1 };
  }

  const everyNDays = normalized.match(/\btous les (\d+)\s+jours?\b/);
  if (everyNDays) return { mode: "daily", intervalDays: Number(everyNDays[1]) };

  if (/\b(chaque|tous les|toutes les)\s+week[- ]?ends?\b/.test(normalized)) {
    return { mode: "weekly", weekdays: [6, 0], intervalWeeks: 1 };
  }

  const weekly = parseWeekdays(normalized);
  if (weekly) {
    return { mode: "weekly", weekdays: weekly.weekdays, intervalWeeks: weekly.intervalWeeks };
  }

  return null;
}

function defaultOccurrences(frequency: Frequency): number {
  if (frequency.mode === "daily") return 7;
  const spanWeeks = frequency.intervalWeeks === 1 ? 8 : 8;
  return Math.max(2, Math.ceil(spanWeeks / frequency.intervalWeeks) * frequency.weekdays.length);
}

function resolveOccurrenceCount(frequency: Frequency, duration: Duration | null): number {
  if (!duration) return defaultOccurrences(frequency);

  if (frequency.mode === "daily") {
    if (duration.unit === "days") return Math.max(2, Math.ceil(duration.count / frequency.intervalDays));
    if (duration.unit === "weeks") return Math.max(2, Math.ceil((duration.count * 7) / frequency.intervalDays));
    return Math.max(2, Math.ceil((duration.count * 30) / frequency.intervalDays));
  }

  const dayCount = frequency.weekdays.length;
  if (duration.unit === "weeks") {
    return Math.max(dayCount, Math.ceil(duration.count / frequency.intervalWeeks) * dayCount);
  }
  if (duration.unit === "days") {
    return Math.max(dayCount, Math.ceil(duration.count / (7 * frequency.intervalWeeks)) * dayCount);
  }
  return Math.max(dayCount, Math.ceil((duration.count * 4) / frequency.intervalWeeks) * dayCount);
}

function nextWeekdayOnOrAfter(start: Date, weekday: number): Date {
  const base = startOfDay(start);
  const delta = (weekday - base.getDay() + 7) % 7;
  return addDays(base, delta);
}

function buildDailyDates(start: Date, occurrences: number, intervalDays: number): string[] {
  const dates: string[] = [];
  let cursor = startOfDay(start);
  for (let i = 0; i < occurrences; i += 1) {
    dates.push(toIsoDate(cursor));
    cursor = addDays(cursor, intervalDays);
  }
  return dates;
}

function buildMultiWeeklyDates(
  start: Date,
  weekdays: number[],
  weekCycles: number,
  intervalWeeks: number,
): string[] {
  const dates = new Set<string>();
  for (const weekday of weekdays) {
    let cursor = nextWeekdayOnOrAfter(start, weekday);
    for (let i = 0; i < weekCycles; i += 1) {
      dates.add(toIsoDate(cursor));
      cursor = addDays(cursor, 7 * intervalWeeks);
    }
  }
  return [...dates].sort();
}

/** Détecte une récurrence FR et génère les dates agenda. */
export function parseRecurrence(text: string, reference = new Date()): RecurrencePlan | null {
  const normalized = normalizeFr(text);
  const frequency = parseFrequency(normalized);
  if (!frequency) return null;

  const duration = parseDuration(normalized);
  let occurrenceBudget = resolveOccurrenceCount(frequency, duration);
  occurrenceBudget = Math.min(occurrenceBudget, 90);

  const explicitStart = extractScheduledDate(text, reference);
  const start = explicitStart
    ? new Date(`${explicitStart}T12:00:00`)
    : startOfDay(reference);

  const scheduledTime = extractScheduledTime(text);

  let dates: string[];
  if (frequency.mode === "daily") {
    dates = buildDailyDates(start, occurrenceBudget, frequency.intervalDays);
  } else {
    const weekCycles = Math.max(
      1,
      Math.ceil(occurrenceBudget / frequency.weekdays.length),
    );
    dates = buildMultiWeeklyDates(start, frequency.weekdays, weekCycles, frequency.intervalWeeks);
  }

  if (dates.length <= 1) return null;

  return { dates, scheduledTime };
}

export function hasRecurrence(text: string): boolean {
  const normalized = normalizeFr(text);
  return parseFrequency(normalized) !== null;
}
