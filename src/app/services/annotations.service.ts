import { Injectable, computed, signal } from '@angular/core';
import type { Annotation, BibleVersion, HighlightColor } from '../models/bible.model';
import { favoriteId, isHighlightColor, toBibleVersion } from '../models/bible.model';

const STORAGE_KEY = 'vivum-annotations-v1';
const MAX_NOTE_LENGTH = 2000;

export interface VerseRef {
  version: BibleVersion;
  bookId: string;
  chapter: number;
  verse: number;
}

/**
 * Surlignages et notes personnelles, conservés localement.
 *
 * Une annotation est identifiée comme un favori (version + référence). Elle
 * disparaît dès qu'elle n'a ni couleur ni note.
 */
@Injectable({ providedIn: 'root' })
export class AnnotationsService {
  private readonly _items = signal<Annotation[]>(this.load());
  readonly annotations = this._items.asReadonly();

  readonly byId = computed(() => new Map(this._items().map(item => [item.id, item])));

  get(ref: VerseRef): Annotation | undefined {
    return this.byId().get(idOf(ref));
  }

  setColor(ref: VerseRef, color: HighlightColor | null): void {
    this.update(ref, current => ({ ...current, color: color ?? undefined }));
  }

  setNote(ref: VerseRef, note: string): void {
    const trimmed = note.trim().slice(0, MAX_NOTE_LENGTH);
    this.update(ref, current => ({ ...current, note: trimmed || undefined }));
  }

  remove(ref: VerseRef): void {
    const id = idOf(ref);
    this.commit(this._items().filter(item => item.id !== id));
  }

  private update(ref: VerseRef, change: (current: Annotation) => Annotation): void {
    const id = idOf(ref);
    const existing = this.byId().get(id);
    const base: Annotation = existing ?? { id, ...ref, updatedAt: Date.now() };
    const next = { ...change(base), updatedAt: Date.now() };

    const others = this._items().filter(item => item.id !== id);
    this.commit(next.color || next.note ? [...others, next] : others);
  }

  private commit(next: Annotation[]): void {
    this._items.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Unable to persist annotations', error);
    }
  }

  private load(): Annotation[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(item => toAnnotation(item))
        .filter((item): item is Annotation => item !== null);
    } catch {
      return [];
    }
  }
}

function idOf(ref: VerseRef): string {
  return favoriteId(ref.version, ref.bookId, ref.chapter, ref.verse);
}

export function toAnnotation(value: unknown): Annotation | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;

  const version = toBibleVersion(input['version']);
  const bookId = input['bookId'];
  const chapter = input['chapter'];
  const verse = input['verse'];
  if (!version || typeof bookId !== 'string' || !bookId) return null;
  if (!Number.isInteger(chapter) || (chapter as number) < 1) return null;
  if (!Number.isInteger(verse) || (verse as number) < 1) return null;

  const color = isHighlightColor(input['color']) ? input['color'] : undefined;
  const note =
    typeof input['note'] === 'string' && input['note'].trim()
      ? input['note'].slice(0, MAX_NOTE_LENGTH)
      : undefined;
  if (!color && !note) return null;

  return {
    id: favoriteId(version, bookId, chapter as number, verse as number),
    version,
    bookId,
    chapter: chapter as number,
    verse: verse as number,
    color,
    note,
    updatedAt:
      typeof input['updatedAt'] === 'number' && Number.isFinite(input['updatedAt'])
        ? input['updatedAt']
        : Date.now(),
  };
}
