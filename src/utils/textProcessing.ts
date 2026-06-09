/**
 * Port de l'algo Décharge Mentale — découpage, nettoyage des préfixes, polish.
 */

const THOUGHT_PREFIXES = [
  /^il\s+faut\s+que\s+je\s+/i,
  /^il\s+faut\s+/i,
  /^je\s+dois\s+/i,
  /^j'ai\s+à\s+/i,
  /^j'ai\s+a\s+/i,
  /^penser\s+à\s+/i,
  /^penser\s+a\s+/i,
  /^n'oublie\s+pas\s+de\s+/i,
  /^faudrait\s+/i,
  /^puis\s+/i,
  /^ensuite\s+/i,
  /^et\s+/i,
];

function stripOuterPunctuation(value: string): string {
  return value.trim().replace(/^["'\s,.;:–—-]+/g, "").replace(/["'\s,.;:–—-]+$/g, "").trim();
}

/** Retire « je dois », « il faut », « penser à »… */
export function stripThoughtPrefix(value: string): string {
  let text = stripOuterPunctuation(value);
  let previous = "";
  while (previous !== text) {
    previous = text;
    for (const prefix of THOUGHT_PREFIXES) {
      text = text.replace(prefix, "").trim();
    }
  }
  return text;
}

export function capitalizeFr(value: string): string {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text ? text.charAt(0).toLocaleUpperCase("fr-FR") + text.slice(1) : text;
}

/** Découpe un dépôt en plusieurs pensées (lignes, virgules, « puis »…). */
export function splitThoughts(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => line.split(/\s*(?:,|;| puis | ensuite | et puis |\|\||\/\/)\s*/i))
    .map(stripThoughtPrefix)
    .filter(Boolean);
}

type PolishRule = [RegExp, (match: RegExpMatchArray) => string];

const POLISH_RULES: PolishRule[] = [
  [/^m['']?actualiser\s+(?:sur\s+)?(.+)$/i, (m) => `Actualisation ${capitalizeFr(m[1])}`],
  [/^appeler\s+(.+)$/i, (m) => `Appel : ${capitalizeFr(m[1])}`],
  [/^rappeler\s+(.+)$/i, (m) => `Rappel : ${capitalizeFr(m[1])}`],
  [/^contacter\s+(.+)$/i, (m) => `Contact : ${capitalizeFr(m[1])}`],
  [/^acheter\s+(.+)$/i, (m) => `Achat : ${capitalizeFr(m[1])}`],
  [/^payer\s+(.+)$/i, (m) => `Paiement : ${capitalizeFr(m[1])}`],
  [
    /^prendre\s+(?:un\s+)?rendez[-\s]?vous\s+(?:avec|chez)?\s*(.+)$/i,
    (m) => `Rendez-vous : ${capitalizeFr(m[1])}`,
  ],
  [/^id[eé]e\s+(?:de\s+)?(.+)$/i, (m) => `Idée : ${capitalizeFr(m[1])}`],
];

const TEMPORAL_STRIP_PATTERNS: RegExp[] = [
  /\b(?:le\s+)?(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?:\s+prochain)?\b/gi,
  /\b(?:aujourd['']?hui|aujourd hui)\b/gi,
  /\bmaintenant\b/gi,
  /\b(?:ce\s+)?(?:soir|matin|midi)\b/gi,
  /\b(?:cet|cette)\s+apres[- ]?midi\b/gi,
  /\bapres[- ]?midi\b/gi,
  /\bapres[- ]?demain\b/gi,
  /\bdemain\b/gi,
  /\bdans\s+\d{1,2}\s+jours?\b/gi,
  /\bce\s+week[- ]?end\b/gi,
  /\b\d{1,2}\s+(?:janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\b/gi,
  /\b\d{1,2}[/.-]\d{1,2}(?:[/.-](?:20)?\d{2,4})?\b/g,
  /\b20\d{2}-\d{2}-\d{2}\b/g,
  /\b(?:a|à)\s*(?:[01]?\d|2[0-3])\s*(?:h|:)\s*(?:[0-5]\d)?\b/gi,
  /\b(?:[01]?\d|2[0-3])\s*h(?:\s*[0-5]\d)?\b/gi,
  /\b(?:urgent|urgence|asap|immediatement|tout de suite)\b/gi,
  /\b(?:tous les jours|chaque jour|quotidien|quotidiennement|tous les soirs|tous les matins)\b/gi,
  /\btous les \d+\s+jours?\b/gi,
  /\b(?:chaque|tous les|toutes les)\s+(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)s?\b/gi,
  /\b(?:le|les)\s+(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)s?\b/gi,
  /\b(?:un|une|1)\s+(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)s?\s+sur\s+(?:deux|2|\d+)\b/gi,
  /\b(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)s?\s+sur\s+(?:deux|2)\b/gi,
  /\btous les deux\s+(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)s?\b/gi,
  /\bune fois sur (?:deux|2)\b/gi,
  /\b(?:chaque|tous les|toutes les)\s+week[- ]?ends?\b/gi,
  /\b(?:pendant|sur|durant)\s+(?:\d+|une?|un)\s+(?:semaines?|jours?|mois)\b/gi,
];

function normalizeEntities(text: string): string {
  return text
    .replace(/\brendez\s*vous\b/gi, "rendez-vous")
    .replace(/\bfrance\s+travail\b/gi, "France Travail")
    .replace(/\bpole\s+emploi\b/gi, "Pôle emploi")
    .replace(/\bpôle\s+emploi\b/gi, "Pôle emploi")
    .replace(/\bla\s+caf\b/gi, "la CAF")
    .replace(/\burssaf\b/gi, "URSSAF")
    .replace(/\bcpam\b/gi, "CPAM")
    .replace(/\s+/g, " ")
    .trim();
}

/** Retire dates, heures et marqueurs temporels du libellé agenda. */
export function stripTemporalMarkers(raw: string): string {
  let text = raw;
  for (const pattern of TEMPORAL_STRIP_PATTERNS) {
    text = text.replace(pattern, " ");
  }
  return text
    .replace(/\s*[,;–—-]\s*/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^(?:a|à|le|la|les|de|du|des|pour|vers)\s+/i, "")
    .replace(/\s+(?:a|à|le|la|les|de|du|des|pour|vers)$/i, "")
    .trim();
}

/**
 * Libellé court pour l'agenda — sans date/heure, sans reformulation « Appel : ».
 * Ex. « appeler la caf demain à 17h » → « Appeler la caf »
 */
export function prepareAgendaText(raw: string): string {
  const text = stripTemporalMarkers(normalizeEntities(stripThoughtPrefix(raw)));
  return capitalizeFr(text);
}

/** Normalise entités + reformule les tâches courantes. */
export function polishThought(raw: string): string {
  let text = normalizeEntities(stripThoughtPrefix(raw));

  for (const [pattern, format] of POLISH_RULES) {
    const match = text.match(pattern);
    if (match) {
      text = format(match);
      break;
    }
  }

  return capitalizeFr(text);
}
