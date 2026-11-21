import type { BookInfo } from '../models/bible.model';
import { findReferences, normalizeName } from './reference';

const books: BookInfo[] = [
  { id: 'john', name: { fr: 'Jean', en: 'John', es: 'Juan', de: 'Johannes', mg: 'Jaona' }, testament: 'nt', chapters: 21 },
  { id: '1john', name: { fr: '1 Jean', en: '1 John', es: '1 Juan', de: '1. Johannes', mg: '1 Jaona' }, testament: 'nt', chapters: 5 },
  { id: 'psalms', name: { fr: 'Psaumes', en: 'Psalms', es: 'Salmos', de: 'Psalmen', mg: 'Salamo' }, testament: 'ot', chapters: 150 },
  { id: 'genesis', name: { fr: 'Genèse', en: 'Genesis', es: 'Génesis', de: '1. Mose', mg: 'Genesis' }, testament: 'ot', chapters: 50 },
];

describe('findReferences', () => {
  it('normalizes accents and punctuation', () => {
    expect(normalizeName('Genèse')).toBe('genese');
    expect(normalizeName('1. Mose')).toBe('1mose');
  });

  it('parses book, chapter and verse', () => {
    const [first] = findReferences('Jean 3:16', books, 'fr');
    expect(first.book.id).toBe('john');
    expect(first.chapter).toBe(3);
    expect(first.verse).toBe(16);
  });

  it('accepts separators and numbered books', () => {
    const [first] = findReferences('1 jean 2 3', books, 'fr');
    expect(first.book.id).toBe('1john');
    expect(first.chapter).toBe(2);
    expect(first.verse).toBe(3);
  });

  it('prefers the exact name over numbered books', () => {
    const results = findReferences('jean', books, 'fr');
    expect(results[0].book.id).toBe('john');
  });

  it('matches prefixes and other languages', () => {
    expect(findReferences('gen 1', books, 'fr')[0].book.id).toBe('genesis');
    expect(findReferences('psalms 23', books, 'fr')[0].chapter).toBe(23);
  });

  it('drops an out-of-range chapter and its verse', () => {
    const [first] = findReferences('Jean 99:1', books, 'fr');
    expect(first.chapter).toBeUndefined();
    expect(first.verse).toBeUndefined();
  });

  it('returns nothing for empty or unknown input', () => {
    expect(findReferences('', books, 'fr')).toEqual([]);
    expect(findReferences('zzz', books, 'fr')).toEqual([]);
  });
});
