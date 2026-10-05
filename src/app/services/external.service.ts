import { Injectable } from '@angular/core';
import { openUrl } from '@tauri-apps/plugin-opener';

/**
 * Ouvre un lien externe dans le navigateur par defaut.
 * Sous Tauri : via le plugin opener. Hors Tauri (ex. `npm start`
 * dans un navigateur) : repli sur window.open.
 */
@Injectable({ providedIn: 'root' })
export class ExternalService {
  async open(url: string): Promise<void> {
    try {
      await openUrl(url);
    } catch {
      window.open(url, '_blank', 'noopener');
    }
  }
}
