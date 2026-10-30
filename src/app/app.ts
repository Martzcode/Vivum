import { Component, HostListener, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ContextMenuComponent } from './components/context-menu';
import type { ContextMenuItem } from './components/context-menu';
import { TitleBarComponent } from './titlebar';
import { ClipboardService } from './services/clipboard.service';
import { ContextMenuService } from './services/context-menu.service';
import { TranslateService } from './services/translate.service';
import { toSearchQuery } from './utils/query';

@Component({
  imports: [RouterOutlet, TitleBarComponent, ContextMenuComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly translate = inject(TranslateService);
  private readonly contextMenu = inject(ContextMenuService);
  private readonly clipboard = inject(ClipboardService);
  private readonly router = inject(Router);

  async ngOnInit() {
    await this.translate.init();
  }

  /**
   * Menu contextuel applicatif.
   *
   * Les champs de saisie conservent le menu natif (couper/coller), qui reste
   * le plus fiable pour l'édition de texte. Partout ailleurs, le menu natif
   * de la WebView est remplacé par des actions adaptées au contexte.
   */
  @HostListener('document:contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof HTMLElement && this.isEditable(target)) return;

    event.preventDefault();
    if (this.contextMenu.show(event)) return;

    const selection = window.getSelection()?.toString().replace(/\s+/g, ' ').trim() ?? '';
    if (!selection) return;

    const items: ContextMenuItem[] = [
      {
        label: this.translate.t('context.copySelection'),
        icon: 'copy',
        action: () => this.clipboard.write(selection),
      },
    ];

    if (selection.length >= 2) {
      items.push({
        label: this.translate.t('context.searchSelection'),
        icon: 'search',
        action: () => this.search(selection),
      });
    }

    this.contextMenu.openAt(event.clientX, event.clientY, items);
  }

  private isEditable(target: HTMLElement): boolean {
    if (target.isContentEditable) return true;
    return target.closest('input, textarea, select, [contenteditable="true"]') !== null;
  }

  private search(text: string): void {
    void this.router.navigate(['/search'], { queryParams: { q: toSearchQuery(text) } });
  }
}
