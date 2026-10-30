export interface Verse {
  verse: number;
  text: string;
}

export interface Chapter {
  book: string;
  bookId: string;
  chapter: number;
  verses: Verse[];
}

export interface BookInfo {
  id: string;
  name: Record<string, string>;
  testament: 'ot' | 'nt';
  chapters: number;
}

/** Marque-page de verset. La version fait partie de l'identité du favori. */
export interface Favorite {
  id: string;
  version: BibleVersion;
  bookId: string;
  chapter: number;
  verse: number;
  text: string;
  bookName: string;
  timestamp: number;
  note?: string;
  tags?: string[];
}

export type BibleVersion = 'ls1910' | 'kjv' | 'rv1909' | 'luther1912' | 'mg1865';
export type SupportedLocale = 'fr' | 'en' | 'es' | 'de' | 'mg';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['fr', 'en', 'es', 'de', 'mg'];

export const BIBLE_VERSIONS: BibleVersion[] = ['ls1910', 'kjv', 'rv1909', 'luther1912', 'mg1865'];

export const VERSION_MAP: Record<SupportedLocale, BibleVersion> = {
  fr: 'ls1910',
  en: 'kjv',
  es: 'rv1909',
  de: 'luther1912',
  mg: 'mg1865',
};

/** Libellé lisible d'une version, indépendant de la langue de l'interface. */
export const VERSION_LABELS: Record<BibleVersion, string> = {
  ls1910: 'LSG 1910',
  kjv: 'KJV',
  rv1909: 'RV 1909',
  luther1912: 'Luther 1912',
  mg1865: 'MG 1865',
};

/**
 * Résultat de recherche découpé en segments sûrs.
 * Aucun HTML n'est produit ici : le template échappe le contenu.
 */
export interface SearchResult {
  bookId: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  before: string;
  match: string;
  after: string;
}

export interface ReadingPosition {
  version: BibleVersion;
  bookId: string;
  bookName: string;
  chapter: number;
  verse?: number;
  updatedAt: number;
}

export function favoriteId(
  version: BibleVersion,
  bookId: string,
  chapter: number,
  verse: number,
): string {
  return `${version}:${bookId}:${chapter}:${verse}`;
}

/** Convertit une valeur stockée (version ou ancienne locale) en version connue. */
export function toBibleVersion(value: unknown): BibleVersion | null {
  if (typeof value !== 'string') return null;
  if (BIBLE_VERSIONS.includes(value as BibleVersion)) return value as BibleVersion;
  if (SUPPORTED_LOCALES.includes(value as SupportedLocale)) {
    return VERSION_MAP[value as SupportedLocale];
  }
  return null;
}
