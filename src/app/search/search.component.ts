import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../pipes/translate.pipe';
import { TranslateService } from '../services/translate.service';
import { BibleService } from '../services/bible.service';
import type { SearchResult } from '../models/bible.model';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [RouterLink, FormsModule, TranslatePipe],
  template: `
    <div class="search-page">
      <div class="search-box">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          type="search"
          class="search-input-lg"
          [placeholder]="'search.placeholder' | t"
          [(ngModel)]="query"
          (keydown.enter)="doSearch()">
      </div>

      @if (searching()) {
        <div class="search-loading">{{ 'bible.loading' | t }}</div>
      } @else if (results().length > 0) {
        <div class="search-info">
          {{ 'search.resultsCount' | t : { count: results().length } }}
        </div>
        <div class="search-results">
          @for (r of results(); track r.id) {
            <a class="result-card" [routerLink]="['/bible', r.bookId, r.chapter]" [fragment]="'v' + r.verse">
              <div class="result-ref">{{ r.bookName }} {{ r.chapter }}:{{ r.verse }}</div>
              <div class="result-text" [innerHTML]="r.matchedText"></div>
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

    h1 { font-size: 24px; font-weight: 700; margin: 0 0 24px; color: var(--text-primary); }

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

    .search-btn {
      padding: 6px 16px;
      background: var(--accent);
      color: var(--bg-primary);
      border: none;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .search-btn:hover { background: var(--accent-hover); }

    .search-loading, .search-empty {
      text-align: center;
      padding: 48px;
      color: var(--text-muted);
      font-size: 14px;
    }

    .search-info {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 16px;
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
  `]
})
export class SearchComponent implements OnInit {
  private bibleService = inject(BibleService);
  private translate = inject(TranslateService);
  private route = inject(ActivatedRoute);

  query = '';
  results = signal<(SearchResult & { id: string })[]>([]);
  searching = signal(false);
  hasSearched = signal(false);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.query = params['q'];
        this.doSearch();
      }
    });
  }

  async doSearch() {
    if (!this.query.trim()) return;
    this.searching.set(true);
    this.hasSearched.set(true);
    const raw = await this.bibleService.search(this.translate.currentLocale(), this.query);
    this.results.set(raw.map((r, i) => ({ ...r, id: `${r.bookId}:${r.chapter}:${r.verse}:${i}` })));
    this.searching.set(false);
  }
}
