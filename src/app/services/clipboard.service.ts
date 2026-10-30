import { Injectable } from '@angular/core';

/**
 * Copie de texte vers le presse-papiers.
 *
 * Utilise l'API Clipboard quand elle est disponible, avec un repli sur un
 * `<textarea>` temporaire (WebView sans permission `clipboard-write`).
 */
@Injectable({ providedIn: 'root' })
export class ClipboardService {
  async write(text: string): Promise<boolean> {
    if (!text) return false;

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return this.legacyCopy(text);
    }
  }

  private legacyCopy(text: string): boolean {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      area.style.opacity = '0';

      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      return copied;
    } catch {
      return false;
    }
  }
}
