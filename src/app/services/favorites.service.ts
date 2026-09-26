import { Injectable } from '@angular/core';
import type { Favorite } from '../models/bible.model';

const STORAGE_KEY = 'vivum-favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private favorites: Favorite[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.favorites = raw ? JSON.parse(raw) : [];
    } catch {
      this.favorites = [];
    }
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.favorites));
  }

  getAll(): Favorite[] {
    return [...this.favorites];
  }

  isFavorite(bookId: string, chapter: number, verse: number): boolean {
    return this.favorites.some(f => f.bookId === bookId && f.chapter === chapter && f.verse === verse);
  }

  add(fav: Omit<Favorite, 'id' | 'timestamp'>): void {
    if (this.isFavorite(fav.bookId, fav.chapter, fav.verse)) return;
    this.favorites.push({
      ...fav,
      id: `${fav.bookId}:${fav.chapter}:${fav.verse}`,
      timestamp: Date.now(),
    });
    this.save();
  }

  remove(bookId: string, chapter: number, verse: number): void {
    this.favorites = this.favorites.filter(f =>
      !(f.bookId === bookId && f.chapter === chapter && f.verse === verse),
    );
    this.save();
  }

  toggle(fav: Omit<Favorite, 'id' | 'timestamp'>): boolean {
    if (this.isFavorite(fav.bookId, fav.chapter, fav.verse)) {
      this.remove(fav.bookId, fav.chapter, fav.verse);
      return false;
    }
    this.add(fav);
    return true;
  }
}
