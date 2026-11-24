import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../pipes/translate.pipe';
import { PlanService } from '../services/plan.service';
import type { PlanSummary } from '../services/plan.service';
import { TranslateService } from '../services/translate.service';
import { CUSTOM_PLAN_ID } from '../models/plan.model';
import type { PlanDay } from '../utils/plan-builder';
import { summarizeDay } from '../utils/plan-builder';

@Component({
  selector: 'app-plans',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="plans">
      <h1>{{ 'plans.title' | t }}</h1>

      @if (active(); as plan) {
        <section class="card active-card">
          <div class="card-head">
            <h2>{{ title(plan) }}</h2>
            <span class="badge">{{ 'plans.current' | t }}</span>
          </div>

          <div class="bar" role="progressbar" [attr.aria-valuenow]="plan.percent" aria-valuemin="0" aria-valuemax="100">
            <div class="bar-fill" [style.width.%]="plan.percent"></div>
          </div>
          <p class="meta">
            {{ 'plans.progress' | t: { percent: plan.percent, done: plan.doneDays, total: plan.totalDays } }}
          </p>

          @if (plan.currentDayIndex !== null && plan.next) {
            <p class="today">
              {{ 'plans.dayOf' | t: { n: plan.currentDayIndex + 1, total: plan.totalDays } }}
              · {{ dayLabel(plan.days[plan.currentDayIndex]) }}
            </p>
            <a class="primary-btn" [routerLink]="['/bible', plan.next.bookId, plan.next.chapter]">
              {{ 'plans.todayReading' | t }}
            </a>
          } @else {
            <p class="done">{{ 'plans.completed' | t }}</p>
          }

          <div class="actions">
            <button type="button" class="link-btn" (click)="stop()">{{ 'plans.stop' | t }}</button>
            <button type="button" class="link-btn danger" (click)="askReset(plan.id)">
              {{ confirmReset() === plan.id ? ('plans.confirmReset' | t) : ('plans.reset' | t) }}
            </button>
          </div>

          <details class="days">
            <summary>{{ 'plans.showDays' | t }}</summary>
            <ol class="day-list">
              @for (day of plan.days; track $index) {
                <li class="day" [class.done]="isDayDone(plan.id, $index)" [class.current]="$index === plan.currentDayIndex">
                  <button
                    type="button"
                    class="check"
                    [attr.aria-pressed]="isDayDone(plan.id, $index)"
                    [attr.aria-label]="'plans.toggleDay' | t: { n: $index + 1 }"
                    (click)="toggleDay($index)">
                    @if (isDayDone(plan.id, $index)) { ✓ }
                  </button>
                  <span class="day-num">{{ 'plans.day' | t: { n: $index + 1 } }}</span>
                  <span class="day-refs">
                    @for (segment of segments(day); track $index) {
                      <a [routerLink]="['/bible', segment.bookId, segment.from]">{{ segment.label }}</a>
                    }
                  </span>
                </li>
              }
            </ol>
          </details>
        </section>
      }

      <h2 class="section-title">{{ 'plans.choose' | t }}</h2>
      <div class="catalog">
        @for (plan of plans(); track plan.id) {
          <article class="card" [class.is-active]="plan.active">
            <h3>{{ title(plan) }}</h3>
            <p class="desc">{{ description(plan) }}</p>
            <p class="meta">
              {{ 'plans.length' | t: { days: plan.totalDays, chapters: plan.totalChapters } }}
            </p>

            @if (plan.started) {
              <div class="bar small"><div class="bar-fill" [style.width.%]="plan.percent"></div></div>
              <p class="meta">{{ 'plans.progressShort' | t: { percent: plan.percent } }}</p>
            }

            <div class="actions">
              @if (!plan.active) {
                <button type="button" class="primary-btn" (click)="start(plan.id)">
                  {{ (plan.started ? 'plans.resume' : 'plans.start') | t }}
                </button>
              }
              @if (plan.started && !plan.active) {
                <button type="button" class="link-btn danger" (click)="askReset(plan.id)">
                  {{ confirmReset() === plan.id ? ('plans.confirmReset' | t) : ('plans.reset' | t) }}
                </button>
              }
            </div>
          </article>
        }
      </div>

      <section class="card custom">
        <h3>{{ 'plans.custom.title' | t }}</h3>
        <p class="desc">{{ 'plans.custom.description' | t }}</p>
        <div class="form">
          <label>
            <span>{{ 'plans.custom.book' | t }}</span>
            <select #bookSelect (change)="customBook.set(bookSelect.value)">
              @for (book of books(); track book.id) {
                <option [value]="book.id" [selected]="book.id === customBook()">{{ bookName(book.id) }}</option>
              }
            </select>
          </label>
          <label>
            <span>{{ 'plans.custom.days' | t }}</span>
            <input
              #daysInput
              type="number"
              min="1"
              [max]="maxCustomDays()"
              [value]="customDays()"
              (input)="customDays.set(+daysInput.value)">
          </label>
        </div>
        @if (customError()) {
          <p class="error" role="alert">{{ 'plans.custom.error' | t }}</p>
        }
        <button type="button" class="primary-btn" (click)="createCustom()">
          {{ 'plans.custom.create' | t }}
        </button>
      </section>
    </div>
  `,
  styles: [`
    .plans { max-width: 640px; margin: 0 auto; padding: 24px 24px 48px; }
    h1 { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 20px; }
    h2 { font-size: 17px; font-weight: 600; color: var(--text-primary); margin: 0; }
    h3 { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 4px; }
    .section-title { margin: 28px 0 12px; color: var(--text-secondary); font-size: 16px; }

    .card {
      padding: 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
    }
    .active-card { border-color: var(--accent); }
    .card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    .badge {
      font-size: 11px; font-weight: 600; color: var(--on-accent); background: var(--accent);
      padding: 2px 10px; border-radius: 999px; white-space: nowrap;
    }

    .bar { height: 8px; background: var(--bg-tertiary); border-radius: 999px; overflow: hidden; }
    .bar.small { height: 5px; margin-top: 10px; }
    .bar-fill { height: 100%; background: var(--accent); border-radius: 999px; transition: width 0.3s ease; }

    .meta { font-size: 12px; color: var(--text-muted); margin: 6px 0 0; }
    .desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 0 0 6px; }
    .today { font-size: 14px; color: var(--text-secondary); margin: 14px 0 10px; }
    .done { font-size: 14px; color: var(--accent); font-weight: 600; margin: 14px 0 10px; }

    .actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 12px; }
    .primary-btn {
      display: inline-block; padding: 8px 18px; background: var(--accent); color: var(--on-accent);
      border: none; border-radius: var(--radius-md); font-size: 13px; font-weight: 600;
      text-decoration: none; cursor: pointer; font-family: inherit; transition: background-color 0.15s ease;
    }
    .primary-btn:hover { background: var(--accent-hover); text-decoration: none; }
    .link-btn {
      background: none; border: none; padding: 0; font-size: 12px; color: var(--text-muted);
      cursor: pointer; font-family: inherit; text-decoration: underline;
    }
    .link-btn:hover { color: var(--text-primary); }
    .link-btn.danger:hover { color: var(--danger); }

    .days { margin-top: 16px; border-top: 1px solid var(--border-light); padding-top: 12px; }
    .days summary { font-size: 13px; color: var(--accent); cursor: pointer; }
    .day-list { list-style: none; margin: 10px 0 0; padding: 0; max-height: 340px; overflow-y: auto; }
    .day { display: flex; align-items: baseline; gap: 10px; padding: 6px 4px; font-size: 13px; border-radius: var(--radius-sm); }
    .day.current { background: var(--bg-tertiary); }
    .day.done .day-refs, .day.done .day-num { opacity: 0.55; }
    .check {
      flex: none; width: 20px; height: 20px; align-self: center; padding: 0;
      border: 1.5px solid var(--border-dark); border-radius: 50%; background: transparent;
      color: var(--on-accent); font-size: 12px; line-height: 1; cursor: pointer;
    }
    .day.done .check { background: var(--accent); border-color: var(--accent); }
    .day-num { flex: none; width: 52px; color: var(--text-muted); }
    .day-refs { display: flex; flex-wrap: wrap; gap: 2px 10px; }
    .day-refs a { color: var(--text-primary); text-decoration: none; }
    .day-refs a:hover { color: var(--accent); }

    .catalog { display: grid; gap: 10px; }
    .card.is-active { border-color: var(--accent-light); }
    .custom { margin-top: 10px; }
    .form { display: flex; gap: 12px; flex-wrap: wrap; margin: 10px 0 12px; }
    .form label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-muted); flex: 1 1 160px; }
    .form select, .form input {
      padding: 7px 10px; background: var(--bg-primary); color: var(--text-primary);
      border: 1px solid var(--border-medium); border-radius: var(--radius-sm); font-size: 14px; font-family: inherit;
    }
    .error { font-size: 12px; color: var(--danger); margin: 0 0 8px; }
  `],
})
export class PlansComponent {
  private readonly planService = inject(PlanService);
  private readonly translate = inject(TranslateService);

  readonly plans = this.planService.plans;
  readonly active = this.planService.active;
  readonly books = this.planService.books;

  readonly confirmReset = signal<string | null>(null);
  readonly customBook = signal('');
  readonly customDays = signal(30);
  readonly customError = signal(false);

  readonly maxCustomDays = computed(
    () => this.books().find(book => book.id === this.selectedBook())?.chapters ?? 1,
  );

  private readonly selectedBook = computed(
    () => this.customBook() || (this.books()[0]?.id ?? ''),
  );

  start(id: string): void {
    this.confirmReset.set(null);
    this.planService.start(id);
  }

  stop(): void {
    this.planService.stop();
  }

  /** Réinitialisation en deux temps (pas de boîte de dialogue native). */
  askReset(id: string): void {
    if (this.confirmReset() === id) {
      this.planService.reset(id);
      this.confirmReset.set(null);
    } else {
      this.confirmReset.set(id);
    }
  }

  isDayDone(planId: string, index: number): boolean {
    return this.planService.isDayDone(planId, index);
  }

  toggleDay(index: number): void {
    const plan = this.active();
    if (!plan) return;
    this.planService.setDayDone(index, !this.planService.isDayDone(plan.id, index));
  }

  createCustom(): void {
    const ok = this.planService.createCustom(this.selectedBook(), this.customDays());
    this.customError.set(!ok);
  }

  bookName(bookId: string): string {
    const book = this.books().find(item => item.id === bookId);
    const locale = this.translate.currentLocale();
    return book?.name[locale] ?? book?.name['en'] ?? bookId;
  }

  title(plan: PlanSummary): string {
    if (plan.id === CUSTOM_PLAN_ID && plan.custom) {
      return this.translate.t('plans.custom.name', { book: this.bookName(plan.custom.bookId) });
    }
    return this.translate.t(`plans.catalog.${plan.id}.title`);
  }

  description(plan: PlanSummary): string {
    if (plan.id === CUSTOM_PLAN_ID && plan.custom) {
      return this.translate.t('plans.custom.summary', { days: plan.custom.days });
    }
    return this.translate.t(`plans.catalog.${plan.id}.description`);
  }

  segments(day: PlanDay): { bookId: string; from: number; label: string }[] {
    return summarizeDay(day).map(segment => ({
      bookId: segment.bookId,
      from: segment.from,
      label:
        `${this.bookName(segment.bookId)} ${segment.from}` +
        (segment.to > segment.from ? `–${segment.to}` : ''),
    }));
  }

  dayLabel(day: PlanDay): string {
    return this.segments(day)
      .map(segment => segment.label)
      .join(', ');
  }
}
