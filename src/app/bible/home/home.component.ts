import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { FavoritesService } from '../../services/favorites.service';
import { ProgressService } from '../../services/progress.service';
import { DailyVerseComponent } from './daily-verse.component';
import type { ReadingPosition } from '../../models/bible.model';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe, SlicePipe, DailyVerseComponent],
  template: `
    <div class="home">
      <div class="home-hero">
        <svg class="home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          <path d="M8 7h8"/>
          <path d="M8 11h8"/>
          <path d="M8 15h5"/>
        </svg>
        <h1>{{ 'home.welcome' | t }}</h1>
        <p class="home-subtitle">{{ 'home.subtitle' | t }}</p>

        @if (current(); as position) {
          <a
            class="home-cta"
            [routerLink]="['/bible', position.bookId, position.chapter]"
            [fragment]="fragmentFor(position)">
            {{ 'home.continue' | t }}
          </a>
        } @else {
          <a class="home-cta" routerLink="/bible">{{ 'home.startReading' | t }}</a>
        }
      </div>

      <app-daily-verse />

      @if (recent().length > 0) {
        <div class="home-section">
          <h2>{{ 'home.recentlyRead' | t }}</h2>
          <div class="home-list">
            @for (position of recent(); track position.version + ':' + position.bookId) {
              <a
                class="recent-card"
                [routerLink]="['/bible', position.bookId, position.chapter]"
                [fragment]="fragmentFor(position)">
                <span class="recent-ref">{{ reference(position) }}</span>
              </a>
            }
          </div>
        </div>
      }

      @if (lastFavorite(); as favorite) {
        <div class="home-section">
          <h2>{{ 'home.lastFavorite' | t }}</h2>
          <a
            class="last-read-card"
            [routerLink]="['/bible', favorite.bookId, favorite.chapter]"
            [fragment]="'v' + favorite.verse">
            <span class="last-read-ref">
              {{ favorite.bookName }} {{ favorite.chapter }}:{{ favorite.verse }}
            </span>
            <span class="last-read-text">{{ favorite.text | slice:0:120 }}…</span>
          </a>
        </div>
      }
    </div>
  `,
  styles: [`
    .home {
      max-width: 600px;
      margin: 0 auto;
      padding: 24px 24px 40px;
    }

    .home-hero {
      text-align: center;
      padding: 8px 0 24px;
    }

    .home-icon {
      width: 44px;
      height: 44px;
      color: var(--accent);
      margin-bottom: 12px;
    }

    h1 {
      font-size: 26px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 4px;
    }

    .home-subtitle {
      font-size: 15px;
      color: var(--text-muted);
      margin: 0 0 20px;
    }

    .home-cta {
      display: inline-block;
      padding: 10px 26px;
      background: var(--accent);
      color: var(--bg-primary);
      border-radius: var(--radius-md);
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: background-color 0.15s ease;
    }

    .home-cta:hover {
      background: var(--accent-hover);
      text-decoration: none;
    }

    .home-section {
      margin-top: 28px;
    }

    h2 {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-secondary);
      margin: 0 0 12px;
    }

    .home-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .recent-card {
      display: block;
      padding: 10px 14px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      text-decoration: none;
      transition: border-color 0.15s ease;
    }

    .recent-card:hover {
      border-color: var(--accent);
      text-decoration: none;
    }

    .recent-ref {
      font-size: 13px;
      font-weight: 600;
      color: var(--accent);
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
  `],
})
export class HomeComponent {
  private readonly favorites = inject(FavoritesService);
  private readonly progress = inject(ProgressService);

  readonly current = this.progress.current;
  readonly recent = computed(() => this.progress.recent().slice(0, 5));
  readonly lastFavorite = computed(() => this.favorites.favorites().at(-1) ?? null);

  fragmentFor(position: ReadingPosition): string | undefined {
    return position.verse ? `v${position.verse}` : undefined;
  }

  reference(position: ReadingPosition): string {
    return `${position.bookName} ${position.chapter}${position.verse ? `:${position.verse}` : ''}`;
  }
}
