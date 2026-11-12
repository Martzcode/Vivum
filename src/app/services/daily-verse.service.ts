import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { BibleService } from './bible.service';
import { TranslateService } from './translate.service';
import type { DailyVersePool, DailyVerseState, DailyReading } from '../models/daily-verse.model';
import {
  dailyEntrySequence,
  formatReference,
  localDateKey,
  parseDailyVersePool,
  sliceVerses,
} from '../models/daily-verse.model';
import type { Chapter, SupportedLocale } from '../models/bible.model';

const POOL_URL = '/data/daily-verses.json';
/** Nombre d'entrées testées avant d'abandonner si un passage est introuvable. */
const MAX_FALLBACKS = 7;

/**
 * « Verset du jour » 100 % hors ligne.
 *
 * Le pool de passages est un fichier embarqué ; la sélection est déterministe
 * (date locale + pool) et ne nécessite ni réseau, ni historique stocké.
 */
@Injectable({ providedIn: 'root' })
export class DailyVerseService {
  private readonly bible = inject(BibleService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private poolRequest?: Promise<DailyVersePool>;
  private loadToken = 0;
  private midnightTimer?: ReturnType<typeof setTimeout>;

  readonly dayKey = signal(localDateKey(new Date()));
  readonly state = signal<DailyVerseState>({ status: 'loading' });

  readonly reading = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.reading : null;
  });

  constructor() {
    effect(() => {
      const locale = this.translate.currentLocale();
      const dayKey = this.dayKey();
      void this.load(locale, dayKey);
    });

    this.scheduleMidnightRefresh();
    this.destroyRef.onDestroy(() => clearTimeout(this.midnightTimer));
  }

  /** Recharge le passage courant (bouton « Réessayer »). */
  reload(): Promise<void> {
    return this.load(this.translate.currentLocale(), this.dayKey());
  }

  private getPool(): Promise<DailyVersePool> {
    this.poolRequest ??= this.fetchPool().catch(error => {
      this.poolRequest = undefined;
      throw error;
    });
    return this.poolRequest;
  }

  private async fetchPool(): Promise<DailyVersePool> {
    const response = await fetch(POOL_URL);
    if (!response.ok) throw new Error(`Daily verse pool HTTP ${response.status}`);
    return parseDailyVersePool(await response.json());
  }

  private async load(locale: SupportedLocale, dayKey: string): Promise<void> {
    const token = ++this.loadToken;
    this.state.set({ status: 'loading' });

    try {
      const [pool, books] = await Promise.all([this.getPool(), this.bible.getBooks()]);
      if (token !== this.loadToken) return;

      const candidates = dailyEntrySequence(pool.readings, dayKey, MAX_FALLBACKS);
      for (const entry of candidates) {
        const book = books.find(item => item.id === entry.bookId);
        if (!book) continue;
        if (entry.chapter > book.chapters) continue;

        let chapter: Chapter;
        try {
          chapter = await this.bible.getChapter(locale, entry.bookId, entry.chapter);
        } catch {
          // Passage absent de cette version : on tente le suivant du pool.
          continue;
        }
        if (token !== this.loadToken) return;

        const verses = sliceVerses(chapter, entry);
        if (verses.length === 0) continue;

        const bookName = book.name[locale] ?? book.name['en'] ?? book.id;
        const reading: DailyReading = {
          ...entry,
          bookName,
          verses,
          text: verses.map(verse => verse.text).join(' '),
          reference: formatReference(bookName, entry),
        };

        this.state.set({ status: 'ready', reading });
        return;
      }

      this.state.set({ status: 'error', messageKey: 'dailyVerse.error' });
    } catch {
      if (token !== this.loadToken) return;
      this.state.set({ status: 'error', messageKey: 'dailyVerse.error' });
    }
  }

  /**
   * Programme le passage au jour suivant à minuit local. L'utilisateur qui
   * laisse l'application ouverte voit donc le verset changer sans redémarrer.
   */
  private scheduleMidnightRefresh(): void {
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      5,
    );

    clearTimeout(this.midnightTimer);
    this.midnightTimer = setTimeout(
      () => {
        this.dayKey.set(localDateKey(new Date()));
        this.scheduleMidnightRefresh();
      },
      Math.max(1_000, nextMidnight.getTime() - now.getTime()),
    );
  }
}
