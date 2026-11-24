import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { FavoritesService } from '../../services/favorites.service';
import { ProgressService } from '../../services/progress.service';
import { PlanService } from '../../services/plan.service';
import { TranslateService } from '../../services/translate.service';
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
        <div class="home-intro">
          <svg class="home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M12 7v14"/>
            <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>
          </svg>
          <h1>{{ 'home.welcome' | t }}</h1>
          <p class="home-subtitle">{{ 'home.subtitle' | t }}</p>
        </div>

        <div class="home-actions">
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
          @if (!plan()) {
            <a class="home-cta secondary" routerLink="/plans">{{ 'plans.invite' | t }}</a>
          }
        </div>
      </div>

      @if (plan(); as active) {
        <div class="home-section plan-card">
          <div class="plan-head">
            <h2>{{ planTitle() }}</h2>
            <a class="plan-all" routerLink="/plans">{{ 'plans.title' | t }}</a>
          </div>
          <div class="plan-bar" role="progressbar" [attr.aria-valuenow]="active.percent" aria-valuemin="0" aria-valuemax="100">
            <div class="plan-bar-fill" [style.width.%]="active.percent"></div>
          </div>
          @if (active.currentDayIndex !== null && active.next) {
            <p class="plan-meta">
              {{ 'plans.dayOf' | t: { n: active.currentDayIndex + 1, total: active.totalDays } }}
              · {{ active.percent }} %
            </p>
            <a class="plan-cta" [routerLink]="['/bible', active.next.bookId, active.next.chapter]">
              {{ 'plans.todayReading' | t }}
            </a>
          } @else {
            <p class="plan-meta">{{ 'plans.completed' | t }}</p>
          }
        </div>
      }

      <app-daily-verse />

      @if (recent().length > 0) {
        <div class="home-section">
          <div class="section-head">
            <h2>{{ 'home.recentlyRead' | t }}</h2>
            <button
              type="button"
              class="clear-btn"
              [attr.aria-label]="'home.clearRecent' | t"
              [attr.title]="'home.clearRecent' | t"
              (click)="clearRecent()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6h18"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <path d="M10 11v6"/>
                <path d="M14 11v6"/>
              </svg>
            </button>
          </div>
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
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 20px 24px;
      padding: 8px 0 24px;
    }

    .home-intro {
      flex: 1 1 260px;
      text-align: left;
    }

    .home-actions {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
      flex: 0 0 auto;
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
      margin: 0;
    }

    .home-cta {
      display: block;
      text-align: center;
      padding: 10px 26px;
      background: var(--accent);
      color: var(--on-accent);
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

    .home-cta.secondary {
      background: var(--bg-tertiary);
      color: var(--accent);
      box-shadow: inset 0 0 0 1px var(--accent-light);
    }

    .home-cta.secondary:hover {
      background: var(--bg-hover);
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

    .plan-card {
      margin-top: 0;
      margin-bottom: 20px;
      padding: 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
    }

    .plan-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    .plan-head h2 { margin: 0; }

    .plan-all {
      font-size: 12px;
      color: var(--text-muted);
    }

    .plan-bar {
      height: 6px;
      background: var(--bg-tertiary);
      border-radius: 999px;
      overflow: hidden;
    }

    .plan-bar-fill {
      height: 100%;
      background: var(--accent);
      border-radius: 999px;
      transition: width 0.3s ease;
    }

    .plan-meta {
      font-size: 13px;
      color: var(--text-muted);
      margin: 8px 0 10px;
    }

    .plan-cta {
      display: inline-block;
      padding: 7px 18px;
      background: var(--accent);
      color: var(--on-accent);
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
    }

    .plan-cta:hover {
      background: var(--accent-hover);
      text-decoration: none;
    }

    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .section-head h2 { margin: 0; }

    .clear-btn {
      display: inline-flex;
      padding: 6px;
      background: none;
      border: none;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      cursor: pointer;
    }

    .clear-btn svg { width: 16px; height: 16px; }

    .clear-btn:hover {
      background: var(--bg-tertiary);
      color: var(--danger);
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
  private readonly plans = inject(PlanService);
  private readonly translate = inject(TranslateService);

  readonly plan = this.plans.active;

  readonly planTitle = computed(() => {
    const plan = this.plan();
    if (!plan) return '';
    if (plan.custom) {
      const book = this.plans.books().find(item => item.id === plan.custom?.bookId);
      const locale = this.translate.currentLocale();
      return this.translate.t('plans.custom.name', {
        book: book?.name[locale] ?? book?.name['en'] ?? plan.custom.bookId,
      });
    }
    return this.translate.t(`plans.catalog.${plan.id}.title`);
  });

  readonly current = this.progress.current;
  readonly recent = computed(() => this.progress.recent().slice(0, 5));
  readonly lastFavorite = computed(() => this.favorites.favorites().at(-1) ?? null);

  /** Vide uniquement la liste ; la position courante et les plans restent intacts. */
  clearRecent(): void {
    this.progress.clearRecent();
  }

  fragmentFor(position: ReadingPosition): string | undefined {
    return position.verse ? `v${position.verse}` : undefined;
  }

  reference(position: ReadingPosition): string {
    return `${position.bookName} ${position.chapter}${position.verse ? `:${position.verse}` : ''}`;
  }
}
