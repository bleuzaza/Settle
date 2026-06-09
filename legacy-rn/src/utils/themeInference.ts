import { normalizeFr } from "./normalize";
import { capitalizeFr } from "./textProcessing";

const DEFAULT_THEME = "Pensées";

const STOP_WORDS = new Set(
  [
    "le", "la", "les", "un", "une", "des", "du", "de", "d", "a", "à", "au", "aux",
    "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses", "notre", "nos", "votre", "vos",
    "ce", "cette", "ces", "et", "ou", "pour", "par", "sur", "avec", "sans", "dans", "en",
    "que", "qui", "quoi", "dont", "plus", "tres", "très", "bien", "tout", "tous", "toute",
    "faire", "faut", "dois", "peut", "comme", "vers", "chez", "entre", "avant", "apres", "après",
    "demain", "aujourdhui", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
    "idee", "idée", "pensee", "pensée", "nouveau", "nouvelle", "petit", "petite", "grand", "grande",
  ].map(normalizeFr),
);

/** Mots-clés → nom de bulle court. */
const DOMAIN_THEMES: [RegExp, string][] = [
  [/\b(podcasts?|épisode|episode|interview)\b/, "Podcast"],
  [/\b(youtube|vid[eé]os?|shorts?|tournage)\b/, "YouTube"],
  [/\b(albums?|musiques?|sons?|tracks?|prods?)\b/, "Musique"],
  [/\b(films?|séries?|series?|cin[eé]mas?|scénarios?|scenarios?)\b/, "Cinéma"],
  [/\b(livres?|romans?|écritures?|ecritures?)\b/, "Écriture"],
  [/\b(voyages?|vacances?|trajets?|billets?)\b/, "Voyage"],
  [/\b(recettes?|cuisines?|repas)\b/, "Cuisine"],
  [/\b(sports?|muscu|fitness|course à pied)\b/, "Sport"],
  [/\b(appartements?|maisons?|décos?|decos?|bricolages?|rénovations?)\b/, "Maison"],
  [/\b(voitures?|garages?|permis)\b/, "Auto"],
  [/\b(chats?|chiens?|animaux?)\b/, "Animaux"],
  [/\b(mariages?|fêtes?|fetes?|anniversaires?)\b/, "Événements"],
  [/\b(écoles?|ecoles?|cours|examens?|thèses?|theses?)\b/, "Études"],
  [/\b(startups?|business|marques?|marketing)\b/, "Business"],
  [/\b(games?|jeux?|gaming)\b/, "Jeux"],
];

type ThemePattern = [RegExp, (match: RegExpMatchArray) => string | null];

const THEME_PATTERNS: ThemePattern[] = [
  [/id[eé]e\s+(?:de|pour)\s+(?:mon\s+|ma\s+|mes\s+|un\s+|une\s+)?(.+)/i, (m) => extractThemeLabel(m[1])],
  [/projet\s+(?:de|pour|sur)?\s*(?:mon\s+|ma\s+|mes\s+|un\s+|une\s+)?(.+)/i, (m) => extractThemeLabel(m[1])],
  [/pour\s+(?:mon|ma|mes)\s+(.+)/i, (m) => extractThemeLabel(m[1])],
  [/(?:couplet|refrain|paroles?|texte)\s+(?:de|sur|pour)\s+(.+)/i, () => "Texte de rap"],
  [/(?:histoire|scénario|scenario)\s+(?:de|sur|pour)\s+(.+)/i, (m) => extractThemeLabel(m[1]) || "Scénario"],
];

function titleCaseWords(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toLocaleUpperCase("fr-FR") + w.slice(1).toLocaleLowerCase("fr-FR"))
    .join(" ");
}

function extractThemeLabel(raw: string): string | null {
  const cleaned = raw
    .replace(/\b(épisode|episode|saison|chapitre|partie|numéro|numero|n°|#)\s*\d+\b/gi, "")
    .replace(/[,.:;!?–—-].*$/, "")
    .trim();
  if (!cleaned) return null;

  const domain = domainThemeFromText(cleaned);
  if (domain) return domain;

  const words = cleaned
    .split(/\s+/)
    .map((w) => w.replace(/^['"]|['"]$/g, ""))
    .filter((w) => w.length > 2 && !STOP_WORDS.has(normalizeFr(w)));

  if (words.length === 0) return null;
  if (words.length === 1) return titleCaseWords(words[0]);
  return titleCaseWords(words.slice(0, 2).join(" "));
}

function domainThemeFromText(text: string): string | null {
  const normalized = normalizeFr(text);
  for (const [pattern, theme] of DOMAIN_THEMES) {
    if (pattern.test(normalized)) return theme;
  }
  return null;
}

function matchExistingTheme(candidate: string, existingThemes: string[]): string | null {
  const normalized = normalizeFr(candidate);
  if (!normalized) return null;

  for (const theme of existingThemes) {
    const existing = normalizeFr(theme);
    if (existing === normalized) return theme;
  }
  for (const theme of existingThemes) {
    const existing = normalizeFr(theme);
    if (existing.includes(normalized) || normalized.includes(existing)) return theme;
  }
  return null;
}

/** Infère un nouveau sujet de bulle quand aucune catégorie fixe ne matche. */
export function inferDynamicTheme(text: string, existingThemes: string[] = []): string | null {
  const normalized = normalizeFr(text);

  const domain = domainThemeFromText(normalized);
  if (domain) {
    return matchExistingTheme(domain, existingThemes) ?? domain;
  }

  for (const [pattern, pick] of THEME_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    const candidate = pick(match);
    if (!candidate) continue;
    return matchExistingTheme(candidate, existingThemes) ?? candidate;
  }

  const words = normalized
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9àâçéèêëîïôùûüÿœæ-]/gi, ""))
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
  for (const [word] of ranked.slice(0, 3)) {
    const candidate = capitalizeFr(word);
    const existing = matchExistingTheme(candidate, existingThemes);
    if (existing) return existing;
    if (candidate.length >= 4) return candidate;
  }

  return null;
}

export { DEFAULT_THEME };
