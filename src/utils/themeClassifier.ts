import { bubbleThemes } from "../theme";
import { DEFAULT_THEME, inferDynamicTheme } from "./themeInference";
import { normalizeFr } from "./normalize";

type ThemeCategory = {
  theme: string;
  hints: string[];
  boost?: (normalized: string) => number;
};

/** Catégories Décharge Mentale + thèmes créatifs Settle. */
const CATEGORIES: ThemeCategory[] = [
  {
    theme: "Paperasse",
    hints: [
      "caf",
      "cpam",
      "impot",
      "impots",
      "urssaf",
      "banque",
      "assurance",
      "mutuelle",
      "declaration",
      "dossier",
      "formulaire",
      "france travail",
      "pole emploi",
      "pôle emploi",
      "carte grise",
      "permis",
      "passeport",
    ],
    boost: (n) => (/\bcaf\b/.test(n) ? 5 : 0),
  },
  {
    theme: "Courses",
    hints: [
      "acheter",
      "courses",
      "supermarche",
      "super marché",
      "carrefour",
      "leclerc",
      "lidl",
      "aldi",
      "riz",
      "pain",
      "lait",
      "drive",
    ],
  },
  {
    theme: "Santé",
    hints: [
      "dentiste",
      "medecin",
      "médecin",
      "docteur",
      "hopital",
      "hôpital",
      "pharmacie",
      "kine",
      "kiné",
      "osteo",
      "ostéo",
      "ophtalmo",
      "vaccin",
      "ordonnance",
    ],
  },
  {
    theme: "Temps",
    hints: [
      "rendez-vous",
      "rendez vous",
      "rdv",
      "demain",
      "lundi",
      "mardi",
      "mercredi",
      "jeudi",
      "vendredi",
      "samedi",
      "dimanche",
      "appeler",
      "rappeler",
    ],
  },
  {
    theme: "Travail",
    hints: [
      "client",
      "mail",
      "email",
      "slack",
      "notion",
      "deadline",
      "reunion",
      "réunion",
      "facture",
      "devis",
      "contrat",
      "brief",
      "livrable",
    ],
  },
  {
    theme: "Relations",
    hints: [
      "maman",
      "papa",
      "famille",
      "ami",
      "amie",
      "copain",
      "copine",
      "enfant",
      "anniversaire",
      "cadeau",
      "message",
    ],
  },
  {
    theme: "Scénario",
    hints: [
      "scenario",
      "scénario",
      "film",
      "cinema",
      "cinéma",
      "histoire",
      "personnage",
      "scene",
      "scène",
      "dialogue",
      "synopsis",
      "clip",
      "casting",
      "serie",
      "série",
    ],
  },
  {
    theme: "Texte de rap",
    hints: [
      "rap",
      "couplet",
      "refrain",
      "flow",
      "barre",
      "bars",
      "instru",
      "beat",
      "boom bap",
      "sample",
      "cover",
      "chanson",
      "melodie",
      "mélodie",
      "rime",
      "mc",
      "freestyle",
      "prod",
    ],
  },
  {
    theme: "Projets",
    hints: [
      "projet",
      "lancer",
      "business",
      "startup",
      "app",
      "application",
      "objectif",
      "plan",
      "strategie",
      "stratégie",
      "offre",
      "marque",
      "idee",
      "idée",
      "concept",
      "design",
    ],
  },
  {
    theme: "Rêves",
    hints: ["reve", "rêve", "songé", "songe", "cauchemar", "insomnie", "onirique"],
  },
  { theme: DEFAULT_THEME, hints: [] },
];

function scoreTheme(normalized: string, hints: string[]): number {
  let score = 0;
  for (const hint of hints) {
    const needle = normalizeFr(hint);
    if (!needle) continue;
    if (normalized.includes(needle)) {
      score += needle.length > 5 ? 3 : 2;
    }
  }
  return score;
}

/** Classification locale — catégories fixes puis inférence de nouveau sujet. */
export function classifyThemeLocal(text: string, existingThemes: string[] = []): string {
  const normalized = normalizeFr(text);
  let best = DEFAULT_THEME;
  let bestScore = 0;

  for (const category of CATEGORIES) {
    if (category.theme === DEFAULT_THEME) continue;
    let score = scoreTheme(normalized, category.hints);
    if (category.boost) score += category.boost(normalized);
    if (score > bestScore) {
      bestScore = score;
      best = category.theme;
    }
  }

  if (bestScore > 0) return best;

  const inferred = inferDynamicTheme(text, existingThemes);
  return inferred ?? DEFAULT_THEME;
}

function titleCaseTheme(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return DEFAULT_THEME;
  return trimmed
    .split(" ")
    .map((word) => word.charAt(0).toLocaleUpperCase("fr-FR") + word.slice(1).toLocaleLowerCase("fr-FR"))
    .join(" ");
}

export function normalizeTheme(value: string | null | undefined): string {
  if (!value?.trim()) return DEFAULT_THEME;
  const cleaned = titleCaseTheme(value);
  const normalized = normalizeFr(cleaned);

  for (const category of CATEGORIES) {
    if (normalizeFr(category.theme) === normalized) return category.theme;
  }
  for (const theme of Object.keys(bubbleThemes)) {
    if (normalizeFr(theme) === normalized) return theme;
  }

  return cleaned;
}
