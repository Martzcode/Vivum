import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-not-found',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="not-found">
      <p class="code">404</p>
      <h1>{{ 'notFound.title' | t }}</h1>
      <p class="text">{{ 'notFound.text' | t }}</p>
      <a class="back-cta" routerLink="/">{{ 'notFound.back' | t }}</a>
    </div>
  `,
  styles: [`
    .not-found {
      max-width: 480px;
      margin: 0 auto;
      padding: 96px 24px;
      text-align: center;
    }

    .code {
      margin: 0 0 8px;
      font-size: 40px;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: 0.04em;
    }

    h1 {
      margin: 0 0 12px;
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .text {
      margin: 0 0 28px;
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    .back-cta {
      display: inline-block;
      padding: 10px 24px;
      background: var(--accent);
      color: var(--bg-primary);
      border-radius: var(--radius-md);
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
    }

    .back-cta:hover { background: var(--accent-hover); text-decoration: none; }
  `],
})
export class NotFoundComponent {}
