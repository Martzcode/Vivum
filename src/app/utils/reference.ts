import type { BookInfo, SupportedLocale } from '../models/bible.model';

export interface ParsedReference {
  book: BookInfo;
  chapter?: number;
  verse?: number;
}

/** Minuscules, sans accents ni ponctuation : "1. Mose" devient "1mose". */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const REFERENCE_PATTERN = /^\s*(.*?)\s*(?:(\d+)(?:\s*[:.,]\s*|\s+)(\d+)|(\d+))?\s*$/;

/**
 * Interprète une saisie du type « Jean 3:16 », « 1 jn 2 », « ps 23 ».
 * Retourne les livres correspondants, du plus pertinent au moins pertinent.
 */
export function findReferences(
  input: string,
  books: readonly BookInfo[],
  locale: SupportedLocale,
  limit = 8,
): ParsedReference[] {
  const match = REFERENCE_PATTERN.exec(input);
  if (!match) return [];

  const query = normalizeName(match[1] ?? '');
  if (!query) return [];

  const chapterText = match[2] ?? match[4];
  const verseText = match[3];

  const tiers: BookInfo[][] = [[], [], [], [], []];
  for (const book of books) {
    const tier = matchTier(book, query, locale);
    if (tier !== null) tiers[tier].push(book);
  }

  const seen = new Set<string>();
  const results: ParsedReference[] = [];
  for (const book of tiers.flat()) {
    if (seen.has(book.id)) continue;
    seen.add(book.id);

    const chapter = chapterText ? Number(chapterText) : undefined;
    const validChapter =
      chapter !== undefined && chapter >= 1 && chapter <= book.chapters ? chapter : undefined;
    const verse = verseText && validChapter ? Number(verseText) : undefined;

    results.push({
      book,
      chapter: validChapter,
      verse: verse && verse >= 1 ? verse : undefined,
    });
    if (results.length >= limit) break;
  }
  return results;
}

/**
 * 0 : nom exact (langue courante) ou identifiant
 * 1 : nom exact dans une autre langue
 * 2 : préfixe (langue courante)
 * 3 : préfixe (autre langue)
 * 4 : contient
 */
function matchTier(book: BookInfo, query: string, locale: SupportedLocale): number | null {
  const current = normalizeName(book.name[locale] ?? '');
  const others = Object.entries(book.name)
    .filter(([key]) => key !== locale)
    .map(([, name]) => normalizeName(name));
  const id = normalizeName(book.id);

  if (current === query || id === query) return 0;
  if (others.includes(query)) return 1;
  if (current.startsWith(query) || id.startsWith(query)) return 2;
  if (others.some(name => name.startsWith(query))) return 3;
  if (query.length >= 3 && [current, ...others].some(name => name.includes(query))) return 4;
  return null;
}

export function formatReference(ref: ParsedReference, locale: SupportedLocale): string {
  const name = ref.book.name[locale] ?? ref.book.name['en'] ?? ref.book.id;
  if (!ref.chapter) return name;
  return ref.verse ? `${name} ${ref.chapter}:${ref.verse}` : `${name} ${ref.chapter}`;
}
