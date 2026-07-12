import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Cadence, RecurringRule, TransactionType, UpcomingOccurrence } from '../../core/models';
import { KesPipe } from '../../core/kes.pipe';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Component({
  selector: 'app-recurring',
  standalone: true,
  imports: [FormsModule, KesPipe],
  template: `
    <div class="page-actions">
      <div><h2 class="section-title">Recurring</h2><div class="muted">Automate rent, salary, subscriptions and bills.</div></div>
      <button class="btn ghost" (click)="runNow()" [disabled]="running()">
        {{ running() ? 'Running…' : 'Run due now' }}
      </button>
    </div>

    @if (toast()) { <div class="banner ok">✅ {{ toast() }}</div> }

    <div class="grid" style="grid-template-columns: 1.3fr 1fr; gap:20px; align-items:start">
      <!-- Rules list -->
      <div class="card">
        <div class="card-head"><div><h3>Your rules</h3></div></div>
        <div class="card-pad">
          @if (rules().length) {
            @for (r of rules(); track r.id) {
              <div class="rule" [class.off]="!r.active">
                <div class="rule-main">
                  <div class="rule-name">{{ r.name }}
                    <span class="badge" [class]="r.type.toLowerCase()">{{ r.type === 'INCOME' ? 'in' : 'out' }}</span>
                  </div>
                  <div class="rule-sub muted">{{ cadenceLabel(r) }} · next {{ r.nextRunAt }}</div>
                </div>
                <div class="rule-amt tabnum" [class.pos]="r.type === 'INCOME'" [class.neg]="r.type === 'EXPENSE'">{{ r.amount | kes }}</div>
                <div class="rule-actions">
                  <button class="icon-btn" [title]="r.active ? 'Pause' : 'Resume'" (click)="toggle(r)">
                    <i class="bi" [class]="r.active ? 'bi-pause-circle' : 'bi-play-circle'"></i>
                  </button>
                  <button class="icon-btn danger" title="Delete" (click)="remove(r)"><i class="bi bi-trash3"></i></button>
                </div>
              </div>
            }
          } @else { <div class="empty">No recurring rules yet — add one on the right.</div> }
        </div>
      </div>

      <!-- Create form -->
      <div class="card">
        <div class="card-head"><div><h3>New rule</h3></div></div>
        <div class="card-pad form">
          <label>Name<input class="input" [(ngModel)]="form.name" placeholder="Rent, Salary, Netflix…" /></label>
          <div class="two">
            <label>Type
              <select class="input" [(ngModel)]="form.type">
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
              </select>
            </label>
            <label>Amount<input class="input" type="number" min="1" [(ngModel)]="form.amount" placeholder="0" /></label>
          </div>
          <div class="two">
            <label>Frequency
              <select class="input" [(ngModel)]="form.cadence">
                <option value="MONTHLY">Monthly</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </label>
            @if (form.cadence === 'MONTHLY') {
              <label>Day of month<input class="input" type="number" min="1" max="31" [(ngModel)]="form.anchorDay" /></label>
            } @else {
              <label>Day of week
                <select class="input" [(ngModel)]="form.anchorDay">
                  @for (d of weekdays; track $index) { <option [value]="$index">{{ d }}</option> }
                </select>
              </label>
            }
          </div>
          <label>Starts (optional)<input class="input" type="date" [(ngModel)]="form.startDate" /></label>
          <button class="btn primary" (click)="create()" [disabled]="!form.name.trim() || !form.amount || saving()">
            {{ saving() ? 'Saving…' : 'Add rule' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Upcoming -->
    <div class="card mt-24">
      <div class="card-head"><div><h3>Upcoming</h3><div class="sub">Next 30 days</div></div></div>
      <div class="card-pad">
        @if (upcoming().length) {
          @for (o of upcoming(); track o.ruleId + o.date) {
            <div class="up-row">
              <span class="up-date tabnum">{{ o.date }}</span>
              <span class="up-name">{{ o.name }}</span>
              <span class="up-amt tabnum" [class.pos]="o.type === 'INCOME'" [class.neg]="o.type === 'EXPENSE'">{{ o.amount | kes }}</span>
            </div>
          }
        } @else { <div class="empty">Nothing scheduled in the next 30 days.</div> }
      </div>
    </div>
  `,
  styles: [`
    .input { width: 100%; padding: 9px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-2, var(--surface)); color: var(--ink); }
    .form { display: flex; flex-direction: column; gap: 12px; }
    .form label { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: var(--ink-2); }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .rule { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--line); }
    .rule:last-child { border-bottom: 0; }
    .rule.off { opacity: .5; }
    .rule-name { font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .rule-sub { font-size: 12px; }
    .badge { font-size: 10.5px; padding: 1px 7px; border-radius: 999px; border: 1px solid var(--line); text-transform: uppercase; }
    .badge.income { color: var(--income); } .badge.expense { color: var(--expense); }
    .icon-btn { background: none; border: 0; cursor: pointer; color: var(--ink-2); font-size: 17px; padding: 4px; }
    .icon-btn.danger:hover { color: var(--expense); }
    .up-row { display: grid; grid-template-columns: 110px 1fr auto; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--line); font-size: 13.5px; }
    .up-row:last-child { border-bottom: 0; }
    .up-date { color: var(--ink-2); }
    .banner.ok { background: color-mix(in srgb, var(--income) 12%, transparent); color: var(--income); padding: 10px 14px; border-radius: 10px; margin-bottom: 16px; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr !important; } }
  `],
})
export class RecurringComponent {
  private api = inject(ApiService);
  weekdays = WEEKDAYS;

  rules = signal<RecurringRule[]>([]);
  upcoming = signal<UpcomingOccurrence[]>([]);
  saving = signal(false);
  running = signal(false);
  toast = signal<string | null>(null);

  form: { name: string; type: TransactionType; amount: number | null; cadence: Cadence; anchorDay: number; startDate: string } = {
    name: '', type: 'EXPENSE', amount: null, cadence: 'MONTHLY', anchorDay: 1, startDate: '',
  };

  constructor() {
    this.load();
  }

  private load(): void {
    this.api.recurring().subscribe((r) => this.rules.set(r));
    this.api.upcomingRecurring(30).subscribe((u) => this.upcoming.set(u));
  }

  cadenceLabel(r: RecurringRule): string {
    return r.cadence === 'MONTHLY' ? `Monthly on day ${r.anchorDay}` : `Weekly on ${WEEKDAYS[r.anchorDay] ?? '—'}`;
  }

  create(): void {
    const f = this.form;
    if (!f.name.trim() || !f.amount || f.amount <= 0) return;
    this.saving.set(true);
    this.api
      .createRecurring({
        name: f.name.trim(),
        type: f.type,
        amount: Number(f.amount),
        cadence: f.cadence,
        anchorDay: Number(f.anchorDay),
        startDate: f.startDate || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.form = { name: '', type: 'EXPENSE', amount: null, cadence: 'MONTHLY', anchorDay: 1, startDate: '' };
          this.load();
        },
        error: () => this.saving.set(false),
      });
  }

  toggle(r: RecurringRule): void {
    this.api.updateRecurring(r.id, { active: !r.active }).subscribe(() => this.load());
  }

  remove(r: RecurringRule): void {
    this.api.deleteRecurring(r.id).subscribe(() => this.load());
  }

  runNow(): void {
    this.running.set(true);
    this.api.runRecurring().subscribe({
      next: ({ created }) => {
        this.running.set(false);
        this.toast.set(created > 0 ? `Posted ${created} due transaction${created === 1 ? '' : 's'}.` : 'Nothing was due.');
        this.load();
      },
      error: () => this.running.set(false),
    });
  }
}
