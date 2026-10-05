import { Component, inject } from '@angular/core';
import { TranslatePipe } from '../pipes/translate.pipe';
import { ExternalService } from '../services/external.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="about">
      <img class="about-logo" src="/logo.png" alt="Vivum" width="72" height="72">
      <h1>{{ 'about.title' | t }}</h1>
      <p class="about-description">{{ 'about.description' | t }}</p>

      <ul class="about-features">
        <li>{{ 'about.f1' | t }}</li>
        <li>{{ 'about.f2' | t }}</li>
        <li>{{ 'about.f3' | t }}</li>
      </ul>

      <p class="about-tech">{{ 'about.tech' | t }}</p>

      <p class="about-credit">
        {{ 'about.developedBy' | t }}
        <a
          class="about-credit-link"
          href="https://github.com/Martzcode"
          (click)="openExternal($event, 'https://github.com/Martzcode')">Martzcode</a>
      </p>

      <a
        class="about-link"
        href="https://github.com/Martzcode/Vivum"
        (click)="openExternal($event, 'https://github.com/Martzcode/Vivum')">
        {{ 'about.github' | t }}
      </a>
    </div>
  `,
  styles: [`
    .about {
      max-width: 600px;
      margin: 0 auto;
      padding: 48px 24px;
      text-align: center;
    }

    .about-logo {
      width: 72px;
      height: 72px;
      object-fit: contain;
      margin-bottom: 16px;
    }

    h1 {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 12px;
    }

    .about-description {
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.6;
      margin: 0 0 24px;
    }

    .about-features {
      list-style: none;
      margin: 0 0 24px;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .about-features li {
      font-size: 13px;
      color: var(--text-secondary);
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      padding: 10px 16px;
    }

    .about-tech {
      font-size: 12px;
      color: var(--text-muted);
      margin: 0 0 8px;
    }

    .about-credit {
      font-size: 12px;
      color: var(--text-muted);
      margin: 0 0 24px;
    }

    .about-credit-link {
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
    }

    .about-credit-link:hover {
      text-decoration: underline;
    }

    .about-link {
      display: inline-block;
      padding: 10px 28px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      color: var(--accent);
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .about-link:hover {
      background: var(--accent);
      color: var(--bg-primary);
      border-color: var(--accent);
      text-decoration: none;
    }
  `]
})
export class AboutComponent {
  private external = inject(ExternalService);

  openExternal(event: Event, url: string) {
    event.preventDefault();
    this.external.open(url);
  }
}
