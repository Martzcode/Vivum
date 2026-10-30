import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../pipes/translate.pipe';
import { TranslateService } from '../services/translate.service';
import { BibleService } from '../services/bible.service';
import { ClipboardService } from '../services/clipboard.service';
import { ContextMenuService } from '../services/context-menu.service';
import type { ContextMenuItem } from '../components/context-menu';
import type { SearchResult, SupportedLocale } from '../models/bible.model';

type SearchRow = SearchResult & { id: string };

@Component({
  selector: 'app-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, TranslatePipe],
  template: `
    <div class="search-page">
      <div class="search-box">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="search"
          class="search-input-lg"
          [placeholder]="'search.placeholder' | t"
          [(ngModel)]="query"
          (keydown.enter)="doSearch()"
          [attr.aria-label]="'search.placeholder' | t">
      </div>

      @if (copied()) {
        <p class="copy-status" role="status">{{ 'context.copied' | t }}</p>
      }

      @if (searching()) {
        <div class="search-loading" role="status">{{ 'bible.loading' | t }}</div>
      } @else if (error()) {
        <div class="search-empty" role="alert">
          <p>{{ 'search.error' | t }}</p>
          <button type="button" class="retry-btn" (click)="doSearch()">
            {{ 'common.retry' | t }}
          </button>
        </div>
      } @else if (results().length > 0) {
        <div class="search-info" aria-live="polite">
          {{ 'search.resultsCount' | t : { count: results().length } }}
        </div>
        <div class="search-results">
          @for (r of results(); track r.id) {
            <a class="result-card" [attr.data-result-id]="r.id" [routerLink]="['/bible', r.bookId, r.chapter]" [fragment]="'v' + r.verse">
              <div class="result-ref">{{ r.bookName }} {{ r.chapter }}:{{ r.verse }}</div>
              <div class="result-text">{{ r.before }}<mark>{{ r.match }}</mark>{{ r.after }}</div>
            </a>
          }
        </div>
      } @else if (hasSearched()) {
        <div class="search-empty">{{ 'search.noResults' | t }}</div>
      }
    </div>
  `,
  styles: [`
    .search-page { max-width: 700px; margin: 0 auto; padding: 24px; }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      margin-bottom: 24px;
    }

    .search-icon { width: 20px; height: 20px; color: var(--text-muted); flex-shrink: 0; }

    .search-input-lg {
      flex: 1;
      border: none;
      background: none;
      font-size: 15px;
      color: var(--text-primary);
      outline: none;
    }

    .search-input-lg::placeholder { color: var(--text-muted); }

    .search-loading, .search-empty {
      text-align: center;
      padding: 48px;
      color: var(--text-muted);
      font-size: 14px;
    }

    .search-empty p {
      color: var(--text-secondary);
      margin: 0 0 16px;
      line-height: 1.6;
    }

    .retry-btn {
      padding: 9px 22px;
      background: var(--accent);
      color: var(--bg-primary);
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 600;
    }

    .retry-btn:hover { background: var(--accent-hover); }

    .search-info {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 16px;
    }

    .copy-status {
      margin: -12px 0 16px;
      font-size: 12px;
      font-weight: 600;
      color: var(--accent);
      text-align: right;
    }

    .search-results { display: flex; flex-direction: column; gap: 8px; }

    .result-card {
      display: block;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      text-decoration: none;
      transition: border-color 0.15s ease;
    }

    .result-card:hover { border-color: var(--accent); text-decoration: none; }

    .result-ref {
      font-size: 13px;
      font-weight: 600;
      color: var(--accent);
      margin-bottom: 4px;
    }

    .result-text {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    mark {
      background: color-mix(in srgb, var(--accent) 28%, transparent);
      color: var(--text-primary);
      border-radius: 2px;
      padding: 0 1px;
    }
  `],
})
export class SearchComponent {
  private readonly bible = inject(BibleService);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly clipboard = inject(ClipboardService);
  private readonly contextMenu = inject(ContextMenuService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly queryParams = toSignal(this.route.queryParams, {
    initialValue: {} as Record<string, string>,
  });

  query = '';
  readonly results = signal<SearchRow[]>([]);
  readonly searching = signal(false);
  readonly hasSearched = signal(false);
  readonly error = signal(false);
  readonly copied = signal(false);
  private readonly activeQuery = signal('');

  private controller?: AbortController;
  private searchToken = 0;
  private copiedTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Relance la recherche quand la langue change.
    effect(() => {
      const locale = this.translate.currentLocale();
      const activeQuery = this.activeQuery();
      if (!activeQuery) return;
      void this.runSearch(locale, activeQuery);
    });

    // Recherche provenant de la barre de titre (?q=…).
    effect(() => {
      const q = this.queryParams()['q'];
      if (typeof q !== 'string' || !q || q === this.query.trim()) return;
      this.query = q;
      this.startSearch(q);
    });

    this.destroyRef.onDestroy(() => {
      this.controller?.abort();
      clearTimeout(this.copiedTimer);
    });

    const unregisterMenu = this.contextMenu.register(event => this.buildContextMenu(event));
    this.destroyRef.onDestroy(unregisterMenu);
  }

  /** Entrées du menu contextuel pour un résultat de recherche. */
  private buildContextMenu(event: MouseEvent): ContextMenuItem[] | null {
    const target = event.target;
    if (!(target instanceof Element)) return null;

    const card = target.closest<HTMLElement>('[data-result-id]');
    if (!card) return null;

    const result = this.results().find(item => item.id === card.dataset['resultId']);
    if (!result) return null;

    const reference = `${result.bookName} ${result.chapter}:${result.verse}`;
    const selection = window.getSelection()?.toString().replace(/\s+/g, ' ').trim() ?? '';

    return [
      selection
        ? {
            label: this.translate.t('context.copySelection'),
            icon: 'copy',
            action: () => this.copy(selection),
          }
        : {
            label: this.translate.t('context.copyVerse'),
            icon: 'copy',
            action: () => this.copy(result.text),
          },
      {
        label: this.translate.t('context.copyReference'),
        icon: 'reference',
        action: () => this.copy(reference),
      },
      { separator: true },
      {
        label: this.translate.t('context.openVerse'),
        icon: 'open',
        action: () =>
          this.router.navigate(['/bible', result.bookId, result.chapter], {
            fragment: `v${result.verse}`,
          }),
      },
    ];
  }

  private async copy(text: string): Promise<void> {
    if (!(await this.clipboard.write(text))) return;

    this.copied.set(true);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(false), 2000);
  }

  doSearch(): void {
    const query = this.query.trim();
    if (!query) {
      this.activeQuery.set('');
      this.results.set([]);
      this.hasSearched.set(false);
      this.error.set(false);
      return;
    }
    this.startSearch(query);
  }

  private startSearch(query: string): void {
    this.hasSearched.set(true);

    if (this.activeQuery() === query) {
      void this.runSearch(this.translate.currentLocale(), query);
      return;
    }
    this.activeQuery.set(query);
  }

  private async runSearch(locale: SupportedLocale, query: string): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const token = ++this.searchToken;

    this.searching.set(true);
    this.error.set(false);

    try {
      const raw = await this.bible.search(locale, query, controller.signal);
      if (token !== this.searchToken) return;

      this.results.set(
        raw.map((result, index) => ({
          ...result,
          id: `${result.bookId}:${result.chapter}:${result.verse}:${index}`,
        })),
      );
    } catch (error) {
      if (token !== this.searchToken || isAbortError(error)) return;
      this.results.set([]);
      this.error.set(true);
    } finally {
      if (token === this.searchToken) this.searching.set(false);
    }
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
