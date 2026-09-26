import { Injectable, signal } from '@angular/core';
import type { SupportedLocale } from '../models/bible.model';
import { SUPPORTED_LOCALES } from '../models/bible.model';

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private translations = new Map<SupportedLocale, Record<string, unknown>>();
  currentLocale = signal<SupportedLocale>('fr');
  private ready = false;

  async init(): Promise<void> {
    const saved = localStorage.getItem('vivum-locale') as SupportedLocale;
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
      this.currentLocale.set(saved);
    }
    await this.loadLocale(this.currentLocale());
    this.ready = true;
  }

  private async loadLocale(locale: SupportedLocale): Promise<void> {
    if (this.translations.has(locale)) return;
    try {
      const data = await fetch(`/locale/${locale}.json`);
      this.translations.set(locale, await data.json());
    } catch {
      console.error(`Failed to load locale: ${locale}`);
    }
  }

  private resolve(obj: unknown, path: string): string | undefined {
    const keys = path.split('.');
    let current: unknown = obj;
    for (const key of keys) {
      if (current == null || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    return typeof current === 'string' ? current : undefined;
  }

  t(key: string, params?: Record<string, string | number>): string {
    const locale = this.currentLocale();
    const dict = this.translations.get(locale);
    let value = this.resolve(dict, key) ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{${k}}`, String(v));
      }
    }
    return value;
  }

  async setLocale(locale: SupportedLocale): Promise<void> {
    if (!SUPPORTED_LOCALES.includes(locale)) return;
    await this.loadLocale(locale);
    this.currentLocale.set(locale);
    localStorage.setItem('vivum-locale', locale);
    document.documentElement.lang = locale;
  }
}
