import { normalizeFr } from "./normalize";
import { extractScheduledDate, extractScheduledTime, toIsoDate } from "./dateParser";

export type ResolvedTemporal = {
  scheduledDate: string | null;
  scheduledTime: string | null;
};

/** Score d'urgence — port Décharge Mentale. */
export function urgencyScore(text: string): number {
  const normalized = normalizeFr(text);
  let score = 24;
  if (/\b(urgent|urgence|asap|critique|immediatement|tout de suite)\b/.test(normalized)) {
    score = Math.max(score, 96);
  }
  if (/\b(aujourdhui|aujourd|ce soir|maintenant|des que possible)\b/.test(normalized)) {
    score = Math.max(score, 82);
  }
  if (/\b(demain|apres-demain)\b/.test(normalized)) {
    score = Math.max(score, 68);
  }
  if (/\b(deadline|date limite|dernier delai|avant)\b/.test(normalized)) {
    score = Math.max(score, 58);
  }
  return score;
}

export function needsAttentionToday(text: string): boolean {
  return urgencyScore(text) >= 82;
}

export function hasTemporalMention(text: string, reference = new Date()): boolean {
  return resolveTemporal(text, reference).scheduledDate !== null;
}

/** Date + heure pour l'agenda. Heure seule → aujourd'hui ; urgent/aujourd'hui → aujourd'hui. */
export function resolveTemporal(text: string, reference = new Date()): ResolvedTemporal {
  const scheduledTime = extractScheduledTime(text);
  let scheduledDate = extractScheduledDate(text, reference);
  if (!scheduledDate && scheduledTime) {
    scheduledDate = toIsoDate(reference);
  }
  if (!scheduledDate && needsAttentionToday(text)) {
    scheduledDate = toIsoDate(reference);
  }
  return { scheduledDate, scheduledTime };
}

/** Complète la date du jour pour une tâche agenda sans échéance explicite. */
export function resolveAgendaTemporal(text: string, reference = new Date()): ResolvedTemporal {
  const { scheduledDate, scheduledTime } = resolveTemporal(text, reference);
  if (scheduledDate) return { scheduledDate, scheduledTime };
  return { scheduledDate: toIsoDate(reference), scheduledTime };
}

/** @deprecated Préférer resolveTemporal */
export function resolveScheduledDate(text: string, reference = new Date()): string | null {
  return resolveTemporal(text, reference).scheduledDate;
}

/** « 17:00 » → « 17h » · « 17:30 » → « 17h30 » */
export function formatAgendaTime(isoTime: string): string {
  const [h, m] = isoTime.split(":");
  const hour = Number(h);
  if (!m || m === "00") return `${hour}h`;
  return `${hour}h${m}`;
}
