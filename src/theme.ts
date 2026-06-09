export const colors = {
  bg: "#0D0D0D",
  bgCard: "#141414",
  bgCardDeep: "#111111",
  bgPast: "#111111",
  bgPastDeep: "#0F0F0F",

  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.6)",
  textTertiary: "rgba(255,255,255,0.25)",
  textGhost: "rgba(255,255,255,0.12)",

  accent: "#002FE6",
  accentMuted: "rgba(0,47,230,0.38)",
  accentBorder: "rgba(0,47,230,0.22)",
  accentSoft: "rgba(0,47,230,0.10)",

  border: "rgba(255,255,255,0.06)",
  borderSubtle: "rgba(255,255,255,0.04)",
  borderPast: "rgba(255,255,255,0.03)",
} as const;

export const fonts = {
  /** Titres d’écran uniquement (settle, Notes, Agenda). */
  title: "Smirnoft",
  /** Tout le texte sauf les titres d’écran. */
  body: "Coolvetica",
} as const;

export const radius = {
  pill: 100,
  card: 20,
  week: 18,
  bubble: 20,
} as const;

export const bubbleThemes: Record<string, { bg: string; accent: string }> = {
  Paperasse: { bg: "#1A1408", accent: "#B8956C" },
  Courses: { bg: "#0A1812", accent: "#6D9A6A" },
  Santé: { bg: "#1A1012", accent: "#C4898E" },
  Temps: { bg: "#0B1228", accent: "#6E92C4" },
  Travail: { bg: "#101418", accent: "#6D8299" },
  Relations: { bg: "#1A120C", accent: "#D49A6E" },
  Scénario: { bg: "#0B1228", accent: "#3B6BFF" },
  "Texte de rap": { bg: "#140D1E", accent: "#A78BFA" },
  Projets: { bg: "#0A1812", accent: "#34D399" },
  Pensées: { bg: "#1A1408", accent: "#E8B84A" },
  Rêves: { bg: "#0A1424", accent: "#5B9FFF" },
  default: { bg: "#12121A", accent: "#3B6BFF" },
};

export const fallbackAccents = ["#F472B6", "#FB923C", "#A3E635", "#22D3EE", "#818CF8", "#E879F9", "#FBBF24"];

function hashThemeName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getBubbleTheme(themeName: string): { bg: string; accent: string } {
  if (bubbleThemes[themeName]) return bubbleThemes[themeName];
  const accent = fallbackAccents[hashThemeName(themeName) % fallbackAccents.length];
  return { bg: "#141414", accent };
}

export const H_PAD = 22;
export const STACK_GAP = 10;
export const ANIM_DURATION = 250;
