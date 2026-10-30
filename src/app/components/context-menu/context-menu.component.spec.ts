import { TestBed } from '@angular/core/testing';
import { ContextMenuComponent } from './context-menu.component';
import { ContextMenuService } from '../../services/context-menu.service';

function setup() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [ContextMenuComponent] });
  const fixture = TestBed.createComponent(ContextMenuComponent);
  return { fixture, service: TestBed.inject(ContextMenuService) };
}

describe('ContextMenuComponent', () => {
  it('renders the registered actions and separators', () => {
    const { fixture, service } = setup();

    service.openAt(20, 20, [
      { label: 'Copier le verset', icon: 'copy', action: () => undefined },
      { separator: true },
      { label: 'Rechercher ce verset', icon: 'search', action: () => undefined },
    ]);
    fixture.detectChanges();

    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.context-label'),
      (element: Element) => element.textContent?.trim(),
    );

    expect(labels).toEqual(['Copier le verset', 'Rechercher ce verset']);
    expect(fixture.nativeElement.querySelector('.context-separator')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.context-menu')).toBeTruthy();
  });

  it('runs the action and closes the menu', () => {
    const { fixture, service } = setup();
    const action = vi.fn();

    service.openAt(20, 20, [{ label: 'Copier', action }]);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.context-item',
    );
    button?.click();
    fixture.detectChanges();

    expect(action).toHaveBeenCalledTimes(1);
    expect(service.open()).toBe(false);
    expect(fixture.nativeElement.querySelector('.context-menu')).toBeNull();
  });

  it('does nothing when the menu is closed', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.context-menu')).toBeNull();
  });
});
