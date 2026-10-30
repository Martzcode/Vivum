import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslateService } from '../../services/translate.service';
import { BibleService } from '../../services/bible.service';
import { ClipboardService } from '../../services/clipboard.service';
import { ContextMenuService } from '../../services/context-menu.service';
import { FavoritesService } from '../../services/favorites.service';
import { ProgressService } from '../../services/progress.service';
import type { ContextMenuItem } from '../../components/context-menu';
import type { BookInfo, Chapter, SupportedLocale } from '../../models/bible.model';
import { VERSION_MAP, favoriteId } from '../../models/bible.model';
import { toSearchQuery } from '../../utils/query';

type ReaderState =
  | { status: 'loading' }
  | { status: 'ready'; chapter: Chapter; book: BookInfo }
  | { status: 'error'; messageKey: string };

@Component({
  selector: 'app-reader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="reader">
      @if (state().status === 'loading') {
        <div class="reader-loading" role="status">{{ 'bible.loading' | t }}</div>
      } @else if (state().status === 'error') {
        <div class="reader-error" role="alert">
          <p class="reader-error-text">{{ errorMessageKey() | t }}</p>
          <div class="reader-error-actions">
            <button type="button" class="retry-btn" (click)="reload()">
              {{ 'common.retry' | t }}
            </button>
            <a class="back-link" routerLink="/bible">{{ 'nav.bible' | t }}</a>
          </div>
        </div>
      } @else if (ready(); as data) {
        <div class="reader-header">
          <div class="reader-nav">
            @if (prevChapter(); as prev) {
              <a class="nav-arrow" [routerLink]="['/bible', data.book.id, prev]">←</a>
            } @else {
              <span class="nav-arrow disabled">←</span>
            }
            <div class="reader-title">
              <a class="back-link" [routerLink]="['/bible', data.book.id]">{{ bookName() }}</a>
              <span class="chapter-num">{{ data.chapter.chapter }}</span>
            </div>
            @if (nextChapter(); as next) {
              <a class="nav-arrow" [routerLink]="['/bible', data.book.id, next]">→</a>
            } @else {
              <span class="nav-arrow disabled">→</span>
            }
          </div>
        </div>

        <div class="reader-content" #content (scroll)="onScroll()">
          <div class="reader-verses">
            @for (verse of data.chapter.verses; track verse.verse) {
              <div
                class="verse"
                [id]="'v' + verse.verse"
                [attr.data-verse]="verse.verse"
                [class.is-target]="targetVerse() === verse.verse"
                [class.is-copied]="copiedVerse() === verse.verse">
                <span class="verse-num">{{ verse.verse }}</span>
                <span class="verse-text">{{ verse.text }}</span>
                <div class="verse-actions">
                  <button
                    type="button"
                    class="verse-action"
                    [attr.aria-label]="'bible.copyVerse' | t"
                    [title]="'bible.copyVerse' | t"
                    (click)="copyVerse(verse.verse, verse.text)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="verse-action"
                    [class.is-fav]="favoriteVerses().has(verse.verse)"
                    [attr.aria-pressed]="favoriteVerses().has(verse.verse)"
                    [attr.aria-label]="favoriteVerses().has(verse.verse) ? ('bible.removeFavorite' | t) : ('bible.addFavorite' | t)"
                    [title]="favoriteVerses().has(verse.verse) ? ('bible.removeFavorite' | t) : ('bible.addFavorite' | t)"
                    (click)="toggleFavorite(verse.verse, verse.text)">
                    @if (favoriteVerses().has(verse.verse)) {
                      <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    } @else {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    }
                  </button>
                  @if (copiedVerse() === verse.verse) {
                    <span class="copied" role="status">{{ 'bible.copied' | t }}</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <div class="reader-footer">
          @if (nextChapter(); as next) {
            <a class="next-chapter-btn" [routerLink]="['/bible', data.book.id, next]">
              {{ 'bible.nextChapter' | t }} →
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .reader {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
    }

    .reader-loading {
      margin: auto;
      text-align: center;
      padding: 48px;
      color: var(--text-muted);
      font-size: 14px;
    }

    .reader-error {
      margin: auto;
      max-width: 420px;
      padding: 32px 24px;
      text-align: center;
    }

    .reader-error-text {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0 0 20px;
      line-height: 1.6;
    }

    .reader-error-actions {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .retry-btn {
      padding: 10px 24px;
      background: var(--accent);
      color: var(--bg-primary);
      border-radius: var(--radius-md);
      font-size: 14px;
      font-weight: 600;
      transition: background-color 0.15s ease;
    }

    .retry-btn:hover { background: var(--accent-hover); }

    .reader-header {
      flex: 0 0 auto;
      width: 100%;
      max-width: 700px;
      margin: 0 auto 24px;
      padding: 16px 24px 0;
    }

    .reader-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .nav-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      font-size: 18px;
      font-weight: 700;
      color: var(--accent);
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .nav-arrow:hover:not(.disabled) {
      background: var(--accent);
      color: var(--bg-primary);
      text-decoration: none;
    }

    .nav-arrow.disabled {
      opacity: 0.3;
      pointer-events: none;
    }

    .reader-title {
      text-align: center;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .back-link {
      font-size: 14px;
      color: var(--text-muted);
      text-decoration: none;
    }

    .back-link:hover { color: var(--accent); text-decoration: underline; }

    .chapter-num {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .reader-content {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
    }

    .reader-verses {
      line-height: 1.8;
      width: 100%;
      max-width: 700px;
      margin: 0 auto;
      padding: 0 24px 24px;
    }

    .verse {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 6px 0;
      border-radius: var(--radius-sm);
      transition: background-color 0.15s ease;
      scroll-margin-top: 24px;
    }

    .verse:hover { background: var(--bg-secondary); }

    .verse.is-target {
      background: color-mix(in srgb, var(--accent) 18%, transparent);
      box-shadow: 0 0 0 1px var(--accent);
    }

    .verse-num {
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 700;
      color: var(--accent);
      min-width: 20px;
      text-align: right;
      padding-top: 3px;
    }

    .verse-text {
      flex: 1;
      font-size: 15px;
      color: var(--text-primary);
    }

    .verse-actions {
      display: flex;
      align-items: center;
      gap: 2px;
      opacity: 0;
      transition: opacity 0.15s ease;
      flex-shrink: 0;
    }

    .verse:hover .verse-actions,
    .verse:focus-within .verse-actions,
    .verse.is-copied .verse-actions { opacity: 1; }

    .verse-action {
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
      transition: all 0.1s ease;
    }

    .verse-action svg { width: 14px; height: 14px; }

    .verse-action:hover { background: var(--bg-hover); color: var(--text-primary); }
    .verse-action.is-fav { color: #e25555; }

    .copied {
      font-size: 11px;
      font-weight: 600;
      color: var(--accent);
      white-space: nowrap;
    }

    .reader-footer {
      flex: 0 0 auto;
      width: 100%;
      max-width: 700px;
      margin: 32px auto 0;
      padding: 0 24px 16px;
      text-align: center;
    }

    .next-chapter-btn {
      display: inline-block;
      padding: 10px 24px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      color: var(--accent);
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .next-chapter-btn:hover {
      background: var(--accent);
      color: var(--bg-primary);
      border-color: var(--accent);
      text-decoration: none;
    }
  `],
})
export class ReaderComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bible = inject(BibleService);
  private readonly translate = inject(TranslateService);
  private readonly favorites = inject(FavoritesService);
  private readonly progress = inject(ProgressService);
  private readonly clipboard = inject(ClipboardService);
  private readonly contextMenu = inject(ContextMenuService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  private readonly fragment = toSignal(this.route.fragment, { initialValue: null });
  private readonly locale = this.translate.currentLocale;
  private readonly content = viewChild<ElementRef<HTMLElement>>('content');

  readonly state = signal<ReaderState>({ status: 'loading' });
  readonly targetVerse = signal<number | null>(null);
  readonly copiedVerse = signal<number | null>(null);

  readonly ready = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state : null;
  });

  readonly chapter = computed(() => this.ready()?.chapter ?? null);
  readonly book = computed(() => this.ready()?.book ?? null);
  readonly bookId = computed(() => this.params().get('bookId') ?? '');
  readonly version = computed(() => VERSION_MAP[this.locale()]);

  readonly bookName = computed(() => {
    const book = this.book();
    if (!book) return '';
    const locale = this.locale();
    return book.name[locale] ?? book.name['en'] ?? book.id;
  });

  readonly errorMessageKey = computed(() => {
    const state = this.state();
    return state.status === 'error' ? state.messageKey : '';
  });

  readonly prevChapter = computed(() => {
    const chapter = this.chapter();
    return chapter && chapter.chapter > 1 ? chapter.chapter - 1 : null;
  });

  readonly nextChapter = computed(() => {
    const chapter = this.chapter();
    const book = this.book();
    if (!chapter || !book) return null;
    return chapter.chapter < book.chapters ? chapter.chapter + 1 : null;
  });

  private loadToken = 0;
  private controller?: AbortController;
  private targetTimer?: ReturnType<typeof setTimeout>;
  private scrollTimer?: ReturnType<typeof setTimeout>;
  private copiedTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Recharge le contenu quand le chapitre ou la langue change.
    effect(() => {
      const locale = this.locale();
      const params = this.params();
      void this.load(locale, params.get('bookId') ?? '', Number(params.get('chapter') ?? '1'));
    });

    // Défilement vers un verset ciblé par un fragment (#v12).
    effect(() => {
      const fragment = this.fragment();
      const ready = this.ready();
      if (!fragment || !ready) return;

      const match = /^v(\d+)$/.exec(fragment);
      if (!match) return;

      const verse = Number(match[1]);
      if (!ready.chapter.verses.some(item => item.verse === verse)) return;

      setTimeout(() => this.scrollToVerse(verse), 0);
    });

    this.destroyRef.onDestroy(() => {
      this.controller?.abort();
      clearTimeout(this.targetTimer);
      clearTimeout(this.scrollTimer);
      clearTimeout(this.copiedTimer);
    });

    // Menu contextuel propre au verset (copie, favori, recherche).
    const unregisterMenu = this.contextMenu.register(event => this.buildContextMenu(event));
    this.destroyRef.onDestroy(unregisterMenu);
  }

  reload(): void {
    const params = this.params();
    void this.load(
      this.locale(),
      params.get('bookId') ?? '',
      Number(params.get('chapter') ?? '1'),
    );
  }

  readonly favoriteVerses = computed(() => {
    const ids = this.favorites.ids();
    const chapter = this.chapter();
    const verses = new Set<number>();
    if (!chapter) return verses;

    const version = this.version();
    const bookId = this.bookId();

    for (const verse of chapter.verses) {
      if (ids.has(favoriteId(version, bookId, chapter.chapter, verse.verse))) {
        verses.add(verse.verse);
      }
    }
    return verses;
  });

  toggleFavorite(verse: number, text: string): void {
    const chapter = this.chapter();
    const book = this.book();
    if (!chapter || !book) return;

    const locale = this.locale();
    this.favorites.toggle({
      version: this.version(),
      bookId: this.bookId(),
      chapter: chapter.chapter,
      verse,
      text,
      bookName: book.name[locale] ?? book.name['en'] ?? book.id,
    });
  }

  async copyVerse(verse: number, text: string): Promise<void> {
    if (await this.clipboard.write(text)) this.flashCopied(verse);
  }

  onScroll(): void {
    clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(() => this.trackCurrentVerse(), 350);
  }

  /** Entrées du menu contextuel pour un verset de la page courante. */
  private buildContextMenu(event: MouseEvent): ContextMenuItem[] | null {
    const target = event.target;
    if (!(target instanceof Element)) return null;

    const verseElement = target.closest<HTMLElement>('.verse[data-verse]');
    const data = this.ready();
    if (!verseElement || !data) return null;

    const verseNumber = Number(verseElement.dataset['verse']);
    const verse = data.chapter.verses.find(item => item.verse === verseNumber);
    if (!verse) return null;

    const selection = window.getSelection()?.toString().replace(/\s+/g, ' ').trim() ?? '';
    const favorite = this.favoriteVerses().has(verse.verse);
    const reference = `${this.bookName()} ${data.chapter.chapter}:${verse.verse}`;

    const items: ContextMenuItem[] = [];

    if (selection) {
      items.push({
        label: this.translate.t('context.copySelection'),
        icon: 'copy',
        action: () => this.copyText(selection, verse.verse),
      });
    } else {
      items.push({
        label: this.translate.t('context.copyVerse'),
        icon: 'copy',
        action: () => this.copyVerse(verse.verse, verse.text),
      });
    }

    items.push({
      label: this.translate.t('context.copyReference'),
      icon: 'reference',
      action: () => this.copyText(reference, verse.verse),
    });

    items.push({
      label: favorite
        ? this.translate.t('bible.removeFavorite')
        : this.translate.t('bible.addFavorite'),
      icon: favorite ? 'heart-filled' : 'heart',
      action: () => this.toggleFavorite(verse.verse, verse.text),
    });

    items.push({ separator: true });
    items.push({
      label: this.translate.t('context.searchVerse'),
      icon: 'search',
      action: () => this.search(toSearchQuery(verse.text)),
    });

    return items;
  }

  private async copyText(text: string, verse: number): Promise<void> {
    if (await this.clipboard.write(text)) this.flashCopied(verse);
  }

  private flashCopied(verse: number): void {
    this.copiedVerse.set(verse);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copiedVerse.set(null), 1600);
  }

  private search(query: string): void {
    void this.router.navigate(['/search'], { queryParams: { q: query } });
  }

  private async load(
    locale: SupportedLocale,
    bookId: string,
    chapterNumber: number,
  ): Promise<void> {
    const token = ++this.loadToken;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;

    this.state.set({ status: 'loading' });

    try {
      const books = await this.bible.getBooks();
      if (token !== this.loadToken) return;

      const book = books.find(item => item.id === bookId);
      if (!book) {
        this.state.set({ status: 'error', messageKey: 'bible.bookNotFound' });
        return;
      }

      if (
        !Number.isInteger(chapterNumber) ||
        chapterNumber < 1 ||
        chapterNumber > book.chapters
      ) {
        this.state.set({ status: 'error', messageKey: 'bible.chapterNotFound' });
        return;
      }

      const chapter = await this.bible.getChapter(
        locale,
        bookId,
        chapterNumber,
        controller.signal,
      );
      if (token !== this.loadToken) return;

      this.state.set({ status: 'ready', chapter, book });
      this.progress.save({
        version: VERSION_MAP[locale],
        bookId,
        bookName: book.name[locale] ?? book.name['en'] ?? book.id,
        chapter: chapterNumber,
      });

      if (!this.fragment()) this.scrollToTop();
    } catch (error) {
      if (token !== this.loadToken || isAbortError(error)) return;
      this.state.set({ status: 'error', messageKey: 'bible.loadError' });
    }
  }

  private scrollToTop(): void {
    setTimeout(() => this.content()?.nativeElement.scrollTo({ top: 0 }), 0);
  }

  private scrollToVerse(verse: number): void {
    const container = this.content()?.nativeElement;
    if (!container) return;

    const element = container.querySelector<HTMLElement>(`#v${verse}`);
    if (!element) return;

    element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    this.targetVerse.set(verse);
    clearTimeout(this.targetTimer);
    this.targetTimer = setTimeout(() => this.targetVerse.set(null), 2500);
  }

  private trackCurrentVerse(): void {
    const ready = this.ready();
    const container = this.content()?.nativeElement;
    if (!ready || !container) return;

    const threshold = container.getBoundingClientRect().top + 48;
    let current = 1;

    for (const element of Array.from(container.querySelectorAll<HTMLElement>('.verse'))) {
      if (element.getBoundingClientRect().top > threshold) break;
      current = Number(element.id.slice(1));
    }

    this.progress.updateVerse(current);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
