import { TestBed } from '@angular/core/testing';
import { ContextMenuService, normalizeItems } from './context-menu.service';
import type { ContextMenuItem } from '../components/context-menu';

function createService(): ContextMenuService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(ContextMenuService);
}

function contextEvent(x = 100, y = 50): MouseEvent {
  return new MouseEvent('contextmenu', { clientX: x, clientY: y, bubbles: true });
}

const item: ContextMenuItem = {
  label: 'Copier',
  icon: 'copy',
  action: () => undefined,
};

describe('ContextMenuService', () => {
  it('opens at the pointer with the first provider that matches', () => {
    const service = createService();
    const second = vi.fn(() => [item]);

    service.register(() => null);
    service.register(() => [item]);
    service.register(second);

    expect(service.show(contextEvent(120, 60))).toBe(true);
    expect(service.open()).toBe(true);
    expect(service.position()).toEqual({ x: 120, y: 60 });
    expect(service.items()).toEqual([item]);
    expect(second).not.toHaveBeenCalled();
  });

  it('reports no menu when no provider recognises the target', () => {
    const service = createService();
    service.register(() => null);
    service.register(() => []);

    expect(service.show(contextEvent())).toBe(false);
    expect(service.open()).toBe(false);
  });

  it('ignores a provider after it has been unregistered', () => {
    const service = createService();
    const unregister = service.register(() => [item]);

    unregister();

    expect(service.show(contextEvent())).toBe(false);
  });

  it('closes the menu and clears its items', () => {
    const service = createService();
    service.openAt(10, 10, [item]);
    expect(service.open()).toBe(true);

    service.close();

    expect(service.open()).toBe(false);
    expect(service.items()).toEqual([]);
  });

  it('never opens with an empty set of actions', () => {
    const service = createService();
    service.openAt(10, 10, [{ separator: true }]);

    expect(service.open()).toBe(false);
  });
});

describe('normalizeItems', () => {
  it('removes leading, trailing and duplicated separators', () => {
    const separator: ContextMenuItem = { separator: true };

    const result = normalizeItems([
      separator,
      item,
      separator,
      separator,
      { ...item, label: 'Rechercher' },
      separator,
    ]);

    expect(result).toHaveLength(3);
    expect(result[0]).toBe(item);
    expect(result[1].separator).toBe(true);
    expect(result[2].label).toBe('Rechercher');
  });

  it('drops entries without label or action', () => {
    const result = normalizeItems([
      { label: 'Sans action' },
      { ...item, action: undefined },
      item,
    ]);

    expect(result).toEqual([item]);
  });
});
