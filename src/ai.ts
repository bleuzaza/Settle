import { createEntry, getAllEntries, saveEntries, type Entry } from "./storage";
import { parseRecurrence } from "./utils/recurrence";
import { isValidIsoDate } from "./utils/dateParser";
import { detectEntryKind } from "./utils/entryKind";
import { classifyThemeLocal, normalizeTheme } from "./utils/themeClassifier";
import { polishThought, prepareAgendaText, splitThoughts } from "./utils/textProcessing";
import { resolveAgendaTemporal } from "./utils/temporal";

export type ClassificationResult = {
  kind: "agenda" | "note";
  theme: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
};

function parseModelJson(raw: string, sourceText: string): ClassificationResult | null {
  const trimmed = raw.trim();
  const attempts = [trimmed];
  const block = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (block) attempts.push(block[1].trim());
  const braces = trimmed.match(/\{[\s\S]*\}/);
  if (braces) attempts.push(braces[0]);

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt) as {
        kind?: string;
        theme?: string;
        scheduledDate?: string | null;
        scheduledTime?: string | null;
      };
      const theme = normalizeTheme(parsed.theme);
      const scheduledDate =
        parsed.scheduledDate && isValidIsoDate(parsed.scheduledDate) ? parsed.scheduledDate : null;
      const scheduledTime =
        parsed.scheduledTime && /^\d{2}:\d{2}$/.test(parsed.scheduledTime)
          ? parsed.scheduledTime
          : null;
      const kind =
        parsed.kind === "agenda" || parsed.kind === "note"
          ? parsed.kind
          : scheduledDate
            ? "agenda"
            : detectEntryKind(sourceText);
      return { kind, theme, scheduledDate, scheduledTime };
    } catch {
      /* try next */
    }
  }
  return null;
}

function classifyEntryLocal(text: string, existingThemes: string[]): ClassificationResult {
  const kind = detectEntryKind(text);
  const temporal = kind === "agenda" ? resolveAgendaTemporal(text) : { scheduledDate: null, scheduledTime: null };
  return {
    kind,
    theme: classifyThemeLocal(text, existingThemes),
    scheduledDate: temporal.scheduledDate,
    scheduledTime: temporal.scheduledTime,
  };
}

function mergeClassification(
  local: ClassificationResult,
  remote: ClassificationResult | null,
): ClassificationResult {
  if (!remote) return local;
  const kind =
    remote.scheduledDate || local.scheduledDate
      ? "agenda"
      : remote.kind === "agenda" || local.kind === "agenda"
        ? "agenda"
        : "note";

  return {
    kind,
    theme: remote.theme || local.theme,
    scheduledDate: remote.scheduledDate ?? local.scheduledDate,
    scheduledTime: remote.scheduledTime ?? local.scheduledTime,
  };
}

async function classifyEntryWithApi(text: string): Promise<ClassificationResult | null> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 120,
      system:
        "Tu classes des pensées pour l'app Settle. Réponds UNIQUEMENT en JSON valide, sans markdown.",
      messages: [
        {
          role: "user",
          content: `Texte : "${text}"

JSON attendu :
{
  "kind": "agenda ou note",
  "theme": "1 à 3 mots — catégorie connue OU nouveau sujet (Podcast, Maison, Cuisine…)",
  "scheduledDate": "YYYY-MM-DD ou null",
  "scheduledTime": "HH:MM ou null"
}

Règles :
- kind "agenda" : tâche concrète, échéance, rappel, course, appel, RDV, obligation
- kind "note" : idée, réflexion, contenu créatif, scénario, paroles, concept sans échéance
- theme : sujet de la bulle Notes — invente un nom court si aucune catégorie ne colle
- scheduledDate / scheduledTime : seulement si kind = agenda`,
        },
      ],
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { content?: { text?: string }[] };
  const raw = data.content?.[0]?.text;
  if (!raw) return null;
  return parseModelJson(raw, text);
}

export async function classifyEntry(
  text: string,
  existingThemes: string[] = [],
): Promise<ClassificationResult> {
  const local = classifyEntryLocal(text, existingThemes);
  try {
    const remote = await classifyEntryWithApi(text);
    const merged = mergeClassification(local, remote);
    if (merged.kind === "note") {
      merged.scheduledDate = null;
      merged.scheduledTime = null;
    }
    if (merged.kind === "agenda" && !merged.scheduledDate) {
      const fallback = resolveAgendaTemporal(text);
      merged.scheduledDate = fallback.scheduledDate;
      merged.scheduledTime = merged.scheduledTime ?? fallback.scheduledTime;
    }
    if (merged.theme === "Pensées" && local.theme !== "Pensées") {
      merged.theme = local.theme;
    }
    return merged;
  } catch {
    return local;
  }
}

export async function classifyAndSave(
  text: string,
  source: "text" | "voice" = "text",
): Promise<Entry[]> {
  const chunks = splitThoughts(text);
  const toSave = chunks.length > 0 ? chunks : [text.trim()];

  const existingThemes = [...new Set((await getAllEntries()).map((e) => e.theme))];
  const entries: Entry[] = [];

  for (const chunk of toSave) {
    if (!chunk.trim()) continue;
    const { kind, theme, scheduledDate, scheduledTime } = await classifyEntry(chunk, existingThemes);
    const displayText = kind === "agenda" ? prepareAgendaText(chunk) : polishThought(chunk);
    if (!displayText) continue;
    if (!existingThemes.includes(theme)) existingThemes.push(theme);

    const recurrence = kind === "agenda" ? parseRecurrence(chunk) : null;
    if (recurrence) {
      const time = recurrence.scheduledTime ?? scheduledTime;
      const batch = recurrence.dates.map((date) =>
        createEntry(displayText, theme, date, time, source),
      );
      await saveEntries(batch);
      entries.push(...batch);
      continue;
    }

    const entry = createEntry(displayText, theme, scheduledDate, scheduledTime, source);
    await saveEntries([entry]);
    entries.push(entry);
  }

  return entries;
}
