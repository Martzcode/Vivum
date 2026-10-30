import { TestBed } from '@angular/core/testing';
import { FavoritesService } from './favorites.service';

function createService(): FavoritesService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(FavoritesService);
}

const baseFavorite = {
  version: 'ls1910' as const,
  bookId: 'john',
  chapter: 3,
  verse: 16,
  text: 'Car Dieu a tant aimé le monde',
  bookName: 'Jean',
};

describe('FavoritesService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('identifies a favorite by version and reference', () => {
    const service = createService();
    service.add(baseFavorite);

    expect(service.isFavorite('ls1910', 'john', 3, 16)).toBe(true);
    expect(service.isFavorite('kjv', 'john', 3, 16)).toBe(false);
    expect(service.favorites()).toHaveLength(1);
  });

  it('toggles the same verse independently per version', () => {
    const service = createService();
    service.add(baseFavorite);
    service.add({ ...baseFavorite, version: 'kjv', bookName: 'John' });

    expect(service.favorites()).toHaveLength(2);
    expect(service.toggle(baseFavorite)).toBe(false);
    expect(service.isFavorite('ls1910', 'john', 3, 16)).toBe(false);
    expect(service.isFavorite('kjv', 'john', 3, 16)).toBe(true);
  });

  it('migrates the legacy format where version was a locale', () => {
    localStorage.setItem(
      'vivum-favorites',
      JSON.stringify([
        {
          id: 'john:3:16',
          bookId: 'john',
          chapter: 3,
          verse: 16,
          text: 'Car Dieu a tant aimé le monde',
          bookName: 'Jean',
          version: 'fr',
          timestamp: 1,
        },
      ]),
    );

    const service = createService();

    expect(service.isFavorite('ls1910', 'john', 3, 16)).toBe(true);
    expect(service.favorites()[0].id).toBe('ls1910:john:3:16');
    expect(localStorage.getItem('vivum-favorites-v2')).toBeTruthy();
    expect(localStorage.getItem('vivum-favorites')).toBeNull();
  });

  it('round-trips export and import without duplicates', () => {
    const service = createService();
    service.add(baseFavorite);
    const exported = service.exportJson();

    expect(service.importJson(exported)).toBe(1);
    expect(service.favorites()).toHaveLength(1);

    service.clear();
    expect(service.importJson(exported)).toBe(1);
    expect(service.isFavorite('ls1910', 'john', 3, 16)).toBe(true);
  });

  it('rejects an invalid import file', () => {
    const service = createService();
    expect(() => service.importJson('{"favorites":"nope"}')).toThrow();
    expect(() => service.importJson('not json')).toThrow();
    expect(service.favorites()).toHaveLength(0);
  });

  it('clears all favorites', () => {
    const service = createService();
    service.add(baseFavorite);
    service.clear();

    expect(service.favorites()).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('vivum-favorites-v2') ?? '[]')).toEqual([]);
  });
});
