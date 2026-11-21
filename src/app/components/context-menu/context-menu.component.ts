import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ContextMenuService } from '../../services/context-menu.service';
import type { ContextMenuItem } from './context-menu.model';

/**
 * Menu contextuel applicatif.
 *
 * Remplace le menu natif de la WebView sur le contenu de l'application.
 * Il est positionné au pointeur, contenu dans la fenêtre, et pilotable au
 * clavier (flèches, Entrée, Échap).
 */
@Component({
  selector: 'app-context-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="context-backdrop" (pointerdown)="service.close()"></div>

      <div
        #menu
        class="context-menu"
        role="menu"
        tabindex="-1"
        [style.left.px]="left()"
        [style.top.px]="top()"
        (keydown)="onKeydown($event)"
        (contextmenu)="$event.preventDefault()">
        @for (item of items(); track $index) {
          @if (item.separator) {
            <div class="context-separator" role="separator"></div>
          } @else {
            <button
              type="button"
              role="menuitem"
              class="context-item"
              [class.danger]="item.danger"
              [disabled]="item.disabled"
              (click)="activate(item)">
              <span class="context-icon" aria-hidden="true">
                @switch (item.icon) {
                  @case ('copy') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="8" y="8" width="14" height="14" rx="2"/>
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                    </svg>
                  }
                  @case ('reference') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 7v14"/>
            <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>
                    </svg>
                  }
                  @case ('heart') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  }
                  @case ('heart-filled') {
                    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  }
                  @case ('search') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3"/>
                    </svg>
                  }
                  @case ('open') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M15 3h6v6"/>
                      <path d="M10 14 21 3"/>
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    </svg>
                  }
                  @case ('image') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="9" cy="9" r="2"/>
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                    </svg>
                  }
                  @case ('note') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 20h9"/>
                      <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>
                    </svg>
                  }
                  @case ('highlight') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m9 11-6 6v3h9l3-3"/>
                      <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>
                    </svg>
                  }
                  @case ('trash') {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      <path d="M10 11v6M14 11v6"/>
                    </svg>
                  }
                }
              </span>
              <span class="context-label">{{ item.label }}</span>
              @if (item.shortcut) {
                <span class="context-shortcut">{{ item.shortcut }}</span>
              }
            </button>
          }
        }
      </div>
    }
  `,
  styles: [`
    .context-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1100;
    }

    .context-menu {
      position: fixed;
      z-index: 1101;
      min-width: 210px;
      max-width: 300px;
      padding: 4px;
      background: var(--bg-primary);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      animation: context-menu-in 80ms ease-out;
      outline: none;
    }

    @keyframes context-menu-in {
      from { opacity: 0; transform: translateY(-2px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .context-item {
      display: flex;
      align-items: center;
      gap: 9px;
      width: 100%;
      padding: 7px 10px;
      border: none;
      border-radius: var(--radius-sm);
      background: none;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 13px;
      text-align: left;
      cursor: pointer;
      transition: background-color 0.1s ease, color 0.1s ease;
    }

    .context-item:hover:not(:disabled),
    .context-item:focus-visible {
      background: var(--bg-hover);
      outline: none;
    }

    .context-item:disabled {
      opacity: 0.45;
      cursor: default;
    }

    .context-item.danger {
      color: var(--danger);
    }

    .context-item.danger:hover:not(:disabled),
    .context-item.danger:focus-visible {
      background: color-mix(in srgb, var(--danger) 12%, transparent);
    }

    .context-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      color: var(--text-muted);
    }

    .context-item.danger .context-icon {
      color: currentColor;
    }

    .context-icon svg {
      width: 16px;
      height: 16px;
    }

    .context-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .context-shortcut {
      margin-left: auto;
      padding-left: 16px;
      font-size: 11px;
      color: var(--text-muted);
    }

    .context-separator {
      height: 1px;
      margin: 4px 6px;
      background: var(--border-light);
    }
  `],
})
export class ContextMenuComponent {
  protected readonly service = inject(ContextMenuService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');

  readonly open = this.service.open;
  readonly items = this.service.items;

  private readonly offset = signal({ left: 0, top: 0 });
  readonly left = computed(() => this.offset().left);
  readonly top = computed(() => this.offset().top);

  constructor() {
    effect(() => {
      if (!this.open()) return;

      const { x, y } = this.service.position();
      this.offset.set({ left: x, top: y });
      queueMicrotask(() => this.place(x, y));
    });

    const onScroll = () => this.service.close();
    document.addEventListener('scroll', onScroll, true);
    this.destroyRef.onDestroy(() => document.removeEventListener('scroll', onScroll, true));
  }

  @HostListener('window:resize')
  @HostListener('window:blur')
  onWindowChange(): void {
    this.service.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.service.close();
  }

  activate(item: ContextMenuItem): void {
    if (item.disabled || !item.action) return;
    this.service.close();
    void item.action();
  }

  onKeydown(event: KeyboardEvent): void {
    const buttons = Array.from(
      this.menu()?.nativeElement.querySelectorAll<HTMLButtonElement>(
        '.context-item:not(:disabled)',
      ) ?? [],
    );
    if (buttons.length === 0) return;

    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let next: number | null = null;

    switch (event.key) {
      case 'ArrowDown':
        next = current < 0 ? 0 : (current + 1) % buttons.length;
        break;
      case 'ArrowUp':
        next = current <= 0 ? buttons.length - 1 : current - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = buttons.length - 1;
        break;
      case 'Tab':
        this.service.close();
        return;
      default:
        return;
    }

    event.preventDefault();
    buttons[next].focus();
  }

  private place(x: number, y: number): void {
    const element = this.menu()?.nativeElement;
    if (!element) return;

    const margin = 8;
    const rect = element.getBoundingClientRect();
    const left = Math.max(margin, Math.min(x, window.innerWidth - rect.width - margin));
    const top = Math.max(margin, Math.min(y, window.innerHeight - rect.height - margin));

    this.offset.set({ left, top });
    element.querySelector<HTMLButtonElement>('.context-item:not(:disabled)')?.focus({
      preventScroll: true,
    });
  }
}
