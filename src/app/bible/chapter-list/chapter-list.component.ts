import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslateService } from '../../services/translate.service';
import { BibleService } from '../../services/bible.service';
import type { SupportedLocale } from '../../models/bible.model';

type ChapterListState =
  | { status: 'loading' }
  | { status: 'ready'; bookId: string; bookName: string; chapters: number[] }
  | { status: 'error'; messageKey: string };

@Component({
  selector: 'app-chapter-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="chapter-list">
      @if (state().status === 'loading') {
        <div class="state" role="status">{{ 'bible.loading' | t }}</div>
      } @else if (state().status === 'error') {
        <div class="state error" role="alert">
          <p>{{ errorMessageKey() | t }}</p>
          <button type="button" class="retry-btn" (click)="reload()">
            {{ 'common.retry' | t }}
          </button>
          <a class="back-link" routerLink="/bible">← {{ 'nav.bible' | t }}</a>
        </div>
      } @else if (ready(); as data) {
        <div class="chapter-header">
          <a class="back-link" routerLink="/bible">← {{ 'nav.bible' | t }}</a>
          <h1>{{ data.bookName }}</h1>
        </div>
        <div class="chapter-grid">
          @for (ch of data.chapters; track ch) {
            <a class="chapter-card" [routerLink]="['/bible', data.bookId, ch]">
              {{ ch }}
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .chapter-list {
      max-width: 600px;
      margin: 0 auto;
      padding: 24px;
    }

    .state {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-muted);
      font-size: 14px;
    }

    .state.error p {
      color: var(--text-secondary);
      margin: 0 0 16px;
      line-height: 1.6;
    }

    .retry-btn {
      display: inline-block;
      padding: 9px 22px;
      margin-bottom: 16px;
      background: var(--accent);
      color: var(--bg-primary);
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 600;
    }

    .retry-btn:hover { background: var(--accent-hover); }

    .chapter-header {
      margin-bottom: 24px;
    }

    .back-link {
      display: inline-block;
      font-size: 13px;
      color: var(--accent);
      text-decoration: none;
      margin-bottom: 8px;
    }

    .back-link:hover { text-decoration: underline; }

    h1 {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .chapter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
      gap: 8px;
    }

    .chapter-card {
      display: flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 1;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .chapter-card:hover {
      border-color: var(--accent);
      background: var(--accent);
      color: var(--bg-primary);
      text-decoration: none;
    }
  `],
})
export class ChapterListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly bible = inject(BibleService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  private readonly locale = this.translate.currentLocale;
  private readonly bookId = computed(() => this.params().get('bookId') ?? '');

  readonly state = signal<ChapterListState>({ status: 'loading' });

  readonly ready = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state : null;
  });

  readonly errorMessageKey = computed(() => {
    const state = this.state();
    return state.status === 'error' ? state.messageKey : '';
  });

  private loadToken = 0;

  constructor() {
    effect(() => {
      const bookId = this.bookId();
      const locale = this.locale();
      void this.load(bookId, locale);
    });
    this.destroyRef.onDestroy(() => {
      this.loadToken++;
    });
  }

  reload(): void {
    void this.load(this.bookId(), this.locale());
  }

  private async load(bookId: string, locale: SupportedLocale): Promise<void> {
    const token = ++this.loadToken;
    this.state.set({ status: 'loading' });

    try {
      const books = await this.bible.getBooks();
      if (token !== this.loadToken) return;

      const book = books.find(item => item.id === bookId);
      if (!book) {
        this.state.set({ status: 'error', messageKey: 'bible.bookNotFound' });
        return;
      }

      this.state.set({
        status: 'ready',
        bookId: book.id,
        bookName: book.name[locale] ?? book.name['en'] ?? book.id,
        chapters: Array.from({ length: book.chapters }, (_, index) => index + 1),
      });
    } catch {
      if (token !== this.loadToken) return;
      this.state.set({ status: 'error', messageKey: 'bible.loadError' });
    }
  }
}
