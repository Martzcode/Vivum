import type { BookInfo } from './bible.model';
import type { PlanDay } from '../utils/plan-builder';
import { flatten, mergeTracks, psalmsAndProverbs, splitEven } from '../utils/plan-builder';

export const CUSTOM_PLAN_ID = 'custom';

export interface PlanDefinition {
  id: string;
  /** Clés de traduction : `plans.catalog.<id>.title` / `.description`. */
  days: number;
  build(books: readonly BookInfo[]): PlanDay[];
}

function ids(books: readonly BookInfo[], testament: 'ot' | 'nt'): string[] {
  return books.filter(book => book.testament === testament).map(book => book.id);
}

/** Livres du Nouveau Testament entre deux positions (0 = Matthieu). */
function newTestament(books: readonly BookInfo[], from: number, to: number): string[] {
  return ids(books, 'nt').slice(from, to);
}

/**
 * Plans proposés. Ils sont calculés à partir du manifest (jamais copiés en
 * dur), donc la progression ne dépend que des identifiants de chapitres :
 * corriger un plan ne casse pas celle des lecteurs.
 */
export const PLAN_CATALOG: readonly PlanDefinition[] = [
  {
    id: 'bible-1-year',
    days: 365,
    build: books =>
      splitEven(flatten(books, books.map(book => book.id)), 365),
  },
  {
    id: 'ot-nt-1-year',
    days: 365,
    build: books =>
      mergeTracks(
        [flatten(books, ids(books, 'ot')), flatten(books, ids(books, 'nt'))],
        365,
      ),
  },
  {
    id: 'nt-90',
    days: 90,
    build: books => splitEven(flatten(books, ids(books, 'nt')), 90),
  },
  {
    id: 'gospels-30',
    days: 30,
    build: books => splitEven(flatten(books, newTestament(books, 0, 4)), 30),
  },
  {
    id: 'epistles-40',
    // Des Romains à Jude : tout le Nouveau Testament sauf Évangiles, Actes et Apocalypse.
    days: 40,
    build: books => splitEven(flatten(books, newTestament(books, 5, 26)), 40),
  },
  {
    id: 'psalms-proverbs-31',
    days: 31,
    build: books => psalmsAndProverbs(books, 31),
  },
];

/** Plan personnalisé : un livre réparti sur un nombre de jours choisi. */
export interface CustomPlanSpec {
  bookId: string;
  days: number;
}

export function buildCustomPlan(books: readonly BookInfo[], spec: CustomPlanSpec): PlanDay[] {
  return splitEven(flatten(books, [spec.bookId]), spec.days);
}
