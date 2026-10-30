import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';
import { FavoritesService } from '../services/favorites.service';
import { ProgressService } from '../services/progress.service';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="privacy">
      <a class="back-link" routerLink="/about">← {{ 'nav.about' | t }}</a>

      <h1>{{ 'privacy.title' | t }}</h1>
      <p class="privacy-updated">{{ 'privacy.updated' | t }}</p>

      <p class="privacy-intro">{{ 'privacy.intro' | t }}</p>

      <section>
        <h2>{{ 'privacy.s1Title' | t }}</h2>
        <p>{{ 'privacy.s1Text' | t }}</p>
      </section>

      <section>
        <h2>{{ 'privacy.s2Title' | t }}</h2>
        <p>{{ 'privacy.s2Text' | t }}</p>
      </section>

      <section>
        <h2>{{ 'privacy.s3Title' | t }}</h2>
        <p>{{ 'privacy.s3Text' | t }}</p>
        <ul>
          <li>{{ 'privacy.s3Item1' | t }}</li>
          <li>{{ 'privacy.s3Item2' | t }}</li>
          <li>{{ 'privacy.s3Item3' | t }}</li>
        </ul>
      </section>

      <section>
        <h2>{{ 'privacy.s4Title' | t }}</h2>
        <p>{{ 'privacy.s4Text' | t }}</p>
      </section>

      <section>
        <h2>{{ 'privacy.s5Title' | t }}</h2>
        <p>{{ 'privacy.s5Text' | t }}</p>
      </section>

      <section>
        <h2>{{ 'privacy.s6Title' | t }}</h2>
        <p>{{ 'privacy.s6Text' | t }}</p>
      </section>

      <section>
        <h2>{{ 'privacy.s7Title' | t }}</h2>
        <p>{{ 'privacy.s7Text' | t }}</p>
      </section>

      <section>
        <h2>{{ 'privacy.s8Title' | t }}</h2>
        <p>{{ 'privacy.s8Text' | t }}</p>
      </section>

      <section class="manage">
        <h2>{{ 'privacy.manageTitle' | t }}</h2>
        <p>{{ 'privacy.manageText' | t }}</p>

        @if (cleared()) {
          <p class="manage-status" role="status">{{ 'privacy.cleared' | t }}</p>
        }

        <div class="manage-actions">
          <button
            type="button"
            class="clear-btn"
            [class.confirming]="confirming()"
            (click)="clearData()">
            {{ (confirming() ? 'privacy.clearConfirm' : 'privacy.clearData') | t }}
          </button>
          @if (confirming()) {
            <button type="button" class="cancel-btn" (click)="cancel()">
              {{ 'common.cancel' | t }}
            </button>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .privacy {
      max-width: 680px;
      margin: 0 auto;
      padding: 32px 24px 64px;
    }

    .back-link {
      display: inline-block;
      font-size: 13px;
      color: var(--text-muted);
      text-decoration: none;
      margin-bottom: 16px;
    }

    .back-link:hover {
      color: var(--accent);
    }

    h1 {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 4px;
    }

    .privacy-updated {
      font-size: 12px;
      color: var(--text-muted);
      margin: 0 0 16px;
    }

    .privacy-intro {
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 0 0 24px;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
    }

    section {
      margin-bottom: 20px;
    }

    h2 {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 8px;
    }

    p {
      font-size: 13.5px;
      color: var(--text-secondary);
      line-height: 1.65;
      margin: 0 0 8px;
    }

    ul {
      margin: 8px 0 0;
      padding-left: 20px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    li {
      font-size: 13.5px;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    .manage {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid var(--border-light);
    }

    .manage-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .clear-btn {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      color: #a33;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      transition: background-color 0.15s ease;
    }

    .clear-btn:hover { background: var(--bg-hover); }

    .clear-btn.confirming {
      color: #fff;
      background: #a33;
      border-color: #a33;
    }

    .cancel-btn {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
    }

    .manage-status {
      margin: 0;
      font-size: 12.5px;
      color: var(--accent);
      font-weight: 600;
    }
  `],
})
export class PrivacyComponent {
  private readonly favorites = inject(FavoritesService);
  private readonly progress = inject(ProgressService);

  readonly confirming = signal(false);
  readonly cleared = signal(false);

  clearData(): void {
    if (!this.confirming()) {
      this.cleared.set(false);
      this.confirming.set(true);
      return;
    }

    this.favorites.clear();
    this.progress.clear();
    this.confirming.set(false);
    this.cleared.set(true);
  }

  cancel(): void {
    this.confirming.set(false);
  }
}
