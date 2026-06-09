/** Minuscules + sans accents pour matching de mots-clés. */
export function normalizeFr(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
