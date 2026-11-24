// Pas de @types/node dans le projet : ce test lit le vrai manifest via Node.
// @ts-expect-error TS2591
import { readFileSync } from 'node:fs';
import { TestBed } from '@angular/core/testing';
import type { BookInfo } from '../models/bible.model';
import { BibleService } from './bible.service';
import { PlanService } from './plan.service';
import { flatten, mergeTracks, psalmsAndProverbs, splitEven, summarizeDay } from '../utils/plan-builder';
import { PLAN_CATALOG } from '../models/plan.model';

function book(id: string, chapters: number, testament: 'ot' | 'nt'): BookInfo {
  return { id, chapters, testament, name: { fr: id, en: id } };
}

/** Mini-Bible : suffisante pour exercer tous les plans. */
const BOOKS: BookInfo[] = [
  book('genesis', 50, 'ot'),
  book('psalms', 150, 'ot'),
  book('proverbs', 31, 'ot'),
  book('matthew', 28, 'nt'),
  book('mark', 16, 'nt'),
  book('luke', 24, 'nt'),
  book('john', 21, 'nt'),
  book('acts', 28, 'nt'),
  book('romans', 16, 'nt'),
  book('1-corinthians', 16, 'nt'),
  book('2-corinthians', 13, 'nt'),
  book('galatians', 6, 'nt'),
  book('ephesians', 6, 'nt'),
  book('philippians', 4, 'nt'),
  book('colossians', 4, 'nt'),
  book('1-thessalonians', 5, 'nt'),
  book('2-thessalonians', 3, 'nt'),
  book('1-timothy', 6, 'nt'),
  book('2-timothy', 4, 'nt'),
  book('titus', 3, 'nt'),
  book('philemon', 1, 'nt'),
  book('hebrews', 13, 'nt'),
  book('james', 5, 'nt'),
  book('1-peter', 5, 'nt'),
  book('2-peter', 3, 'nt'),
  book('1-john', 5, 'nt'),
  book('2-john', 1, 'nt'),
  book('3-john', 1, 'nt'),
  book('jude', 1, 'nt'),
  book('revelation', 22, 'nt'),
];

async function createService(books: BookInfo[] = BOOKS): Promise<PlanService> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: BibleService, useValue: { getBooks: () => Promise.resolve(books) } }],
  });
  const service = TestBed.inject(PlanService);
  await service.ready;
  return service;
}

describe('plan-builder', () => {
  it('splits chapters evenly without losing any', () => {
    const refs = flatten(BOOKS, ['genesis']);
    const days = splitEven(refs, 7);
    expect(days).toHaveLength(7);
    expect(days.flatMap(day => day.chapters)).toEqual(refs);
    const sizes = days.map(day => day.chapters.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it('never produces empty days', () => {
    const days = splitEven(flatten(BOOKS, ['philemon']), 10);
    expect(days).toHaveLength(1);
    expect(days[0].chapters).toHaveLength(1);
  });

  it('merges tracks across all days', () => {
    const ot = flatten(BOOKS, ['genesis']);
    const nt = flatten(BOOKS, ['matthew']);
    const days = mergeTracks([ot, nt], 10);
    expect(days).toHaveLength(10);
    expect(days.flatMap(day => day.chapters)).toHaveLength(ot.length + nt.length);
  });

  it('builds the psalms and proverbs plan', () => {
    const days = psalmsAndProverbs(BOOKS);
    expect(days).toHaveLength(31);
    expect(days[0].chapters.map(ref => ref.chapter)).toEqual([1, 31, 61, 91, 121, 1]);
    const psalms = days.flatMap(day => day.chapters).filter(ref => ref.bookId === 'psalms');
    expect(psalms).toHaveLength(150);
    expect(new Set(psalms.map(ref => ref.chapter)).size).toBe(150);
    expect(days[30].chapters).toEqual([{ bookId: 'proverbs', chapter: 31 }]);
  });

  it('summarizes consecutive chapters', () => {
    const segments = summarizeDay({
      chapters: [
        { bookId: 'genesis', chapter: 1 },
        { bookId: 'genesis', chapter: 2 },
        { bookId: 'genesis', chapter: 3 },
        { bookId: 'psalms', chapter: 31 },
      ],
    });
    expect(segments).toEqual([
      { bookId: 'genesis', from: 1, to: 3 },
      { bookId: 'psalms', from: 31, to: 31 },
    ]);
  });
});

describe('PlanService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds every catalog plan on the real manifest with no empty day or duplicate', async () => {
    const manifest = JSON.parse(readFileSync('public/bibles/manifest.json', 'utf-8')) as {
      books: BookInfo[];
    };
    const service = await createService(manifest.books);
    for (const definition of PLAN_CATALOG) {
      const days = service.daysOf(definition.id);
      expect(days.length).toBeGreaterThan(0);
      const keys = days.flatMap(day => day.chapters.map(ref => `${ref.bookId}:${ref.chapter}`));
      expect(new Set(keys).size).toBe(keys.length);
      expect(days.every(day => day.chapters.length > 0)).toBe(true);
    }
  });

  it('has no active plan at first', async () => {
    const service = await createService();
    expect(service.active()).toBeNull();
  });

  it('moves to the next unread day without any calendar', async () => {
    const service = await createService();
    service.start('gospels-30');

    expect(service.active()?.currentDayIndex).toBe(0);
    const first = service.active()!.days[0].chapters;

    for (const ref of first) service.markChapter(ref);
    expect(service.active()?.currentDayIndex).toBe(1);
    expect(service.active()?.doneDays).toBe(1);
  });

  it('marks only chapters of the active plan', async () => {
    const service = await createService();
    service.start('gospels-30');

    expect(service.markChapter({ bookId: 'genesis', chapter: 1 })).toBe(false);
    expect(service.markChapter({ bookId: 'matthew', chapter: 1 })).toBe(true);
    expect(service.markChapter({ bookId: 'matthew', chapter: 1 })).toBe(false);
  });

  it('gives each plan its own progress', async () => {
    const service = await createService();
    service.start('gospels-30');
    service.markChapter({ bookId: 'matthew', chapter: 1 });

    // Matthieu 1 fait aussi partie de ce plan, mais sa progression est séparée.
    service.start('nt-90');
    expect(service.active()?.readChapters).toBe(0);
  });

  it('restores progress of a plan after switching away and back', async () => {
    const service = await createService();
    service.start('gospels-30');
    service.markChapter({ bookId: 'matthew', chapter: 1 });

    service.start('psalms-proverbs-31');
    expect(service.active()?.readChapters).toBe(0);

    service.start('gospels-30');
    expect(service.active()?.readChapters).toBe(1);

    const restored = await createService();
    restored.start('gospels-30');
    expect(restored.active()?.readChapters).toBe(1);
  });

  it('toggles a whole day', async () => {
    const service = await createService();
    service.start('psalms-proverbs-31');
    service.setDayDone(2, true);
    expect(service.isDayDone('psalms-proverbs-31', 2)).toBe(true);
    service.setDayDone(2, false);
    expect(service.isDayDone('psalms-proverbs-31', 2)).toBe(false);
  });

  it('can unmark a chapter', async () => {
    const service = await createService();
    service.start('gospels-30');
    const ref = { bookId: 'matthew', chapter: 1 };
    service.markChapter(ref);
    service.unmarkChapter(ref);
    expect(service.isRead(ref)).toBe(false);
  });

  it('stops without erasing progress', async () => {
    const service = await createService();
    service.start('gospels-30');
    service.markChapter({ bookId: 'matthew', chapter: 1 });
    service.stop();

    expect(service.active()).toBeNull();
    const summary = service.plans().find(plan => plan.id === 'gospels-30');
    expect(summary?.readChapters).toBe(1);
  });

  it('resets one plan only', async () => {
    const service = await createService();
    service.start('gospels-30');
    service.markChapter({ bookId: 'matthew', chapter: 1 });
    service.start('psalms-proverbs-31');
    service.markChapter({ bookId: 'psalms', chapter: 1 });

    service.reset('gospels-30');
    const plans = service.plans();
    expect(plans.find(plan => plan.id === 'gospels-30')?.readChapters).toBe(0);
    expect(plans.find(plan => plan.id === 'psalms-proverbs-31')?.readChapters).toBe(1);
  });

  it('creates a custom plan and caps the days to the chapter count', async () => {
    const service = await createService();
    expect(service.createCustom('john', 500)).toBe(true);
    expect(service.active()?.id).toBe('custom');
    expect(service.active()?.totalDays).toBe(21);
    expect(service.createCustom('unknown', 5)).toBe(false);
    expect(service.createCustom('john', 0)).toBe(false);
  });

  it('survives corrupted storage', async () => {
    localStorage.setItem('vivum-reading-plans', '{not json');
    const service = await createService();
    expect(service.active()).toBeNull();
  });
});
