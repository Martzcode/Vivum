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
import { ExternalService } from '../../services/external.service';

const SOURCE_URL = 'https://www.openbible.info/topics/';

/**
 * Encart « verset du jour » de l'accueil.
 *
 * Le passage vient du pool embarqué, la sélection est déterministe et le
 * thème choisi est mémorisé localement. Aucun appel réseau.
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
              <button
                type="button"
                class="daily-btn"
                [attr.aria-label]="'dailyVerse.copy' | t"
                [title]="'dailyVerse.copy' | t"
                (click)="copyPassage(passage.text, passage.reference)">
                @if (copied()) {
                  {{ 'dailyVerse.copied' | t }}
                } @else {
                  {{ 'dailyVerse.copy' | t }}
                }
              </button>
              <a
                class="daily-btn daily-btn-primary"
                [routerLink]="['/bible', passage.bookId, passage.chapter]"
                [fragment]="'v' + passage.startVerse">
                {{ 'dailyVerse.read' | t }}
              </a>
            </div>
          </div>

          <p class="daily-attribution">
            <a [href]="sourceUrl" (click)="openSource($event)">{{ 'dailyVerse.attribution' | t }}</a>
          </p>
        </article>
      }

      @if (themes().length > 1) {
        <div class="daily-theme-row">
          <label for="daily-theme-select">{{ 'dailyVerse.theme' | t }}</label>
          <select
            id="daily-theme-select"
            class="daily-select"
            [value]="theme()"
            (change)="onThemeChange($event)">
            @for (option of themeOptions(); track option) {
              <option [value]="option" [selected]="option === theme()">
                {{ option === 'all' ? ('dailyVerse.allThemes' | t) : themeName(option) }}
              </option>
            }
          </select>
        </div>
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
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      background: var(--bg-primary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .daily-btn:hover {
      color: var(--text-primary);
      border-color: var(--border-dark);
      text-decoration: none;
    }

    .daily-btn-primary {
      color: var(--bg-primary);
      background: var(--accent);
      border-color: var(--accent);
    }

    .daily-btn-primary:hover {
      color: var(--bg-primary);
      background: var(--accent-hover);
      border-color: var(--accent-hover);
    }

    .daily-theme-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .daily-select {
      padding: 4px 8px;
      font-size: 12px;
      color: var(--text-primary);
      background: var(--bg-primary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
    }

    .daily-select:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
    }

    .daily-attribution {
      margin: 14px 0 0;
      font-size: 11px;
      color: var(--text-muted);
    }

    .daily-attribution a { color: var(--text-muted); }

    .daily-attribution a:hover { color: var(--accent); }
  `],
})
export class DailyVerseComponent {
  private readonly daily = inject(DailyVerseService);
  private readonly translate = inject(TranslateService);
  private readonly clipboard = inject(ClipboardService);
  private readonly external = inject(ExternalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly sourceUrl = SOURCE_URL;
  readonly state = this.daily.state;
  readonly reading = this.daily.reading;
  readonly themes = this.daily.themes;
  readonly theme = this.daily.theme;
  readonly themeOptions = this.daily.themeOptions;
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

  onThemeChange(event: Event): void {
    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) return;
    this.daily.setTheme(select.value);
  }

  reload(): void {
    void this.daily.reload();
  }

  async copyPassage(text: string, reference: string): Promise<void> {
    if (!(await this.clipboard.write(`${text} (${reference})`))) return;

    this.copied.set(true);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(false), 1600);
  }

  openSource(event: Event): void {
    event.preventDefault();
    void this.external.open(this.sourceUrl);
  }
}
