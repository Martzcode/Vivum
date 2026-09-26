import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';
import { FavoritesService } from '../services/favorites.service';
import type { Favorite } from '../models/bible.model';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="favorites-page">
      <h1>{{ 'favorites.title' | t }}</h1>

      @if (favorites().length === 0) {
        <div class="favorites-empty">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <p>{{ 'favorites.empty' | t }}</p>
          <span>{{ 'favorites.emptyHint' | t }}</span>
        </div>
      } @else {
        <div class="favorites-list">
          @for (fav of favorites(); track fav.id) {
            <div class="fav-card">
              <a class="fav-link" [routerLink]="['/bible', fav.bookId, fav.chapter]">
                <div class="fav-ref">{{ fav.bookName }} {{ fav.chapter }}:{{ fav.verse }}</div>
                <div class="fav-text">{{ fav.text }}</div>
              </a>
              <button class="fav-remove" (click)="remove(fav)" [attr.aria-label]="'bible.removeFavorite' | t">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .favorites-page { max-width: 700px; margin: 0 auto; padding: 24px; }

    h1 { font-size: 24px; font-weight: 700; margin: 0 0 24px; color: var(--text-primary); }

    .favorites-empty {
      text-align: center;
      padding: 64px 24px;
    }

    .empty-icon {
      width: 48px;
      height: 48px;
      color: var(--border-medium);
      margin-bottom: 16px;
    }

    .favorites-empty p {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-secondary);
      margin: 0 0 8px;
    }

    .favorites-empty span {
      font-size: 13px;
      color: var(--text-muted);
    }

    .favorites-list { display: flex; flex-direction: column; gap: 8px; }

    .fav-card {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      transition: border-color 0.15s ease;
    }

    .fav-card:hover { border-color: var(--accent); }

    .fav-link {
      flex: 1;
      text-decoration: none;
    }

    .fav-link:hover { text-decoration: none; }

    .fav-ref {
      font-size: 13px;
      font-weight: 600;
      color: var(--accent);
      margin-bottom: 4px;
    }

    .fav-text {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .fav-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      background: none;
      border: none;
      cursor: pointer;
      flex-shrink: 0;
      opacity: 0;
      transition: all 0.1s ease;
    }

    .fav-card:hover .fav-remove { opacity: 1; }
    .fav-remove svg { width: 14px; height: 14px; }
    .fav-remove:hover { background: var(--bg-hover); color: #e25555; }
  `]
})
export class FavoritesComponent implements OnInit {
  private favoritesService = inject(FavoritesService);
  favorites = signal<Favorite[]>([]);

  ngOnInit() {
    this.favorites.set(this.favoritesService.getAll());
  }

  remove(fav: Favorite) {
    this.favoritesService.remove(fav.bookId, fav.chapter, fav.verse);
    this.favorites.set(this.favoritesService.getAll());
  }
}
