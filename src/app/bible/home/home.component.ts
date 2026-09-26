import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { FavoritesService } from '../../services/favorites.service';
import type { Favorite } from '../../models/bible.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, TranslatePipe, SlicePipe],
  template: `
    <div class="home">
      <div class="home-hero">
        <svg class="home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          <path d="M8 7h8"/>
          <path d="M8 11h8"/>
          <path d="M8 15h5"/>
        </svg>
        <h1>{{ 'home.welcome' | t }}</h1>
        <p class="home-subtitle">{{ 'home.subtitle' | t }}</p>
        <a class="home-cta" routerLink="/bible">{{ 'home.startReading' | t }}</a>
      </div>

      @if (lastFavorite()) {
        <div class="home-section">
          <h2>{{ 'home.lastRead' | t }}</h2>
          <a class="last-read-card" [routerLink]="['/bible', lastFavorite()!.bookId, lastFavorite()!.chapter]">
            <span class="last-read-ref">{{ lastFavorite()!.bookName }} {{ lastFavorite()!.chapter }}:{{ lastFavorite()!.verse }}</span>
            <span class="last-read-text">{{ lastFavorite()!.text | slice:0:120 }}…</span>
          </a>
        </div>
      }
    </div>
  `,
  styles: [`
    .home {
      max-width: 600px;
      margin: 0 auto;
      padding: 48px 24px;
    }

    .home-hero {
      text-align: center;
      padding: 48px 0;
    }

    .home-icon {
      width: 64px;
      height: 64px;
      color: var(--accent);
      margin-bottom: 24px;
    }

    h1 {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 8px;
    }

    .home-subtitle {
      font-size: 16px;
      color: var(--text-muted);
      margin: 0 0 32px;
    }

    .home-cta {
      display: inline-block;
      padding: 12px 32px;
      background: var(--accent);
      color: var(--bg-primary);
      border-radius: var(--radius-md);
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      transition: background-color 0.15s ease;
    }

    .home-cta:hover {
      background: var(--accent-hover);
      text-decoration: none;
    }

    .home-section {
      margin-top: 48px;
    }

    h2 {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-secondary);
      margin: 0 0 16px;
    }

    .last-read-card {
      display: block;
      padding: 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      text-decoration: none;
      transition: border-color 0.15s ease;
    }

    .last-read-card:hover {
      border-color: var(--accent);
      text-decoration: none;
    }

    .last-read-ref {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--accent);
      margin-bottom: 4px;
    }

    .last-read-text {
      display: block;
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
    }
  `]
})
export class HomeComponent implements OnInit {
  private favoritesService = inject(FavoritesService);
  lastFavorite = signal<Favorite | null>(null);

  ngOnInit() {
    const favs = this.favoritesService.getAll();
    if (favs.length > 0) {
      this.lastFavorite.set(favs[favs.length - 1]);
    }
  }
}
