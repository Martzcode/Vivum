import { Injectable, signal } from '@angular/core';
import type { SupportedLocale } from '../models/bible.model';
import { SUPPORTED_LOCALES } from '../models/bible.model';

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private translations = new Map<SupportedLocale, Record<string, unknown>>();
  /**
   * Langue selectionnee : pilote le CONTENU biblique (VERSION_MAP).
   * Seule exception : 'mg' garde une INTERFACE en francais (voir uiLocale).
   */
  currentLocale = signal<SupportedLocale>('fr');
  private ready = false;

  /**
   * Locale d'affichage de l'interface : le malagasy reutilise le francais
   * (contenu en malagasy, menus et libelles en francais). Les autres
   * langues gardent une interface dans leur propre langue.
   */
  uiLocale(): SupportedLocale {
    return this.currentLocale() === 'mg' ? 'fr' : this.currentLocale();
  }

  async init(): Promise<void> {
    const saved = localStorage.getItem('vivum-locale') as SupportedLocale;
    if (saved && SUPPORTED_LOCALES.includes(saved)) {
      this.currentLocale.set(saved);
    }
    await this.loadLocale(this.currentLocale());
    document.documentElement.lang = this.uiLocale();
    this.ready = true;
  }

  private async loadLocale(locale: SupportedLocale): Promise<void> {
    const ui = locale === 'mg' ? 'fr' : locale;
    if (this.translations.has(ui)) return;
    try {
      const data = await fetch(`/locale/${ui}.json`);
      this.translations.set(ui, await data.json());
    } catch {
      console.error(`Failed to load locale: ${ui}`);
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
    const locale = this.uiLocale();
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
    document.documentElement.lang = this.uiLocale();
  }
}
