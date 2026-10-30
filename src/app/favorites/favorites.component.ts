import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';
import { TranslateService } from '../services/translate.service';
import { ClipboardService } from '../services/clipboard.service';
import { ContextMenuService } from '../services/context-menu.service';
import { FavoritesService } from '../services/favorites.service';
import type { ContextMenuItem } from '../components/context-menu';
import type { BibleVersion, Favorite } from '../models/bible.model';
import { VERSION_LABELS } from '../models/bible.model';

@Component({
  selector: 'app-favorites',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="favorites-page">
      <div class="favorites-header">
        <h1>{{ 'favorites.title' | t }}</h1>
        @if (favorites().length > 0) {
          <div class="favorites-tools">
            <button type="button" class="tool-btn" (click)="exportFavorites()">
              {{ 'favorites.export' | t }}
            </button>
            <label class="tool-btn">
              {{ 'favorites.import' | t }}
              <input
                type="file"
                accept="application/json,.json"
                hidden
                (change)="onImport($event)">
            </label>
          </div>
        }
      </div>

      @if (status(); as message) {
        <p class="status" role="status">{{ message }}</p>
      }

      @if (favorites().length === 0) {
        <div class="favorites-empty">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <p>{{ 'favorites.empty' | t }}</p>
          <span>{{ 'favorites.emptyHint' | t }}</span>
          <a class="empty-cta" routerLink="/bible">{{ 'nav.bible' | t }}</a>
        </div>
      } @else {
        <div class="favorites-list">
          @for (fav of favorites(); track fav.id) {
            <div class="fav-card" [attr.data-favorite-id]="fav.id">
              <a
                class="fav-link"
                [routerLink]="['/bible', fav.bookId, fav.chapter]"
                [fragment]="'v' + fav.verse">
                <div class="fav-ref">
                  {{ fav.bookName }} {{ fav.chapter }}:{{ fav.verse }}
                  <span class="fav-version">{{ versionLabel(fav.version) }}</span>
                </div>
                <div class="fav-text">{{ fav.text }}</div>
              </a>
              <button
                type="button"
                class="fav-remove"
                (click)="remove(fav)"
                [attr.aria-label]="'bible.removeFavorite' | t">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .favorites-page { max-width: 700px; margin: 0 auto; padding: 24px; }

    .favorites-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }

    h1 { font-size: 24px; font-weight: 700; margin: 0; color: var(--text-primary); }

    .favorites-tools { display: flex; gap: 6px; }

    .tool-btn {
      display: inline-block;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: border-color 0.15s ease, color 0.15s ease;
    }

    .tool-btn:hover { border-color: var(--accent); color: var(--accent); }

    .status {
      margin: 0 0 16px;
      padding: 8px 12px;
      font-size: 12px;
      color: var(--text-secondary);
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
    }

    .favorites-empty {
      text-align: center;
      padding: 64px 24px;
    }

    .empty-icon {
      width: 48px;
      height: 48px;
      color: var(--border-medium);
      margin-bottom: 16px;
    }

    .favorites-empty p {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-secondary);
      margin: 0 0 8px;
    }

    .favorites-empty span {
      display: block;
      font-size: 13px;
      color: var(--text-muted);
    }

    .empty-cta {
      display: inline-block;
      margin-top: 20px;
      padding: 9px 22px;
      background: var(--accent);
      color: var(--bg-primary);
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
    }

    .empty-cta:hover { background: var(--accent-hover); text-decoration: none; }

    .favorites-list { display: flex; flex-direction: column; gap: 8px; }

    .fav-card {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      transition: border-color 0.15s ease;
    }

    .fav-card:hover { border-color: var(--accent); }

    .fav-link {
      flex: 1;
      text-decoration: none;
    }

    .fav-link:hover { text-decoration: none; }

    .fav-ref {
      font-size: 13px;
      font-weight: 600;
      color: var(--accent);
      margin-bottom: 4px;
    }

    .fav-version {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-muted);
      border: 1px solid var(--border-light);
      border-radius: 3px;
      padding: 0 4px;
      margin-left: 4px;
      vertical-align: middle;
    }

    .fav-text {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
    }

    .fav-remove {
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
      flex-shrink: 0;
      opacity: 0;
      transition: all 0.1s ease;
    }

    .fav-card:hover .fav-remove,
    .fav-card:focus-within .fav-remove { opacity: 1; }
    .fav-remove svg { width: 14px; height: 14px; }
    .fav-remove:hover { background: var(--bg-hover); color: #e25555; }
  `],
})
export class FavoritesComponent {
  private readonly favoritesService = inject(FavoritesService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly clipboard = inject(ClipboardService);
  private readonly contextMenu = inject(ContextMenuService);
  private readonly destroyRef = inject(DestroyRef);

  readonly favorites = this.favoritesService.favorites;
  readonly status = signal<string | null>(null);

  private statusTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    const unregisterMenu = this.contextMenu.register(event => this.buildContextMenu(event));
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.statusTimer);
      unregisterMenu();
    });
  }

  versionLabel(version: BibleVersion): string {
    return VERSION_LABELS[version];
  }

  remove(favorite: Favorite): void {
    this.favoritesService.remove(favorite.id);
  }

  /** Entrées du menu contextuel pour une carte de favori. */
  private buildContextMenu(event: MouseEvent): ContextMenuItem[] | null {
    const target = event.target;
    if (!(target instanceof Element)) return null;

    const card = target.closest<HTMLElement>('[data-favorite-id]');
    if (!card) return null;

    const favorite = this.favorites().find(item => item.id === card.dataset['favoriteId']);
    if (!favorite) return null;

    const reference = `${favorite.bookName} ${favorite.chapter}:${favorite.verse}`;
    const selection = window.getSelection()?.toString().replace(/\s+/g, ' ').trim() ?? '';

    return [
      selection
        ? {
            label: this.translate.t('context.copySelection'),
            icon: 'copy',
            action: () => this.copy(selection),
          }
        : {
            label: this.translate.t('context.copyVerse'),
            icon: 'copy',
            action: () => this.copy(favorite.text),
          },
      {
        label: this.translate.t('context.copyReference'),
        icon: 'reference',
        action: () => this.copy(reference),
      },
      { separator: true },
      {
        label: this.translate.t('context.openVerse'),
        icon: 'open',
        action: () =>
          this.router.navigate(['/bible', favorite.bookId, favorite.chapter], {
            fragment: `v${favorite.verse}`,
          }),
      },
      {
        label: this.translate.t('bible.removeFavorite'),
        icon: 'trash',
        danger: true,
        action: () => this.remove(favorite),
      },
    ];
  }

  private async copy(text: string): Promise<void> {
    if (await this.clipboard.write(text)) {
      this.showStatus(this.translate.t('context.copied'));
    }
  }

  exportFavorites(): void {
    const json = this.favoritesService.exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `vivum-favorites-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.showStatus(this.translate.t('favorites.exported'));
  }

  async onImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    try {
      const count = this.favoritesService.importJson(await file.text());
      this.showStatus(this.translate.t('favorites.imported', { count }));
    } catch {
      this.showStatus(this.translate.t('favorites.importError'));
    }
  }

  private showStatus(message: string): void {
    this.status.set(message);
    clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => this.status.set(null), 4000);
  }
}
