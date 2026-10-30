import { TestBed } from '@angular/core/testing';
import { BibleService } from './bible.service';

const manifest = {
  books: [
    {
      id: 'john',
      name: { fr: 'Jean', en: 'John', es: 'Juan', de: 'Johannes', mg: 'Jaona' },
      testament: 'nt',
      chapters: 1,
    },
  ],
};

const chapter = {
  book: 'Jean',
  bookId: 'john',
  chapter: 1,
  verses: [
    { verse: 1, text: 'Au commencement était la Parole' },
    { verse: 2, text: 'Car Dieu a tant aimé <le> monde & ses habitants' },
  ],
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

function createService(): BibleService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(BibleService);
}

describe('BibleService', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.endsWith('manifest.json')) return jsonResponse(manifest);
        if (url.includes('/john/1.json')) return jsonResponse(chapter);

        return jsonResponse({}, false, 404);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the manifest only once', async () => {
    const service = createService();
    await service.getBooks();
    await service.getBooks();

    const calls = (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(calls.filter(call => String(call[0]).endsWith('manifest.json'))).toHaveLength(1);
  });

  it('throws instead of returning an empty list on HTTP errors', async () => {
    const service = createService();
    await expect(service.getChapter('fr', 'unknown', 1)).rejects.toThrow();
  });

  it('returns safe segments for highlighting (never HTML)', async () => {
    const service = createService();
    const [result] = await service.search('fr', 'a tant aime');

    expect(result.bookName).toBe('Jean');
    expect(result.match).toBe('a tant aimé');
    expect(result.before).toBe('Car Dieu ');
    expect(result.after).toContain('<le> monde &');
    expect(result.match).not.toContain('<mark>');
    expect(result.before).not.toContain('<mark>');
  });

  it('matches without accents and preserves original casing', async () => {
    const service = createService();
    const [result] = await service.search('fr', 'COMMENCEMENT ETAIT');

    expect(result.match).toBe('commencement était');
    expect(result.before).toBe('Au ');
  });

  it('aborts an in-flight search', async () => {
    const service = createService();
    const controller = new AbortController();
    controller.abort();

    await expect(service.search('fr', 'dieu', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
