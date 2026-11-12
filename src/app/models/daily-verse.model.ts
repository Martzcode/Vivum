import type { Chapter, Verse } from './bible.model';

/**
 * Une entrée du pool « verset du jour ».
 *
 * Le pool est embarqué avec l'application (`public/data/daily-verses.json`) :
 * la sélection ne dépend donc d'aucun appel réseau. Les passages sont des
 * plages de versets (une seule référence référencée par `bookId` + chapitre
 * + bornes) pour éviter les textes coupés en plein milieu d'une phrase.
 */
export interface DailyVerseEntry {
  id: string;
  bookId: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  theme: string;
}

export interface DailyVersePool {
  schema: number;
  source?: string;
  readings: DailyVerseEntry[];
}

export interface DailyReading extends DailyVerseEntry {
  bookName: string;
  verses: Verse[];
  /** Texte complet du passage, versets concaténés. */
  text: string;
  /** Référence localisée, par exemple « Jean 3:16-17 ». */
  reference: string;
}

export type DailyVerseState =
  | { status: 'loading' }
  | { status: 'ready'; reading: DailyReading }
  | { status: 'error'; messageKey: string };

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Clé de date locale (`AAAA-MM-JJ`), indépendante du fuseau UTC. */
export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Numéro de jour (jours écoulés depuis l'époque Unix) calculé à partir des
 * composantes locales de la date. Deux utilisateurs du même fuseau voient
 * donc le même verset, et la sélection change à minuit local.
 */
export function localDayNumber(dateKey: string): number {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) throw new Error(`Invalid date key: ${dateKey}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/**
 * Hash FNV-1a 32 bits : stable, rapide, et suffisant pour décaler la
 * séquence selon la composition du pool (pas de dépendance à une API).
 */
export function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

/**
 * Pas de parcours premier avec la taille du pool (dérivé du nombre d'or).
 * Un pas premier avec `count` garantit qu'en incrémentant le jour on
 * parcourt toutes les entrées avant de répéter : pas de doublon avant
 * `count` jours, et ce sans stocker d'historique.
 */
export function coprimeStride(count: number): number {
  if (count <= 1) return 1;
  let stride = Math.max(1, Math.floor(count * 0.618_033_988_749_895));
  while (stride > 1 && gcd(stride, count) !== 1) stride--;
  return stride;
}

/**
 * Séquence des passages à partir du jour demandé, dans l'ordre où ils
 * seraient affichés les jours suivants. Sert aussi de repli si un passage
 * est absent de la version courante.
 */
export function dailyEntrySequence(
  entries: DailyVerseEntry[],
  dateKey: string,
  limit = 1,
): DailyVerseEntry[] {
  const count = entries.length;
  if (count === 0 || limit <= 0) return [];

  const stride = coprimeStride(count);
  // Décalage stable : deux pools différents ne commencent pas par le même
  // passage, et l'ordre reste reproductible pour une même version du pool.
  const offset = stableHash(entries.map(entry => entry.id).join('|')) % count;
  const start = (localDayNumber(dateKey) * stride + offset) % count;

  const sequence: DailyVerseEntry[] = [];
  const size = Math.min(limit, count);
  for (let index = 0; index < size; index++) {
    sequence.push(entries[(start + index * stride) % count]);
  }
  return sequence;
}

/** Sélection principale du jour (premier passage de la séquence). */
export function pickDailyEntry(
  entries: DailyVerseEntry[],
  dateKey: string,
): DailyVerseEntry | null {
  return dailyEntrySequence(entries, dateKey, 1)[0] ?? null;
}

/**
 * Versets du passage effectivement présents dans le chapitre chargé.
 * Retourne un tableau vide si la plage n'existe pas dans cette version :
 * l'appelant peut alors basculer sur un autre passage plutôt que d'afficher
 * un texte tronqué.
 */
export function sliceVerses(chapter: Chapter, entry: DailyVerseEntry): Verse[] {
  return chapter.verses.filter(
    verse => verse.verse >= entry.startVerse && verse.verse <= entry.endVerse,
  );
}

/** Référence localisée : « Jean 3:16-17 » ou « Psaumes 23:1-6 ». */
export function formatReference(bookName: string, entry: DailyVerseEntry): string {
  const range =
    entry.startVerse === entry.endVerse
      ? String(entry.startVerse)
      : `${entry.startVerse}-${entry.endVerse}`;
  return `${bookName} ${entry.chapter}:${range}`;
}

/** Valide/normalise le pool embarqué. Lève une erreur si aucun passage valide. */
export function parseDailyVersePool(value: unknown): DailyVersePool {
  if (!value || typeof value !== 'object') throw new Error('Invalid daily verse pool');

  const input = value as Record<string, unknown>;
  const rawReadings = input['readings'];
  if (!Array.isArray(rawReadings)) throw new Error('Invalid daily verse pool');

  const readings = rawReadings
    .map(item => toDailyEntry(item))
    .filter((entry): entry is DailyVerseEntry => entry !== null);

  if (readings.length === 0) throw new Error('Empty daily verse pool');

  return {
    schema: typeof input['schema'] === 'number' ? input['schema'] : 1,
    ...(typeof input['source'] === 'string' ? { source: input['source'] } : {}),
    readings,
  };
}

function toDailyEntry(value: unknown): DailyVerseEntry | null {
  if (!value || typeof value !== 'object') return null;

  const input = value as Record<string, unknown>;
  const id = input['id'];
  const bookId = input['bookId'];
  const theme = input['theme'];
  const chapter = input['chapter'];
  const startVerse = input['startVerse'];
  const endVerse = input['endVerse'] ?? startVerse;

  if (typeof id !== 'string' || !id) return null;
  if (typeof bookId !== 'string' || !bookId) return null;
  if (typeof theme !== 'string' || !theme) return null;
  if (!Number.isInteger(chapter) || (chapter as number) < 1) return null;
  if (!Number.isInteger(startVerse) || (startVerse as number) < 1) return null;
  if (!Number.isInteger(endVerse) || (endVerse as number) < (startVerse as number)) return null;

  return {
    id,
    bookId,
    theme,
    chapter: chapter as number,
    startVerse: startVerse as number,
    endVerse: endVerse as number,
  };
}
