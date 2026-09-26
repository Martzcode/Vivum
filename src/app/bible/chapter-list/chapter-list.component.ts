import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslateService } from '../../services/translate.service';
import { BibleService } from '../../services/bible.service';
import type { BookInfo } from '../../models/bible.model';

@Component({
  selector: 'app-chapter-list',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="chapter-list">
      <div class="chapter-header">
        <a class="back-link" routerLink="/bible">← {{ 'nav.bible' | t }}</a>
        <h1>{{ bookName() }}</h1>
      </div>
      <div class="chapter-grid">
        @for (ch of chapters(); track ch) {
          <a class="chapter-card" [routerLink]="['/bible', bookId(), ch]">
            {{ ch }}
          </a>
        }
      </div>
    </div>
  `,
  styles: [`
    .chapter-list {
      max-width: 600px;
      margin: 0 auto;
      padding: 24px;
    }

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
  `]
})
export class ChapterListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private bibleService = inject(BibleService);
  private translate = inject(TranslateService);

  bookId = signal('');
  bookName = signal('');
  chapters = signal<number[]>([]);

  async ngOnInit() {
    const bookId = this.route.snapshot.paramMap.get('bookId') || '';
    this.bookId.set(bookId);

    const books = await this.bibleService.getBooks(this.translate.currentLocale());
    const book = books.find(b => b.id === bookId);
    if (book) {
      const locale = this.translate.currentLocale();
      this.bookName.set(book.name[locale] || book.name['en'] || book.id);
      this.chapters.set(Array.from({ length: book.chapters }, (_, i) => i + 1));
    }
  }
}
