import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ShareCardService } from '../../services/share-card.service';
import { TranslateService } from '../../services/translate.service';
import type { ShareFormat, ShareTheme } from '../../utils/share-card';
import { drawShareCard } from '../../utils/share-card';

const THEMES: ShareTheme[] = ['cream', 'sage', 'night'];
const FORMATS: ShareFormat[] = ['square', 'portrait'];

@Component({
  selector: 'app-share-card-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    @if (share.request(); as request) {
      <div class="backdrop" (click)="close()"></div>
      <div class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="'share.title' | t">
        <div class="dialog-header">
          <h2>{{ 'share.title' | t }}</h2>
          <button type="button" class="icon-btn" (click)="close()" [attr.aria-label]="'share.close' | t">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 6 6 18"/>
              <path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        <div class="preview">
          <canvas #canvas [class.portrait]="format() === 'portrait'"></canvas>
        </div>

        <div class="options">
          <div class="group" role="radiogroup" [attr.aria-label]="'share.theme' | t">
            @for (item of themes; track item) {
              <button
                type="button"
                class="swatch"
                [class]="'swatch swatch-' + item"
                [class.active]="theme() === item"
                role="radio"
                [attr.aria-checked]="theme() === item"
                [title]="'share.themes.' + item | t"
                (click)="theme.set(item)"></button>
            }
          </div>
          <div class="group" role="radiogroup" [attr.aria-label]="'share.format' | t">
            @for (item of formats; track item) {
              <button
                type="button"
                class="chip"
                [class.active]="format() === item"
                role="radio"
                [attr.aria-checked]="format() === item"
                (click)="format.set(item)">
                {{ 'share.formats.' + item | t }}
              </button>
            }
          </div>
        </div>

        <div class="actions">
          @if (status(); as message) {
            <span class="status" role="status">{{ message }}</span>
          }
          <button type="button" class="btn" (click)="copy()">{{ 'share.copy' | t }}</button>
          <button type="button" class="btn primary" (click)="save(request.reference)">
            {{ 'share.save' | t }}
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 900;
      background: rgba(20, 24, 22, 0.45);
    }

    .dialog {
      position: fixed;
      z-index: 901;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(520px, calc(100vw - 32px));
      max-height: calc(100vh - 32px);
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 18px;
      background: var(--bg-primary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
    }

    .icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .icon-btn svg { width: 16px; height: 16px; }

    .preview {
      min-height: 0;
      overflow: auto;
      display: flex;
      justify-content: center;
      padding: 8px;
      background: var(--bg-secondary);
      border-radius: var(--radius-md);
    }

    canvas {
      display: block;
      width: 100%;
      max-width: 340px;
      height: auto;
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-md);
    }

    .options {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .group { display: flex; align-items: center; gap: 8px; }

    .swatch {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2px solid var(--border-medium);
    }

    .swatch-cream { background: #f7f5f0; }
    .swatch-sage { background: #4a7c6f; }
    .swatch-night { background: #1e2220; }
    .swatch.active { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-light); }

    .chip {
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: 999px;
    }

    .chip.active {
      color: var(--on-accent);
      background: var(--accent);
      border-color: var(--accent);
    }

    .actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
    }

    .status {
      margin-right: auto;
      font-size: 12px;
      font-weight: 600;
      color: var(--accent);
    }

    .btn {
      padding: 9px 16px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
    }

    .btn:hover { background: var(--bg-hover); }

    .btn.primary {
      color: var(--on-accent);
      background: var(--accent);
      border-color: var(--accent);
    }

    .btn.primary:hover { background: var(--accent-hover); }
  `],
})
export class ShareCardDialogComponent {
  protected readonly share = inject(ShareCardService);
  private readonly translate = inject(TranslateService);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  protected readonly themes = THEMES;
  protected readonly formats = FORMATS;
  protected readonly theme = signal<ShareTheme>('cream');
  protected readonly format = signal<ShareFormat>('square');
  protected readonly status = signal('');

  private logo: HTMLImageElement | null = null;
  private logoLoading?: Promise<void>;
  private statusTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const request = this.share.request();
      const canvas = this.canvas()?.nativeElement;
      const theme = this.theme();
      const format = this.format();
      if (!request || !canvas) return;

      this.draw(canvas, request, theme, format);
      void this.ensureLogo().then(() => {
        if (this.logo) this.draw(canvas, request, theme, format);
      });
    });
  }

  @HostListener('document:keydown.escape')
  close(): void {
    if (this.share.request()) this.share.close();
  }

  async save(reference: string): Promise<void> {
    const blob = await this.toBlob();
    if (!blob) return this.flash('share.error');

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vivum-${slug(reference)}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    this.flash('share.saved');
  }

  async copy(): Promise<void> {
    const blob = await this.toBlob();
    try {
      if (!blob || typeof ClipboardItem === 'undefined') throw new Error('unsupported');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      this.flash('share.copied');
    } catch {
      this.flash('share.error');
    }
  }

  private draw(
    canvas: HTMLCanvasElement,
    request: { text: string; reference: string; versionLabel: string },
    theme: ShareTheme,
    format: ShareFormat,
  ): void {
    drawShareCard(canvas, request, theme, format, this.logo);
  }

  private toBlob(): Promise<Blob | null> {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas) return Promise.resolve(null);
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  private ensureLogo(): Promise<void> {
    this.logoLoading ??= new Promise<void>(resolve => {
      const image = new Image();
      image.onload = () => {
        this.logo = image;
        resolve();
      };
      image.onerror = () => resolve();
      image.src = '/logo.png';
    });
    return this.logoLoading;
  }

  private flash(key: string): void {
    this.status.set(this.translate.t(key));
    clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => this.status.set(''), 2200);
  }
}

function slug(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'verset'
  );
}
