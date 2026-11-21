import { Injectable, signal } from '@angular/core';

/** État de la fenêtre « Aller à… » (Ctrl+K). */
@Injectable({ providedIn: 'root' })
export class QuickJumpService {
  private readonly _open = signal(false);
  readonly open = this._open.asReadonly();

  show(): void {
    this._open.set(true);
  }

  close(): void {
    this._open.set(false);
  }

  toggle(): void {
    this._open.update(value => !value);
  }
}
