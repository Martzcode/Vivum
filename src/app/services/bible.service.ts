import { Injectable } from '@angular/core';
import type { BookInfo, Chapter, SearchResult, SupportedLocale } from '../models/bible.model';
import { VERSION_MAP } from '../models/bible.model';

const MAX_CACHED_CHAPTERS = 40;

/**
 * Accès aux textes bibliques embarqués.
 *
 * Les erreurs sont propagées (jamais converties en tableau vide) pour que
 * les écrans puissent afficher un état d'erreur explicite. Les requêtes
 * acceptent un AbortSignal afin d'annuler les navigations obsolètes.
 */
@Injectable({ providedIn: 'root' })
export class BibleService {
  private manifestRequest?: Promise<BookInfo[]>;
  private chapters = new Map<string, Chapter>();

  /** Toutes les langues partagent le même manifest : une seule requête. */
  getBooks(): Promise<BookInfo[]> {
    this.manifestRequest ??= this.fetchManifest().catch(error => {
      this.manifestRequest = undefined;
      throw error;
    });
    return this.manifestRequest;
  }

  private async fetchManifest(): Promise<BookInfo[]> {
    const res = await fetch('/bibles/manifest.json');
    if (!res.ok) throw new Error(`Manifest HTTP ${res.status}`);
    const data = (await res.json()) as { books?: BookInfo[] };
    if (!Array.isArray(data.books)) throw new Error('Invalid manifest');
    return data.books;
  }

  async getChapter(
    locale: SupportedLocale,
    bookId: string,
    chapter: number,
    signal?: AbortSignal,
  ): Promise<Chapter> {
    const key = this.cacheKey(locale, bookId, chapter);
    const cached = this.chapters.get(key);
    if (cached) {
      this.touch(key, cached);
      return cached;
    }

    const version = VERSION_MAP[locale];
    const res = await fetch(`/bibles/${version}/${bookId}/${chapter}.json`, { signal });
    if (!res.ok) throw new Error(`Chapter HTTP ${res.status}`);
    const data = (await res.json()) as Chapter;
    if (!data || !Array.isArray(data.verses)) throw new Error('Invalid chapter');

    this.touch(key, data);
    return data;
  }

  async search(
    locale: SupportedLocale,
    query: string,
    signal?: AbortSignal,
  ): Promise<SearchResult[]> {
    const needle = normalize(query);
    if (!needle) return [];

    const books = await this.getBooks();
    const results: SearchResult[] = [];

    for (const book of books) {
      throwIfAborted(signal);

      for (let ch = 1; ch <= book.chapters; ch++) {
        throwIfAborted(signal);
        const chapter = await this.getChapter(locale, book.id, ch, signal);

        for (const verse of chapter.verses) {
          const haystack = normalize(verse.text);
          const idx = haystack.indexOf(needle);
          if (idx === -1) continue;

          const end = idx + needle.length;
          const start = Math.max(0, idx - 40);
          const afterEnd = Math.min(verse.text.length, end + 40);

          results.push({
            bookId: book.id,
            bookName: book.name[locale] ?? book.name['en'] ?? book.id,
            chapter: ch,
            verse: verse.verse,
            text: verse.text,
            before: (start > 0 ? '…' : '') + verse.text.slice(start, idx),
            match: verse.text.slice(idx, end),
            after: verse.text.slice(end, afterEnd) + (afterEnd < verse.text.length ? '…' : ''),
          });
        }
      }
    }

    return results;
  }

  private cacheKey(locale: SupportedLocale, bookId: string, chapter: number): string {
    return `${locale}:${bookId}:${chapter}`;
  }

  /** Cache LRU borné : la mémoire reste stable sur une longue session. */
  private touch(key: string, chapter: Chapter): void {
    this.chapters.delete(key);
    this.chapters.set(key, chapter);
    if (this.chapters.size > MAX_CACHED_CHAPTERS) {
      const oldest = this.chapters.keys().next().value;
      if (oldest !== undefined) this.chapters.delete(oldest);
    }
  }
}

/** Minuscules sans diacritiques, pour une recherche tolérante aux accents. */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
}
