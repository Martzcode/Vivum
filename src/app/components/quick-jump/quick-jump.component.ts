import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { BibleService } from '../../services/bible.service';
import { QuickJumpService } from '../../services/quick-jump.service';
import { TranslateService } from '../../services/translate.service';
import type { BookInfo } from '../../models/bible.model';
import type { ParsedReference } from '../../utils/reference';
import { findReferences, formatReference } from '../../utils/reference';

@Component({
  selector: 'app-quick-jump',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    @if (jump.open()) {
      <div class="backdrop" (click)="jump.close()"></div>
      <div class="palette" role="dialog" aria-modal="true" [attr.aria-label]="'jump.title' | t">
        <div class="field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="m9 18 6-6-6-6"/>
          </svg>
          <input
            #input
            type="text"
            autocomplete="off"
            spellcheck="false"
            [placeholder]="'jump.placeholder' | t"
            [attr.aria-label]="'jump.title' | t"
            [value]="query()"
            (input)="onInput($event)"
            (keydown)="onKeydown($event)">
        </div>

        <ul class="results" role="listbox">
          @for (item of results(); track item.book.id; let i = $index) {
            <li
              role="option"
              [attr.aria-selected]="i === selected()"
              [class.active]="i === selected()"
              (mouseenter)="selected.set(i)"
              (click)="go(item)">
              <span class="name">{{ label(item) }}</span>
              <span class="hint">{{ item.book.testament === 'ot' ? ('bible.oldTestament' | t) : ('bible.newTestament' | t) }}</span>
            </li>
          } @empty {
            <li class="empty">
              {{ query().trim() ? ('jump.noMatch' | t) : ('jump.hint' | t) }}
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: [`
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 900;
      background: rgba(20, 24, 22, 0.35);
    }

    .palette {
      position: fixed;
      z-index: 901;
      top: 15vh;
      left: 50%;
      transform: translateX(-50%);
      width: min(520px, calc(100vw - 32px));
      background: var(--bg-primary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
    }

    .field {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 16px;
      border-bottom: 1px solid var(--border-light);
      color: var(--text-muted);
    }

    .field svg { width: 18px; height: 18px; flex: 0 0 auto; }

    input {
      flex: 1;
      height: 52px;
      font-size: 16px;
      color: var(--text-primary);
      background: none;
      border: none;
      outline: none;
    }

    input::placeholder { color: var(--text-muted); }

    .results {
      list-style: none;
      margin: 0;
      padding: 6px;
      max-height: 320px;
      overflow-y: auto;
    }

    li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      font-size: 14px;
      color: var(--text-primary);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    li.active { background: var(--bg-hover); }

    .hint { font-size: 11px; color: var(--text-muted); }

    .empty {
      cursor: default;
      color: var(--text-muted);
      font-size: 13px;
    }
  `],
})
export class QuickJumpComponent {
  protected readonly jump = inject(QuickJumpService);
  private readonly bible = inject(BibleService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('input');

  protected readonly query = signal('');
  protected readonly selected = signal(0);
  private readonly books = signal<BookInfo[]>([]);

  protected readonly results = computed(() =>
    findReferences(this.query(), this.books(), this.translate.currentLocale()),
  );

  constructor() {
    effect(() => {
      if (!this.jump.open()) return;
      this.query.set('');
      this.selected.set(0);
      void this.bible.getBooks().then(books => this.books.set(books)).catch(() => undefined);
    });

    effect(() => {
      const element = this.input()?.nativeElement;
      if (element) setTimeout(() => element.focus(), 0);
    });
  }

  @HostListener('document:keydown', ['$event'])
  onGlobalKey(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.jump.toggle();
    } else if (event.key === 'Escape' && this.jump.open()) {
      this.jump.close();
    }
  }

  protected label(item: ParsedReference): string {
    return formatReference(item, this.translate.currentLocale());
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.selected.set(0);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.results().length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      this.selected.update(value => (value + 1) % count);
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      this.selected.update(value => (value - 1 + count) % count);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = this.results()[this.selected()];
      if (item) this.go(item);
    }
  }

  protected go(item: ParsedReference): void {
    this.jump.close();
    const commands = item.chapter
      ? ['/bible', item.book.id, String(item.chapter)]
      : ['/bible', item.book.id];
    void this.router.navigate(commands, {
      fragment: item.chapter && item.verse ? `v${item.verse}` : undefined,
    });
  }
}
