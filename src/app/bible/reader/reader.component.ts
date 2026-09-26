import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslateService } from '../../services/translate.service';
import { BibleService } from '../../services/bible.service';
import { FavoritesService } from '../../services/favorites.service';
import type { Chapter } from '../../models/bible.model';

@Component({
  selector: 'app-reader',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="reader">
      @if (loading()) {
        <div class="reader-loading">{{ 'bible.loading' | t }}</div>
      } @else if (chapter()) {
        <div class="reader-header">
          <div class="reader-nav">
            @if (prevChapter()) {
              <a class="nav-arrow" [routerLink]="['/bible', bookId(), prevChapter()]">←</a>
            } @else {
              <span class="nav-arrow disabled">←</span>
            }
            <div class="reader-title">
              <a class="back-link" [routerLink]="['/bible', bookId()]">{{ bookName() }}</a>
              <span class="chapter-num">{{ chapter()!.chapter }}</span>
            </div>
            @if (nextChapter()) {
              <a class="nav-arrow" [routerLink]="['/bible', bookId(), nextChapter()]">→</a>
            } @else {
              <span class="nav-arrow disabled">→</span>
            }
          </div>
        </div>

        <div class="reader-content">
          <div class="reader-verses">
            @for (verse of chapter()!.verses; track verse.verse) {
              <div class="verse">
                <span class="verse-num">{{ verse.verse }}</span>
                <span class="verse-text">{{ verse.text }}</span>
                <div class="verse-actions">
                  <button
                    class="verse-action"
                    [title]="'bible.copyVerse' | t"
                    (click)="copyVerse(verse.text)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </button>
                  <button
                    class="verse-action"
                    [class.is-fav]="isFavorite(verse.verse)"
                    [title]="isFavorite(verse.verse) ? ('bible.removeFavorite' | t) : ('bible.addFavorite' | t)"
                    (click)="toggleFavorite(verse.verse, verse.text)">
                    @if (isFavorite(verse.verse)) {
                      <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    } @else {
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                    }
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="reader-footer">
          @if (nextChapter()) {
            <a class="next-chapter-btn" [routerLink]="['/bible', bookId(), nextChapter()]">
              {{ 'bible.chapters' | t }} →
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
    }

    .verse:hover { background: var(--bg-secondary); }

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
      gap: 2px;
      opacity: 0;
      transition: opacity 0.15s ease;
      flex-shrink: 0;
    }

    .verse:hover .verse-actions { opacity: 1; }

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
  `]
})
export class ReaderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private bibleService = inject(BibleService);
  private translate = inject(TranslateService);
  private favoritesService = inject(FavoritesService);

  bookId = signal('');
  bookName = signal('');
  chapter = signal<Chapter | null>(null);
  loading = signal(true);
  prevChapter = signal<number | null>(null);
  nextChapter = signal<number | null>(null);
  totalChapters = signal(0);

  async ngOnInit() {
    this.route.paramMap.subscribe(async params => {
      const bookId = params.get('bookId') || '';
      const chapterNum = parseInt(params.get('chapter') || '1', 10);
      this.bookId.set(bookId);

      const books = await this.bibleService.getBooks(this.translate.currentLocale());
      const book = books.find(b => b.id === bookId);
      if (book) {
        const locale = this.translate.currentLocale();
        this.bookName.set(book.name[locale] || book.name['en'] || book.id);
        this.totalChapters.set(book.chapters);
        this.prevChapter.set(chapterNum > 1 ? chapterNum - 1 : null);
        this.nextChapter.set(chapterNum < book.chapters ? chapterNum + 1 : null);
      }

      this.loading.set(true);
      const data = await this.bibleService.getChapter(this.translate.currentLocale(), bookId, chapterNum);
      this.chapter.set(data);
      this.loading.set(false);
    });
  }

  isFavorite(verse: number): boolean {
    return this.favoritesService.isFavorite(this.bookId(), this.chapter()?.chapter || 0, verse);
  }

  toggleFavorite(verse: number, text: string) {
    const ch = this.chapter();
    if (!ch) return;
    const books = this.bibleService.getBooks(this.translate.currentLocale());
    this.favoritesService.toggle({
      bookId: this.bookId(),
      chapter: ch.chapter,
      verse,
      text,
      bookName: this.bookName(),
      version: this.translate.currentLocale(),
    });
  }

  copyVerse(text: string) {
    navigator.clipboard.writeText(text);
  }
}
