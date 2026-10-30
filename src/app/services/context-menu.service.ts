import { Injectable, signal } from '@angular/core';
import type { ContextMenuItem, ContextMenuProvider } from '../components/context-menu/context-menu.model';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

/**
 * État partagé du menu contextuel applicatif.
 *
 * Les écrans enregistrent un fournisseur qui décrit les actions pertinentes
 * pour la cible cliquée (verset, favori, résultat de recherche…). Le premier
 * fournisseur qui reconnaît la cible gagne ; à défaut, l'appelant peut ouvrir
 * un menu de repli (copie de la sélection).
 */
@Injectable({ providedIn: 'root' })
export class ContextMenuService {
  private readonly _open = signal(false);
  private readonly _position = signal<ContextMenuPosition>({ x: 0, y: 0 });
  private readonly _items = signal<ContextMenuItem[]>([]);

  readonly open = this._open.asReadonly();
  readonly position = this._position.asReadonly();
  readonly items = this._items.asReadonly();

  private readonly providers = new Set<ContextMenuProvider>();

  /** Enregistre un fournisseur et retourne sa fonction de désinscription. */
  register(provider: ContextMenuProvider): () => void {
    this.providers.add(provider);
    return () => this.providers.delete(provider);
  }

  /**
   * Ouvre le menu si un fournisseur reconnaît la cible.
   * @returns `true` si un menu a été affiché.
   */
  show(event: MouseEvent): boolean {
    for (const provider of this.providers) {
      const items = provider(event);
      if (items && items.length > 0) {
        const { x, y } = eventPosition(event);
        this.openAt(x, y, items);
        return true;
      }
    }
    return false;
  }

  /** Ouvre le menu à une position donnée avec des entrées explicites. */
  openAt(x: number, y: number, items: ContextMenuItem[]): void {
    const cleaned = normalizeItems(items);
    if (cleaned.length === 0) return;

    this._position.set({ x, y });
    this._items.set(cleaned);
    this._open.set(true);
  }

  close(): void {
    if (!this._open()) return;
    this._open.set(false);
    this._items.set([]);
  }
}

/** Retire les séparateurs superflus et les entrées vides. */
export function normalizeItems(items: ContextMenuItem[]): ContextMenuItem[] {
  const result: ContextMenuItem[] = [];

  for (const item of items) {
    if (item.separator) {
      if (result.length === 0) continue;
      if (result[result.length - 1].separator) continue;
      result.push(item);
      continue;
    }
    if (!item.label || !item.action) continue;
    result.push(item);
  }

  while (result.length > 0 && result[result.length - 1].separator) {
    result.pop();
  }

  return result;
}

/**
 * Position d'ouverture du menu.
 * Un événement clavier (touche Menu, Shift+F10) n'a pas de coordonnées :
 * le menu s'ouvre alors au centre de la cible.
 */
function eventPosition(event: MouseEvent): ContextMenuPosition {
  if (event.clientX !== 0 || event.clientY !== 0) {
    return { x: event.clientX, y: event.clientY };
  }

  const target = event.target;
  if (target instanceof Element) {
    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  return { x: 8, y: 8 };
}

