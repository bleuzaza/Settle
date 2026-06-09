import { normalizeFr } from "./normalize";

const WEEKDAYS: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

const MONTHS: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function addDays(date: Date, days: number): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function parseIsoInText(text: string): string | null {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso && isValidIsoDate(iso[0])) return iso[0];
  return null;
}

function parseFrNumericDate(text: string): string | null {
  const fr = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b/);
  if (!fr) return null;
  const [, d, m, y] = fr;
  const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  return isValidIsoDate(iso) ? iso : null;
}

function parseDayMonth(text: string, now: Date): string | null {
  const normalized = normalizeFr(text);
  const match = normalized.match(/\b(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\b/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = MONTHS[match[2]];
  let year = now.getFullYear();
  const candidate = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (candidate < startOfDay(now) && !/\b20\d{2}\b/.test(normalized)) {
    year += 1;
  }
  const iso = toIsoDate(new Date(year, month - 1, day, 12, 0, 0, 0));
  return isValidIsoDate(iso) ? iso : null;
}

function parseInDays(text: string, now: Date): string | null {
  const normalized = normalizeFr(text);
  const match = normalized.match(/\bdans\s+(\d{1,2})\s+jours?\b/);
  if (!match) return null;
  return toIsoDate(addDays(now, Number(match[1])));
}

function parseWeekday(text: string, now: Date): string | null {
  const normalized = normalizeFr(text);
  for (const [name, target] of Object.entries(WEEKDAYS)) {
    if (!new RegExp(`\\b${name}\\b`).test(normalized)) continue;
    let delta = (target - now.getDay() + 7) % 7;
    if (delta === 0 || new RegExp(`\\b${name}\\s+prochain\\b`).test(normalized)) {
      delta += 7;
    }
    return toIsoDate(addDays(now, delta));
  }
  return null;
}

function parseRelative(text: string, now: Date): string | null {
  const normalized = normalizeFr(text);
  if (/\b(aujourdhui|aujourd hui|maintenant|ce soir|cet apres-midi|cette apres-midi)\b/.test(normalized)) {
    return toIsoDate(now);
  }
  if (/\bapres-demain\b/.test(normalized)) {
    return toIsoDate(addDays(now, 2));
  }
  if (/\bdemain\b/.test(normalized)) {
    return toIsoDate(addDays(now, 1));
  }
  if (/\bce week-end\b|\bce weekend\b/.test(normalized)) {
    const day = now.getDay();
    const delta = day === 6 ? 0 : day === 0 ? 0 : 6 - day;
    return toIsoDate(addDays(now, delta));
  }
  return null;
}

/** Extrait une heure HH:MM (17h, à 14h30, matin, soir…). */
export function extractScheduledTime(text: string): string | null {
  const normalized = normalizeFr(text);
  const match = normalized.match(/\b(?:a\s+)?([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?\b/);
  if (match) {
    const h = String(match[1]).padStart(2, "0");
    const m = String(match[2] || "00").padStart(2, "0");
    return `${h}:${m}`;
  }
  if (/\bmatin\b/.test(normalized)) return "09:00";
  if (/\b(midi|dejeuner)\b/.test(normalized)) return "12:00";
  if (/\bapres-midi\b/.test(normalized)) return "14:00";
  if (/\bsoir\b/.test(normalized)) return "18:00";
  return null;
}

/** Extrait une date ISO (YYYY-MM-DD) du texte, ou null. */
export function extractScheduledDate(text: string, reference = new Date()): string | null {
  const now = startOfDay(reference);
  return (
    parseIsoInText(text) ??
    parseFrNumericDate(text) ??
    parseRelative(text, now) ??
    parseInDays(text, now) ??
    parseWeekday(text, now) ??
    parseDayMonth(text, now)
  );
}
