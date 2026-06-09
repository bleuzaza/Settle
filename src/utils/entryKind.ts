import { extractScheduledDate, extractScheduledTime } from "./dateParser";
import { normalizeFr } from "./normalize";
import { hasRecurrence } from "./recurrence";
import { needsAttentionToday } from "./temporal";

function hasTemporalMention(text: string, reference = new Date()): boolean {
  return (
    extractScheduledDate(text, reference) !== null ||
    extractScheduledTime(text) !== null ||
    needsAttentionToday(text)
  );
}

const NOTE_SIGNALS =
  /\b(id[eé]e|idee|scenario|scénario|histoire|personnage|dialogue|synopsis|reve|rêve|songe|cauchemar|couplet|refrain|paroles?|flow|barre|instru|beat|freestyle|reflexion|réflexion|inspiration|concept|je pense|je me demande|ca me fait penser|ça me fait penser|memoire|mémoire|souvenir|texte|poeme|poème|chanson|melodie|mélodie)\b/;

const TASK_VERBS =
  /\b(appeler|rappeler|contacter|acheter|payer|envoyer|finir|terminer|faire|préparer|preparer|réserver|reserver|booker|commander|passer|retirer|déposer|deposer|remplir|signer|envoyer|poster|imprimer|scanner|télécharger|telecharger|installer|réparer|reparer|nettoyer|ranger|organiser|valider|soumettre|relancer|livrer|rendre|ramener|emmener|prendre|aller|visiter|consulter|voir)\b/;

const TASK_NOUNS =
  /\b(rdv|rendez[-\s]?vous|courses|course|facture|devis|dossier|formulaire|déclaration|declaration|paiement|achat|livrable|deadline|tache|tâche|todo|to-do)\b/;

const OBLIGATION =
  /\b(je dois|il faut|j'ai a|j'ai à|faudrait|n'oublie pas|penser a|penser à|asap|urgent)\b/;

/** Pensée, idée créative, réflexion — pas un item agenda. */
export function isNoteLike(text: string): boolean {
  const normalized = normalizeFr(text);
  if (!NOTE_SIGNALS.test(normalized)) return false;
  if (hasTemporalMention(text)) return false;
  if (OBLIGATION.test(normalized) && TASK_VERBS.test(normalized)) return false;
  return true;
}

/** Action concrète à faire — candidate agenda si planifiée ou urgente. */
export function isTaskLike(text: string): boolean {
  const normalized = normalizeFr(text);
  if (isNoteLike(text)) return false;
  return (
    OBLIGATION.test(normalized) ||
    TASK_VERBS.test(normalized) ||
    TASK_NOUNS.test(normalized)
  );
}

/**
 * Agenda = échéance / urgence / tâche concrète.
 * Notes = idées, réflexions, contenus créatifs sans échéance.
 */
export function detectEntryKind(text: string): "agenda" | "note" {
  if (hasRecurrence(text)) return "agenda";
  if (hasTemporalMention(text)) return "agenda";
  if (isNoteLike(text)) return "note";
  if (isTaskLike(text)) return "agenda";
  return "note";
}
