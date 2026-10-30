/** Icône affichée à gauche d'une entrée de menu contextuel. */
export type ContextMenuIcon =
  | 'copy'
  | 'reference'
  | 'heart'
  | 'heart-filled'
  | 'search'
  | 'open'
  | 'trash';

/** Entrée d'un menu contextuel. Une entrée `separator` n'a pas d'action. */
export interface ContextMenuItem {
  label?: string;
  icon?: ContextMenuIcon;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  action?: () => unknown;
}

/**
 * Fournisseur d'entrées pour une cible donnée.
 * Retourne `null` si la cible ne le concerne pas, ce qui laisse la main
 * au fournisseur suivant.
 */
export type ContextMenuProvider = (event: MouseEvent) => ContextMenuItem[] | null;
