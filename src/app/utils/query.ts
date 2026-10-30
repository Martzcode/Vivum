/**
 * Réduit un texte (sélection, verset) à une requête de recherche courte.
 * Les espaces et retours à la ligne sont compactés, et la coupe se fait
 * de préférence sur un espace pour ne pas tronquer un mot.
 */
export function toSearchQuery(text: string, maxLength = 80): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;

  const cut = compact.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > 20 ? cut.slice(0, lastSpace) : cut;
}
