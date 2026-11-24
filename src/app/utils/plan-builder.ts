import type { BookInfo } from '../models/bible.model';

/** Un chapitre précis, indépendant de la version de la Bible. */
export interface ChapterRef {
  bookId: string;
  chapter: number;
}

/** Les lectures d'une journée du plan. */
export interface PlanDay {
  chapters: ChapterRef[];
}

/** Segment lisible d'une journée : « Genèse 1–3 ». */
export interface DaySegment {
  bookId: string;
  from: number;
  to: number;
}

export function chapterKey(ref: ChapterRef): string {
  return `${ref.bookId}:${ref.chapter}`;
}

/** Tous les chapitres des livres demandés, dans l'ordre fourni. */
export function flatten(books: readonly BookInfo[], bookIds: readonly string[]): ChapterRef[] {
  const byId = new Map(books.map(book => [book.id, book]));
  const refs: ChapterRef[] = [];
  for (const id of bookIds) {
    const book = byId.get(id);
    if (!book) continue;
    for (let chapter = 1; chapter <= book.chapters; chapter++) {
      refs.push({ bookId: book.id, chapter });
    }
  }
  return refs;
}

/**
 * Répartit les chapitres sur `days` jours, dans l'ordre, de façon à ce que
 * l'écart entre deux jours ne dépasse jamais un chapitre. Si le nombre de
 * jours dépasse le nombre de chapitres, les derniers jours restent vides :
 * on borne donc `days` pour ne jamais produire de jour sans lecture.
 */
export function splitEven(refs: readonly ChapterRef[], days: number): PlanDay[] {
  const count = Math.max(1, Math.min(Math.floor(days), refs.length));
  const result: PlanDay[] = [];
  for (let i = 0; i < count; i++) {
    const start = Math.floor((i * refs.length) / count);
    const end = Math.floor(((i + 1) * refs.length) / count);
    result.push({ chapters: refs.slice(start, end) });
  }
  return result;
}

/**
 * Plan « en parallèle » : chaque jour combine une part de chaque piste
 * (par exemple Ancien et Nouveau Testament). Une piste plus courte que le
 * plan n'apparaît que certains jours, répartis régulièrement.
 */
export function mergeTracks(tracks: readonly (readonly ChapterRef[])[], days: number): PlanDay[] {
  const result: PlanDay[] = Array.from({ length: days }, () => ({ chapters: [] }));
  for (const track of tracks) {
    for (let i = 0; i < days; i++) {
      const start = Math.floor((i * track.length) / days);
      const end = Math.floor(((i + 1) * track.length) / days);
      result[i].chapters.push(...track.slice(start, end));
    }
  }
  return result;
}

/**
 * Plan « Psaumes et Proverbes » : le jour N lit le Proverbe N et les
 * psaumes N, N+30, N+60… (cinq psaumes par jour environ).
 */
export function psalmsAndProverbs(books: readonly BookInfo[], days = 31): PlanDay[] {
  const psalms = books.find(book => book.id === 'psalms')?.chapters ?? 0;
  const proverbs = books.find(book => book.id === 'proverbs')?.chapters ?? 0;
  const result: PlanDay[] = [];

  for (let day = 1; day <= days; day++) {
    const chapters: ChapterRef[] = [];
    // Les jours 1 à 30 couvrent les 150 psaumes ; le jour 31 n'a que le Proverbe 31.
    if (day <= 30) {
      for (let psalm = day; psalm <= psalms; psalm += 30) {
        chapters.push({ bookId: 'psalms', chapter: psalm });
      }
    }
    if (day <= proverbs) chapters.push({ bookId: 'proverbs', chapter: day });
    result.push({ chapters });
  }

  return result;
}

/** Regroupe les chapitres consécutifs d'un même livre. */
export function summarizeDay(day: PlanDay): DaySegment[] {
  const segments: DaySegment[] = [];
  for (const ref of day.chapters) {
    const last = segments.at(-1);
    if (last && last.bookId === ref.bookId && last.to + 1 === ref.chapter) {
      last.to = ref.chapter;
    } else {
      segments.push({ bookId: ref.bookId, from: ref.chapter, to: ref.chapter });
    }
  }
  return segments;
}
