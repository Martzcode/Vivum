import { Component, signal, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LanguageSwitcherComponent } from '../components/language-switcher/language-switcher.component';
import { TranslateService } from '../services/translate.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { ExternalService } from '../services/external.service';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface MenuDef {
  labelKey: string;
  items: MenuItem[];
}

interface MenuItem {
  labelKey?: string;
  label?: string;
  shortcut?: string;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
}

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
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
          <span>{{ 'nav.home' | t }}</span>
        </a>
        <a class="nav-btn" routerLink="/bible" routerLinkActive="active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
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
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span>{{ 'nav.about' | t }}</span>
        </a>
      </nav>

      <div class="titlebar-spacer"></div>

      <div class="titlebar-search">
        <div class="search-input-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
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
  private translate = inject(TranslateService);
  private external = inject(ExternalService);

  isMaximized = signal(false);
  searchQuery = signal('');

  get menus() {
    return [
      {
        labelKey: 'menu.file',
        items: [
          { labelKey: 'menu.file.new', shortcut: '⌘N', action: () => {} },
          { labelKey: 'menu.file.open', shortcut: '⌘O', action: () => {} },
          { divider: true },
          { labelKey: 'menu.file.save', shortcut: '⌘S', action: () => {} },
          { labelKey: 'menu.file.saveAs', shortcut: '⌘⇧S', action: () => {} },
          { divider: true },
          { labelKey: 'menu.file.quit', shortcut: '⌘Q', action: () => this.close() },
        ]
      },
      {
        labelKey: 'menu.edit',
        items: [
          { labelKey: 'menu.edit.undo', shortcut: '⌘Z', action: () => {} },
          { labelKey: 'menu.edit.redo', shortcut: '⌘⇧Z', action: () => {} },
          { divider: true },
          { labelKey: 'menu.edit.cut', shortcut: '⌘X', action: () => {} },
          { labelKey: 'menu.edit.copy', shortcut: '⌘C', action: () => {} },
          { labelKey: 'menu.edit.paste', shortcut: '⌘⌘V', action: () => {} },
          { labelKey: 'menu.edit.selectAll', shortcut: '⌘A', action: () => {} },
        ]
      },
      {
        labelKey: 'menu.help',
        items: [
          { labelKey: 'menu.help.about', action: () => this.handleAction('about') },
          { divider: true },
          { labelKey: 'menu.help.online', shortcut: 'F1', action: () => this.handleAction('help') },
        ]
      }
    ];
  }

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

  onMenuAction(_action: string) {}

  private handleAction(action: string) {
    switch (action) {
      case 'about':
        alert('Vivum v0.1.0\nApplication desktop Tauri + Angular');
        break;
      case 'help':
        this.external.open('https://github.com/Martzcode/Vivum');
        break;
    }
  }
}
