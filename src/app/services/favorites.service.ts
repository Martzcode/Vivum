import { Injectable, computed, signal } from '@angular/core';
import type { BibleVersion, Favorite } from '../models/bible.model';
import { favoriteId, toBibleVersion } from '../models/bible.model';

const STORAGE_KEY = 'vivum-favorites-v2';
const LEGACY_KEY = 'vivum-favorites';

interface ExportPayload {
  schema: 2;
  exportedAt: string;
  favorites: Favorite[];
}

/**
 * Favoris réactifs, identifiés par version + référence.
 *
 * - `favorites` est un signal : toutes les vues (lecteur, accueil, page
 *   Favoris) se mettent à jour automatiquement.
 * - `id` inclut la version, ce qui permet d'épingler le même verset dans
 *   plusieurs traductions.
 * - Migration automatique de l'ancien format (`vivum-favorites`), dont le
 *   champ `version` contenait en réalité une locale.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly _favorites = signal<Favorite[]>(this.load());
  readonly favorites = this._favorites.asReadonly();

  /** Ensemble des identifiants, pour des vérifications O(1) dans les vues. */
  readonly ids = computed(() => new Set(this._favorites().map(favorite => favorite.id)));

  isFavorite(
    version: BibleVersion,
    bookId: string,
    chapter: number,
    verse: number,
  ): boolean {
    return this.ids().has(favoriteId(version, bookId, chapter, verse));
  }

  toggle(input: Omit<Favorite, 'id' | 'timestamp'>): boolean {
    const id = favoriteId(input.version, input.bookId, input.chapter, input.verse);
    if (this.ids().has(id)) {
      this.remove(id);
      return false;
    }
    this.add(input);
    return true;
  }

  add(input: Omit<Favorite, 'id' | 'timestamp'>): void {
    const id = favoriteId(input.version, input.bookId, input.chapter, input.verse);
    if (this.ids().has(id)) return;

    const favorite: Favorite = { ...input, id, timestamp: Date.now() };
    this.commit([...this._favorites(), favorite]);
  }

  remove(id: string): void {
    this.commit(this._favorites().filter(favorite => favorite.id !== id));
  }

  clear(): void {
    this.commit([]);
  }

  exportJson(): string {
    const payload: ExportPayload = {
      schema: 2,
      exportedAt: new Date().toISOString(),
      favorites: this._favorites(),
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Importe des favoris (fusion par défaut).
   * @returns le nombre de favoris valides lus dans le fichier.
   */
  importJson(raw: string, mode: 'merge' | 'replace' = 'merge'): number {
    const parsed: unknown = JSON.parse(raw);
    const items = Array.isArray(parsed)
      ? parsed
      : (parsed as { favorites?: unknown })?.favorites;

    if (!Array.isArray(items)) throw new Error('Invalid favorites file');

    const imported = items
      .map(item => toFavorite(item))
      .filter((favorite): favorite is Favorite => favorite !== null);

    if (items.length > 0 && imported.length === 0) {
      throw new Error('No valid favorite in file');
    }

    const merged = new Map<string, Favorite>();
    if (mode === 'merge') {
      for (const favorite of this._favorites()) merged.set(favorite.id, favorite);
    }
    for (const favorite of imported) merged.set(favorite.id, favorite);

    this.commit([...merged.values()]);
    return imported.length;
  }

  private commit(next: Favorite[]): void {
    this._favorites.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Unable to persist favorites', error);
    }
  }

  private load(): Favorite[] {
    const current = readJson(STORAGE_KEY);
    if (Array.isArray(current)) {
      return current
        .map(item => toFavorite(item))
        .filter((favorite): favorite is Favorite => favorite !== null);
    }

    const legacy = readJson(LEGACY_KEY);
    if (!Array.isArray(legacy)) return [];

    const migrated = legacy
      .map(item => toFavorite(item))
      .filter((favorite): favorite is Favorite => favorite !== null);

    if (migrated.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_KEY);
      } catch (error) {
        console.error('Unable to migrate favorites', error);
      }
    }

    return migrated;
  }
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Valide et normalise un favori stocké ou importé.
 * Accepte l'ancien format (version = locale, pas de note/tags).
 */
export function toFavorite(value: unknown): Favorite | null {
  if (!value || typeof value !== 'object') return null;

  const input = value as Record<string, unknown>;
  const version = toBibleVersion(input['version']);
  const bookId = input['bookId'];
  const chapter = input['chapter'];
  const verse = input['verse'];
  const text = input['text'];

  if (!version || typeof bookId !== 'string' || !bookId) return null;
  if (!Number.isInteger(chapter) || (chapter as number) < 1) return null;
  if (!Number.isInteger(verse) || (verse as number) < 1) return null;
  if (typeof text !== 'string') return null;

  const bookName =
    typeof input['bookName'] === 'string' && input['bookName']
      ? input['bookName']
      : bookId;

  const timestamp =
    typeof input['timestamp'] === 'number' && Number.isFinite(input['timestamp'])
      ? input['timestamp']
      : Date.now();

  const favorite: Favorite = {
    id: favoriteId(version, bookId, chapter as number, verse as number),
    version,
    bookId,
    chapter: chapter as number,
    verse: verse as number,
    text,
    bookName,
    timestamp,
  };

  if (typeof input['note'] === 'string') favorite.note = input['note'];
  if (Array.isArray(input['tags'])) {
    favorite.tags = input['tags'].filter((tag): tag is string => typeof tag === 'string');
  }

  return favorite;
}
