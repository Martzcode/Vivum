import type { Chapter } from './bible.model';
import {
  dailyEntrySequence,
  formatReference,
  localDateKey,
  localDayNumber,
  parseDailyVersePool,
  pickDailyEntry,
  sliceVerses,
} from './daily-verse.model';
import type { DailyVerseEntry } from './daily-verse.model';

const entries: DailyVerseEntry[] = [
  { id: 'peace-john-3-16', bookId: 'john', chapter: 3, startVerse: 16, endVerse: 16, theme: 'peace' },
  { id: 'peace-psalms-23-1', bookId: 'psalms', chapter: 23, startVerse: 1, endVerse: 6, theme: 'peace' },
  { id: 'hope-romans-8-28', bookId: 'romans', chapter: 8, startVerse: 28, endVerse: 28, theme: 'hope' },
];

const chapter: Chapter = {
  book: 'Jean',
  bookId: 'john',
  chapter: 3,
  verses: [
    { verse: 15, text: 'avant' },
    { verse: 16, text: 'Car Dieu a tant aimé le monde' },
    { verse: 17, text: 'Dieu n’a pas envoyé son Fils pour juger' },
    { verse: 18, text: 'après' },
  ],
};

describe('daily verse model', () => {
  it('formats a local date key without UTC shift', () => {
    expect(localDateKey(new Date(2026, 10, 12, 23, 30))).toBe('2026-11-12');
    expect(localDateKey(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });

  it('counts calendar days independently of time', () => {
    expect(localDayNumber('2026-11-12') - localDayNumber('2026-11-11')).toBe(1);
    expect(localDayNumber('2024-02-29') - localDayNumber('2024-02-28')).toBe(1);
  });

  it('selects the same passage for the same day and pool', () => {
    const first = pickDailyEntry(entries, '2026-11-12');
    const second = pickDailyEntry(entries, '2026-11-12');
    expect(first?.id).toBe(second?.id);
  });

  it('does not repeat a passage before covering the whole pool', () => {
    const pool = Array.from({ length: 23 }, (_, index) => ({
      id: `entry-${index}`,
      bookId: 'john',
      chapter: 1,
      startVerse: index + 1,
      endVerse: index + 1,
      theme: 'peace',
    }));

    const ids = dailyEntrySequence(pool, '2026-01-01', 23).map(entry => entry.id);
    expect(new Set(ids).size).toBe(23);
  });

  it('slices only the verses of the passage', () => {
    const passage = { ...entries[0], startVerse: 16, endVerse: 17 };
    expect(sliceVerses(chapter, passage).map(verse => verse.verse)).toEqual([16, 17]);
  });

  it('returns an empty slice when the passage is absent from a version', () => {
    const passage = { ...entries[0], startVerse: 99, endVerse: 100 };
    expect(sliceVerses(chapter, passage)).toEqual([]);
  });

  it('formats single verses and ranges', () => {
    expect(formatReference('Jean', entries[0])).toBe('Jean 3:16');
    expect(formatReference('Psaumes', entries[1])).toBe('Psaumes 23:1-6');
  });

  it('normalizes the pool and rejects invalid content', () => {
    const pool = parseDailyVersePool({
      schema: 1,
      readings: [
        { id: 'a', bookId: 'john', chapter: 3, startVerse: 16, theme: 'peace' },
        { id: 'b', bookId: 'john', chapter: 3, startVerse: 5, endVerse: 2, theme: 'peace' },
        { bookId: 'john', chapter: 3, startVerse: 1, theme: 'peace' },
      ],
    });

    expect(pool.readings).toHaveLength(1);
    expect(pool.readings[0].endVerse).toBe(16);
    expect(() => parseDailyVersePool({ readings: [] })).toThrow();
    expect(() => parseDailyVersePool({})).toThrow();
  });
});
