import { Injectable, signal } from '@angular/core';
import type { ShareCardContent } from '../utils/share-card';

/** Ouvre la fenêtre de création d'image de verset. */
@Injectable({ providedIn: 'root' })
export class ShareCardService {
  private readonly _request = signal<ShareCardContent | null>(null);
  readonly request = this._request.asReadonly();

  open(content: ShareCardContent): void {
    this._request.set(content);
  }

  close(): void {
    this._request.set(null);
  }
}
