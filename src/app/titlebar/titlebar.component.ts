import { Component, signal, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LanguageSwitcherComponent } from '../components/language-switcher/language-switcher.component';
import { TranslatePipe } from '../pipes/translate.pipe';
import { getCurrentWindow } from '@tauri-apps/api/window';

@Component({
  selector: 'app-titlebar',
  standalone: true,
  imports: [LanguageSwitcherComponent, RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <header class="titlebar" (mousedown)="startDrag($event)" (dblclick)="onHeaderDblClick($event)">
      <div class="titlebar-brand">
        <img class="titlebar-logo" src="/logo.png" alt="" width="22" height="22">
        <span class="titlebar-title">{{ 'app.title' | t }}</span>
      </div>

      <nav class="titlebar-nav">
        <a class="nav-btn" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
            <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          <span>{{ 'nav.home' | t }}</span>
        </a>
        <a class="nav-btn" routerLink="/bible" routerLinkActive="active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 7v14"/>
            <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>
          </svg>
          <span>{{ 'nav.bible' | t }}</span>
        </a>
        <a class="nav-btn" routerLink="/favorites" routerLinkActive="active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span>{{ 'nav.favorites' | t }}</span>
        </a>
        <a class="nav-btn" routerLink="/about" routerLinkActive="active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
          <span>{{ 'nav.about' | t }}</span>
        </a>
      </nav>

      <div class="titlebar-spacer"></div>

      <div class="titlebar-search">
        <div class="search-input-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="search"
            class="search-input"
            [placeholder]="'search.placeholder' | t"
            [value]="searchQuery()"
            (input)="onSearch($event)"
            (keydown.enter)="submitSearch()"
            (keydown.escape)="clearSearch()"
            [attr.aria-label]="'aria.search' | t">
        </div>
      </div>

      <app-language-switcher />

      <div class="titlebar-window-controls">
        <button class="window-control minimize" (click)="minimize()" [attr.aria-label]="'aria.minimize' | t">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14"/>
          </svg>
        </button>
        <button class="window-control maximize" (click)="toggleMaximize()" [attr.aria-label]="'aria.maximize' | t">
          @if (!isMaximized()) {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="4" width="16" height="16" rx="2"/>
            </svg>
          } @else {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="8" y="8" width="12" height="12" rx="2"/>
              <path d="M4 16V6a2 2 0 0 1 2-2h10"/>
            </svg>
          }
        </button>
        <button class="window-control close" (click)="close()" [attr.aria-label]="'aria.close' | t">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18"/>
            <path d="M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </header>
  `,
  styles: [`
    :host { display: block; }

    .titlebar-nav {
      display: flex;
      gap: 2px;
    }

    .nav-btn {
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      text-decoration: none;
      transition: background-color 0.15s ease, color 0.15s ease;
    }

    .nav-btn svg {
      width: 13px;
      height: 13px;
    }

    .nav-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
      text-decoration: none;
    }

    .nav-btn.active {
      background: var(--bg-active);
      color: var(--accent);
    }
  `]
})
export class TitleBarComponent implements OnInit, OnDestroy {
  private readonly appWindow = getCurrentWindow();
  private unlistenResized?: () => void;
  private router = inject(Router);

  isMaximized = signal(false);
  searchQuery = signal('');

  async ngOnInit() {
    this.isMaximized.set(await this.appWindow.isMaximized());
    this.unlistenResized = await this.appWindow.onResized(async () => {
      this.isMaximized.set(await this.appWindow.isMaximized());
    });
  }

  ngOnDestroy() {
    this.unlistenResized?.();
  }

  startDrag(event: MouseEvent) {
    if (event.button !== 0 || this.isInteractive(event.target)) return;
    event.preventDefault();
    this.appWindow.startDragging();
  }

  onHeaderDblClick(event: MouseEvent) {
    if (this.isInteractive(event.target)) return;
    this.toggleMaximize();
  }

  private isInteractive(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    return !!el?.closest?.('input, button, a, select, textarea, [contenteditable="true"]');
  }

  minimize() { this.appWindow.minimize(); }
  toggleMaximize() { this.appWindow.toggleMaximize(); }
  close() { this.appWindow.close(); }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  submitSearch() {
    const q = this.searchQuery().trim();
    if (q) {
      this.router.navigate(['/search'], { queryParams: { q } });
    }
  }

  clearSearch() {
    this.searchQuery.set('');
    const input = document.querySelector('.search-input') as HTMLInputElement;
    input?.blur();
  }
}
