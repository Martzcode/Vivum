import { Component, inject, signal } from '@angular/core';
import { TranslateService } from '../../services/translate.service';
import type { SupportedLocale } from '../../models/bible.model';
import { SUPPORTED_LOCALES } from '../../models/bible.model';

const LOCALE_NAMES: Record<SupportedLocale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  mg: 'Malagasy',
};

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  template: `
    <div class="lang-switcher">
      <button class="lang-btn" (click)="toggleDropdown()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <span>{{ currentLabel() }}</span>
      </button>
      @if (isOpen()) {
        <div class="lang-dropdown">
          @for (loc of locales; track loc) {
            <button
              class="lang-option"
              [class.active]="loc === translate.currentLocale()"
              (click)="switchLocale(loc)">
              {{ localeName(loc) }}
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .lang-switcher {
      position: relative;
    }

    .lang-btn {
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 3px 6px;
      font-size: 10px;
      font-weight: 500;
      color: var(--text-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      background: var(--bg-primary);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .lang-btn svg {
      width: 12px;
      height: 12px;
    }

    .lang-btn:hover {
      border-color: var(--border-medium);
      background: var(--bg-secondary);
    }

    .lang-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      min-width: 120px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      padding: 4px 0;
      z-index: 1001;
      animation: fadeIn 0.1s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .lang-option {
      display: block;
      width: 100%;
      padding: 6px 12px;
      font-size: 12px;
      text-align: left;
      color: var(--text-primary);
      background: none;
      border: none;
      cursor: pointer;
      transition: background-color 0.1s ease;
    }

    .lang-option:hover {
      background: var(--bg-hover);
    }

    .lang-option.active {
      color: var(--accent);
      font-weight: 600;
      background: var(--bg-active);
    }
  `]
})
export class LanguageSwitcherComponent {
  translate = inject(TranslateService);
  locales = SUPPORTED_LOCALES;
  isOpen = signal(false);

  currentLabel(): string {
    return LOCALE_NAMES[this.translate.currentLocale()];
  }

  localeName(locale: SupportedLocale): string {
    return LOCALE_NAMES[locale];
  }

  toggleDropdown() {
    this.isOpen.update(v => !v);
  }

  async switchLocale(locale: SupportedLocale) {
    await this.translate.setLocale(locale);
    this.isOpen.set(false);
  }
}
