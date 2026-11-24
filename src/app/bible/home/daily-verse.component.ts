import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslateService } from '../../services/translate.service';
import { DailyVerseService } from '../../services/daily-verse.service';
import { ClipboardService } from '../../services/clipboard.service';
import { ShareCardService } from '../../services/share-card.service';
import { VERSION_LABELS, VERSION_MAP } from '../../models/bible.model';

/**
 * Encart « verset du jour » de l'accueil.
 *
 * Le passage vient du pool embarqué et la sélection est déterministe.
 * Aucun appel réseau.
 */
@Component({
  selector: 'app-daily-verse',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="daily" aria-labelledby="daily-verse-title">
      <div class="daily-head">
        <h2 id="daily-verse-title">{{ 'dailyVerse.title' | t }}</h2>
        <span class="daily-date">{{ dateLabel() }}</span>
      </div>

      @if (state().status === 'loading') {
        <div class="daily-card daily-placeholder" role="status">
          {{ 'dailyVerse.loading' | t }}
        </div>
      } @else if (state().status === 'error') {
        <div class="daily-card daily-error" role="alert">
          <p>{{ 'dailyVerse.error' | t }}</p>
          <button type="button" class="daily-btn" (click)="reload()">
            {{ 'common.retry' | t }}
          </button>
        </div>
      } @else if (reading(); as passage) {
        <article class="daily-card">
          <span class="daily-theme">{{ themeLabel() }}</span>

          <blockquote class="daily-text">
            @for (verse of passage.verses; track verse.verse) {
              <span class="daily-verse">
                <sup class="daily-verse-num">{{ verse.verse }}</sup>{{ verse.text }}
              </span>
            }
          </blockquote>

          <div class="daily-foot">
            <a class="daily-ref" [routerLink]="['/bible', passage.bookId, passage.chapter]">
              {{ passage.reference }}
            </a>

            <div class="daily-actions">
              <span
                class="daily-action-wrap"
                [attr.data-tooltip]="copied() ? ('dailyVerse.copied' | t) : ('dailyVerse.copy' | t)">
                <button
                  type="button"
                  class="daily-icon-btn"
                  [attr.aria-label]="'dailyVerse.copy' | t"
                  (click)="copyPassage(passage.text, passage.reference)">
                  @if (copied()) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5"/>
                    </svg>
                  } @else {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <rect x="8" y="8" width="14" height="14" rx="2"/>
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                    </svg>
                  }
                </button>
              </span>

              <span class="daily-action-wrap" [attr.data-tooltip]="'bible.createImage' | t">
                <button
                  type="button"
                  class="daily-icon-btn"
                  [attr.aria-label]="'bible.createImage' | t"
                  (click)="shareImage(passage.text, passage.reference)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                </button>
              </span>

              <span class="daily-action-wrap" [attr.data-tooltip]="'dailyVerse.read' | t">
                <a
                  class="daily-icon-btn daily-icon-btn-primary"
                  [routerLink]="['/bible', passage.bookId, passage.chapter]"
                  [fragment]="'v' + passage.startVerse"
                  [attr.aria-label]="'dailyVerse.read' | t">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M12 7v14"/>
                    <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>
                  </svg>
                </a>
              </span>
            </div>
          </div>
        </article>
      }
    </section>
  `,
  styles: [`
    .daily {
      max-width: 600px;
      margin: 8px auto 0;
      padding: 0;
    }

    .daily-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    h2 {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-secondary);
      margin: 0;
    }

    .daily-date {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: capitalize;
    }

    .daily-card {
      padding: 20px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-left: 3px solid var(--accent);
      border-radius: var(--radius-lg);
    }

    .daily-placeholder,
    .daily-error {
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.6;
    }

    .daily-error p { margin: 0 0 12px; }

    .daily-theme {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--accent) 14%, transparent);
      color: var(--accent);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .daily-text {
      margin: 12px 0 16px;
      font-size: 16px;
      line-height: 1.75;
      color: var(--text-primary);
    }

    .daily-verse + .daily-verse { margin-left: 0.25em; }

    .daily-verse-num {
      margin-right: 3px;
      font-size: 9px;
      font-weight: 700;
      color: var(--accent);
      vertical-align: super;
    }

    .daily-foot {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .daily-ref {
      font-size: 13px;
      font-weight: 600;
      color: var(--accent);
    }

    .daily-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .daily-btn {
      display: inline-block;
      margin-top: 4px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      background: var(--bg-primary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .daily-btn:hover {
      color: var(--text-primary);
      border-color: var(--border-dark);
      text-decoration: none;
    }

    .daily-action-wrap {
      position: relative;
      display: inline-flex;
    }

    .daily-action-wrap::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: calc(100% + 7px);
      left: 50%;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      background: var(--text-primary);
      color: var(--on-accent);
      font-size: 11px;
      font-weight: 500;
      line-height: 1.2;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transform: translate(-50%, 2px);
      transition: opacity 0.12s ease, transform 0.12s ease;
      z-index: 2;
    }

    .daily-action-wrap:hover::after,
    .daily-action-wrap:focus-within::after {
      opacity: 1;
      transform: translate(-50%, 0);
    }

    .daily-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      color: var(--text-secondary);
      background: var(--bg-primary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .daily-icon-btn:hover {
      color: var(--text-primary);
      border-color: var(--border-dark);
      text-decoration: none;
    }

    .daily-icon-btn svg {
      width: 16px;
      height: 16px;
    }

    .daily-icon-btn-primary {
      color: var(--on-accent);
      background: var(--accent);
      border-color: var(--accent);
    }

    .daily-icon-btn-primary:hover {
      color: var(--on-accent);
      background: var(--accent-hover);
      border-color: var(--accent-hover);
    }
  `],
})
export class DailyVerseComponent {
  private readonly daily = inject(DailyVerseService);
  private readonly translate = inject(TranslateService);
  private readonly clipboard = inject(ClipboardService);
  private readonly shareCard = inject(ShareCardService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = this.daily.state;
  readonly reading = this.daily.reading;
  readonly copied = signal(false);

  private copiedTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.copiedTimer));
  }

  /** Date localisée, recalculée quand la langue ou le jour change. */
  readonly dateLabel = computed(() => {
    const key = this.daily.dayKey();
    const [year, month, day] = key.split('-').map(Number);
    return new Intl.DateTimeFormat(this.translate.uiLocale(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(year, month - 1, day));
  });

  readonly themeLabel = computed(() => {
    const reading = this.reading();
    return reading ? this.themeName(reading.theme) : '';
  });

  themeName(theme: string): string {
    return this.translate.t(`dailyVerse.themes.${theme}`);
  }

  reload(): void {
    void this.daily.reload();
  }

  /** Ouvre le dialogue de création d'image avec le passage du jour. */
  shareImage(text: string, reference: string): void {
    this.shareCard.open({
      text,
      reference,
      versionLabel: VERSION_LABELS[VERSION_MAP[this.translate.currentLocale()]],
    });
  }

  async copyPassage(text: string, reference: string): Promise<void> {
    if (!(await this.clipboard.write(`${text} (${reference})`))) return;

    this.copied.set(true);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(false), 1600);
  }
}
