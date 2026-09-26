import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslateService } from '../../services/translate.service';
import { BibleService } from '../../services/bible.service';
import type { BookInfo } from '../../models/bible.model';

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="book-list">
      <section class="testament-section">
        <h2>{{ 'bible.oldTestament' | t }}</h2>
        <div class="book-grid">
          @for (book of otBooks(); track book.id) {
            <a class="book-card" [routerLink]="['/bible', book.id]">
              <span class="book-name">{{ book.name[locale()] || book.name['en'] || book.id }}</span>
              <span class="book-chapters">{{ book.chapters }} {{ 'bible.chapters' | t }}</span>
            </a>
          }
        </div>
      </section>

      <section class="testament-section">
        <h2>{{ 'bible.newTestament' | t }}</h2>
        <div class="book-grid">
          @for (book of ntBooks(); track book.id) {
            <a class="book-card" [routerLink]="['/bible', book.id]">
              <span class="book-name">{{ book.name[locale()] || book.name['en'] || book.id }}</span>
              <span class="book-chapters">{{ book.chapters }} {{ 'bible.chapters' | t }}</span>
            </a>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .book-list {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    .testament-section {
      margin-bottom: 32px;
    }

    h2 {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--border-light);
    }

    .book-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 8px;
    }

    .book-card {
      display: flex;
      flex-direction: column;
      padding: 12px 14px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .book-card:hover {
      border-color: var(--accent);
      background: var(--bg-hover);
      text-decoration: none;
    }

    .book-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.3;
    }

    .book-chapters {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }
  `]
})
export class BookListComponent implements OnInit {
  private bibleService = inject(BibleService);
  private translate = inject(TranslateService);

  otBooks = signal<BookInfo[]>([]);
  ntBooks = signal<BookInfo[]>([]);
  locale = this.translate.currentLocale;

  async ngOnInit() {
    const books = await this.bibleService.getBooks(this.translate.currentLocale());
    this.otBooks.set(books.filter(b => b.testament === 'ot'));
    this.ntBooks.set(books.filter(b => b.testament === 'nt'));
  }
}
