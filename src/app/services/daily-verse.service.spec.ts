import { TestBed } from '@angular/core/testing';
import { DailyVerseService } from './daily-verse.service';
import type { DailyVersePool } from '../models/daily-verse.model';
import { dailyEntrySequence, localDateKey } from '../models/daily-verse.model';

const pool: DailyVersePool = {
  schema: 1,
  readings: [
    {
      id: 'peace-john-3-16',
      bookId: 'john',
      chapter: 3,
      startVerse: 16,
      endVerse: 17,
      theme: 'peace',
    },
    {
      id: 'hope-psalms-23-1',
      bookId: 'psalms',
      chapter: 23,
      startVerse: 1,
      endVerse: 6,
      theme: 'hope',
    },
  ],
};

const manifest = {
  books: [
    {
      id: 'john',
      name: { fr: 'Jean', en: 'John' },
      testament: 'nt',
      chapters: 21,
    },
    {
      id: 'psalms',
      name: { fr: 'Psaumes', en: 'Psalms' },
      testament: 'ot',
      chapters: 150,
    },
  ],
};

const john3 = {
  book: 'Jean',
  bookId: 'john',
  chapter: 3,
  verses: [
    { verse: 16, text: 'Car Dieu a tant aimé le monde' },
    { verse: 17, text: 'Dieu n’a pas envoyé son Fils pour juger' },
  ],
};

const psalms23 = {
  book: 'Psaumes',
  bookId: 'psalms',
  chapter: 23,
  verses: [
    { verse: 1, text: 'L’Éternel est mon berger' },
    { verse: 2, text: 'Il me fait reposer dans de verts pâturages' },
    { verse: 3, text: 'Il restaure mon âme' },
    { verse: 4, text: 'Quand je marche dans la vallée de l’ombre de la mort' },
    { verse: 5, text: 'Tu dresses devant moi une table' },
    { verse: 6, text: 'Oui, le bonheur et la grâce m’accompagneront' },
  ],
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

function createService(): DailyVerseService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(DailyVerseService);
}

function stubFetch(missingChapter?: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/data/daily-verses.json')) return jsonResponse(pool);
      if (url.endsWith('manifest.json')) return jsonResponse(manifest);
      if (missingChapter && url.includes(missingChapter)) return jsonResponse({}, false, 404);
      if (url.includes('/john/3.json')) return jsonResponse(john3);
      if (url.includes('/psalms/23.json')) return jsonResponse(psalms23);
      return jsonResponse({}, false, 404);
    }),
  );
}

describe('DailyVerseService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads a ready passage and exposes the themes of the pool', async () => {
    stubFetch();
    const service = createService();

    service.setTheme('hope');
    await service.reload();

    const state = service.state();
    expect(state.status).toBe('ready');
    if (state.status !== 'ready') return;

    expect(state.reading.bookName).toBe('Psaumes');
    expect(state.reading.reference).toBe('Psaumes 23:1-6');
    expect(state.reading.verses).toHaveLength(6);
    expect(state.reading.text).toContain('L’Éternel est mon berger');
    expect(service.themes()).toEqual(['hope', 'peace']);
    expect(service.themeOptions()).toEqual(['all', 'hope', 'peace']);
  });

  it('persists the selected theme locally', async () => {
    stubFetch();
    const service = createService();

    service.setTheme('peace');

    expect(localStorage.getItem('vivum-daily-theme')).toBe('peace');
  });

  it('falls back to the next passage when the selected one is missing', async () => {
    const today = localDateKey(new Date());
    const [first, second] = dailyEntrySequence(pool.readings, today, 2);
    stubFetch(`/${first.bookId}/${first.chapter}.json`);

    const service = createService();
    service.setTheme('all');
    await service.reload();

    const state = service.state();
    expect(state.status).toBe('ready');
    if (state.status !== 'ready') return;

    expect(state.reading.id).toBe(second.id);
  });

  it('reports an error instead of showing a truncated passage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/data/daily-verses.json')) return jsonResponse({}, false, 500);
        return jsonResponse(manifest);
      }),
    );

    const service = createService();
    await service.reload();

    expect(service.state()).toEqual({
      status: 'error',
      messageKey: 'dailyVerse.error',
    });
  });
});
