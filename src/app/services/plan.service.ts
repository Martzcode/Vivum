import { Injectable, computed, inject, signal } from '@angular/core';
import type { BookInfo } from '../models/bible.model';
import type { CustomPlanSpec } from '../models/plan.model';
import { CUSTOM_PLAN_ID, PLAN_CATALOG, buildCustomPlan } from '../models/plan.model';
import type { ChapterRef, PlanDay } from '../utils/plan-builder';
import { chapterKey } from '../utils/plan-builder';
import { BibleService } from './bible.service';

const STORAGE_KEY = 'vivum-reading-plans';

/** Progression d'un plan : seuls les chapitres lus sont mémorisés. */
interface PlanProgress {
  startedAt: number;
  read: string[];
}

interface PlanState {
  activePlanId: string | null;
  custom: CustomPlanSpec | null;
  progress: Record<string, PlanProgress>;
}

/** Vue d'un plan pour le catalogue. */
export interface PlanSummary {
  id: string;
  custom: CustomPlanSpec | null;
  totalDays: number;
  doneDays: number;
  totalChapters: number;
  readChapters: number;
  percent: number;
  started: boolean;
  active: boolean;
}

/** Détail du plan actif. */
export interface ActivePlan extends PlanSummary {
  days: PlanDay[];
  /** Index (0-based) du premier jour non terminé, ou null si le plan est fini. */
  currentDayIndex: number | null;
  /** Prochain chapitre non lu du plan, dans l'ordre. */
  next: ChapterRef | null;
}

/**
 * Plans de lecture sans calendrier (mode « rattrapage ») : le jour courant
 * est le premier jour non terminé, il n'y a jamais de retard à rattraper.
 * La progression de chaque plan est conservée quand on change de plan.
 */
@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly bible = inject(BibleService);

  private readonly _state = signal<PlanState>(readState());
  private readonly _books = signal<BookInfo[]>([]);

  readonly books = this._books.asReadonly();
  readonly activePlanId = computed(() => this._state().activePlanId);
  readonly custom = computed(() => this._state().custom);

  /** Résolue quand le manifest est chargé (utile pour les tests). */
  readonly ready: Promise<void>;

  /** Jours de chaque plan, recalculés seulement si le manifest ou le plan perso change. */
  private readonly built = computed(() => {
    const books = this._books();
    const map = new Map<string, PlanDay[]>();
    if (books.length === 0) return map;

    for (const definition of PLAN_CATALOG) {
      map.set(definition.id, definition.build(books));
    }
    const custom = this._state().custom;
    if (custom) map.set(CUSTOM_PLAN_ID, buildCustomPlan(books, custom));
    return map;
  });

  /** Catalogue : les plans prédéfinis, puis le plan personnalisé s'il existe. */
  readonly plans = computed<PlanSummary[]>(() => {
    const ids = PLAN_CATALOG.map(definition => definition.id);
    if (this._state().custom) ids.push(CUSTOM_PLAN_ID);
    return ids.map(id => this.summarize(id));
  });

  readonly active = computed<ActivePlan | null>(() => {
    const id = this._state().activePlanId;
    const days = id ? this.built().get(id) : undefined;
    if (!id || !days) return null;

    const read = readSet(this._state(), id);
    const currentDayIndex = days.findIndex(day => !isDayDone(day, read));
    const current = currentDayIndex === -1 ? null : currentDayIndex;
    const next =
      current === null
        ? null
        : (days[current].chapters.find(ref => !read.has(chapterKey(ref))) ?? null);

    return { ...this.summarize(id), days, currentDayIndex: current, next };
  });

  /** Clés des chapitres du plan actif, pour savoir si un chapitre en fait partie. */
  private readonly activeKeys = computed(() => {
    const active = this.active();
    const keys = new Set<string>();
    for (const day of active?.days ?? []) {
      for (const ref of day.chapters) keys.add(chapterKey(ref));
    }
    return keys;
  });

  private readonly activeRead = computed(() => {
    const id = this._state().activePlanId;
    return id ? readSet(this._state(), id) : new Set<string>();
  });

  constructor() {
    this.ready = this.bible
      .getBooks()
      .then(books => {
        this._books.set(books);
      })
      .catch(error => {
        console.error('Unable to load books for reading plans', error);
      });
  }

  isInActivePlan(ref: ChapterRef): boolean {
    return this.activeKeys().has(chapterKey(ref));
  }

  isRead(ref: ChapterRef): boolean {
    return this.activeRead().has(chapterKey(ref));
  }

  /** Jours (0-based) d'un plan, vide tant que le manifest n'est pas chargé. */
  daysOf(planId: string): PlanDay[] {
    return this.built().get(planId) ?? [];
  }

  isDayDone(planId: string, index: number): boolean {
    const day = this.daysOf(planId)[index];
    return !!day && isDayDone(day, readSet(this._state(), planId));
  }

  /** Démarre ou reprend un plan ; la progression des autres plans est conservée. */
  start(planId: string): void {
    if (!this.built().has(planId)) return;
    this.update(state => ({
      ...state,
      activePlanId: planId,
      progress: state.progress[planId]
        ? state.progress
        : { ...state.progress, [planId]: { startedAt: Date.now(), read: [] } },
    }));
  }

  /** Met le plan de côté sans rien effacer. */
  stop(): void {
    this.update(state => ({ ...state, activePlanId: null }));
  }

  /** Efface la progression d'un plan (le plan reste actif s'il l'était). */
  reset(planId: string): void {
    this.update(state => {
      const { [planId]: _removed, ...rest } = state.progress;
      return {
        ...state,
        progress:
          state.activePlanId === planId
            ? { ...rest, [planId]: { startedAt: Date.now(), read: [] } }
            : rest,
      };
    });
  }

  /** Coche un chapitre s'il fait partie du plan actif. Renvoie true si quelque chose a changé. */
  markChapter(ref: ChapterRef): boolean {
    const id = this._state().activePlanId;
    if (!id || !this.isInActivePlan(ref) || this.isRead(ref)) return false;
    this.update(state => withRead(state, id, [chapterKey(ref)], true));
    return true;
  }

  unmarkChapter(ref: ChapterRef): void {
    const id = this._state().activePlanId;
    if (!id || !this.isRead(ref)) return;
    this.update(state => withRead(state, id, [chapterKey(ref)], false));
  }

  /** Coche ou décoche tous les chapitres d'un jour du plan actif. */
  setDayDone(index: number, done: boolean): void {
    const id = this._state().activePlanId;
    const day = id ? this.built().get(id)?.[index] : undefined;
    if (!id || !day) return;
    this.update(state => withRead(state, id, day.chapters.map(chapterKey), done));
  }

  /**
   * Crée (ou remplace) le plan personnalisé et le démarre. Remplacer le plan
   * perso repart de zéro, car ses chapitres ne sont plus les mêmes.
   */
  createCustom(bookId: string, days: number): boolean {
    const book = this._books().find(item => item.id === bookId);
    if (!book || !Number.isInteger(days) || days < 1) return false;

    const spec: CustomPlanSpec = { bookId, days: Math.min(days, book.chapters) };
    this.update(state => ({
      activePlanId: CUSTOM_PLAN_ID,
      custom: spec,
      progress: {
        ...state.progress,
        [CUSTOM_PLAN_ID]: { startedAt: Date.now(), read: [] },
      },
    }));
    return true;
  }

  private summarize(id: string): PlanSummary {
    const state = this._state();
    const days = this.built().get(id) ?? [];
    const read = readSet(state, id);
    const totalChapters = days.reduce((sum, day) => sum + day.chapters.length, 0);
    const readChapters = days.reduce(
      (sum, day) => sum + day.chapters.filter(ref => read.has(chapterKey(ref))).length,
      0,
    );

    return {
      id,
      custom: id === CUSTOM_PLAN_ID ? state.custom : null,
      totalDays: days.length,
      doneDays: days.filter(day => isDayDone(day, read)).length,
      totalChapters,
      readChapters,
      percent: totalChapters === 0 ? 0 : Math.round((readChapters / totalChapters) * 100),
      started: !!state.progress[id],
      active: state.activePlanId === id,
    };
  }

  private update(change: (state: PlanState) => PlanState): void {
    const next = change(this._state());
    this._state.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Unable to persist reading plans', error);
    }
  }
}

function isDayDone(day: PlanDay, read: ReadonlySet<string>): boolean {
  return day.chapters.length > 0 && day.chapters.every(ref => read.has(chapterKey(ref)));
}

function readSet(state: PlanState, planId: string): Set<string> {
  return new Set(state.progress[planId]?.read ?? []);
}

function withRead(state: PlanState, planId: string, keys: string[], add: boolean): PlanState {
  const current = state.progress[planId];
  if (!current) return state;

  const read = new Set(current.read);
  for (const key of keys) {
    if (add) read.add(key);
    else read.delete(key);
  }

  return {
    ...state,
    progress: { ...state.progress, [planId]: { ...current, read: [...read] } },
  };
}

function emptyState(): PlanState {
  return { activePlanId: null, custom: null, progress: {} };
}

/** Lecture défensive : un stockage corrompu ne doit jamais bloquer l'application. */
function readState(): PlanState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return emptyState();

    const input = parsed as Record<string, unknown>;
    const progress: Record<string, PlanProgress> = {};
    const rawProgress = input['progress'];
    if (rawProgress && typeof rawProgress === 'object') {
      for (const [id, value] of Object.entries(rawProgress)) {
        if (!value || typeof value !== 'object') continue;
        const entry = value as Record<string, unknown>;
        const read = Array.isArray(entry['read'])
          ? entry['read'].filter((key): key is string => typeof key === 'string')
          : [];
        const startedAt =
          typeof entry['startedAt'] === 'number' && Number.isFinite(entry['startedAt'])
            ? entry['startedAt']
            : Date.now();
        progress[id] = { startedAt, read };
      }
    }

    const rawCustom = input['custom'];
    let custom: CustomPlanSpec | null = null;
    if (rawCustom && typeof rawCustom === 'object') {
      const spec = rawCustom as Record<string, unknown>;
      if (
        typeof spec['bookId'] === 'string' &&
        Number.isInteger(spec['days']) &&
        (spec['days'] as number) >= 1
      ) {
        custom = { bookId: spec['bookId'], days: spec['days'] as number };
      }
    }

    const activePlanId =
      typeof input['activePlanId'] === 'string' ? input['activePlanId'] : null;

    return { activePlanId, custom, progress };
  } catch {
    return emptyState();
  }
}
