import { Injectable, signal } from '@angular/core';
import type { ReadingPosition } from '../models/bible.model';
import { toBibleVersion } from '../models/bible.model';

const CURRENT_KEY = 'vivum-reading-progress';
const RECENT_KEY = 'vivum-reading-recent';
const MAX_RECENT = 8;

/**
 * Position de lecture courante et historique récent.
 *
 * Cette donnée est réellement persistée (contrairement à l'ancienne
 * « dernière lecture » déduite du dernier favori), ce qui permet à
 * l'accueil de proposer une reprise fiable.
 */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly _current = signal<ReadingPosition | null>(readPosition(CURRENT_KEY));
  readonly current = this._current.asReadonly();

  private readonly _recent = signal<ReadingPosition[]>(readRecent());
  readonly recent = this._recent.asReadonly();

  /** Enregistre l'ouverture d'un chapitre (nouvelle position courante). */
  save(position: Omit<ReadingPosition, 'updatedAt'>): void {
    const previous = this._current();
    const verse =
      position.verse ??
      (previous &&
      previous.version === position.version &&
      previous.bookId === position.bookId &&
      previous.chapter === position.chapter
        ? previous.verse
        : undefined);

    const next: ReadingPosition = {
      ...position,
      ...(verse ? { verse } : {}),
      updatedAt: Date.now(),
    };

    this._current.set(next);
    writeJson(CURRENT_KEY, next);

    this._recent.update(list => [
      next,
      ...list.filter(
        entry => !(entry.version === next.version && entry.bookId === next.bookId),
      ),
    ].slice(0, MAX_RECENT));
    writeJson(RECENT_KEY, this._recent());
  }

  /** Met à jour le verset courant sans réordonner l'historique. */
  updateVerse(verse: number): void {
    const current = this._current();
    if (!current || current.verse === verse) return;

    const next: ReadingPosition = { ...current, verse, updatedAt: Date.now() };
    this._current.set(next);
    writeJson(CURRENT_KEY, next);

    this._recent.update(list =>
      list.map(entry =>
        entry.version === next.version &&
        entry.bookId === next.bookId &&
        entry.chapter === next.chapter
          ? next
          : entry,
      ),
    );
    writeJson(RECENT_KEY, this._recent());
  }

  clear(): void {
    this._current.set(null);
    this._recent.set([]);
    try {
      localStorage.removeItem(CURRENT_KEY);
      localStorage.removeItem(RECENT_KEY);
    } catch (error) {
      console.error('Unable to clear reading progress', error);
    }
  }
}

function readPosition(key: string): ReadingPosition | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? toPosition(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function readRecent(): ReadingPosition[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => toPosition(item))
      .filter((item): item is ReadingPosition => item !== null)
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function toPosition(value: unknown): ReadingPosition | null {
  if (!value || typeof value !== 'object') return null;

  const input = value as Record<string, unknown>;
  const version = toBibleVersion(input['version']);
  const bookId = input['bookId'];
  const bookName = input['bookName'];
  const chapter = input['chapter'];
  const verse = input['verse'];
  const updatedAt = input['updatedAt'];

  if (!version || typeof bookId !== 'string' || !bookId) return null;
  if (!Number.isInteger(chapter) || (chapter as number) < 1) return null;

  const position: ReadingPosition = {
    version,
    bookId,
    bookName: typeof bookName === 'string' && bookName ? bookName : bookId,
    chapter: chapter as number,
    updatedAt:
      typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : Date.now(),
  };

  if (Number.isInteger(verse) && (verse as number) >= 1) {
    position.verse = verse as number;
  }

  return position;
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Unable to persist ${key}`, error);
  }
}
