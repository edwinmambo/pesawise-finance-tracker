import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Category, Transaction, TransactionType } from '../../core/models';
import { MoneyComponent } from '../../shared/money';
import { MoneyService } from '../../core/money.service';
import { PrefsService } from '../../core/prefs.service';
import { fmtDate } from '../../core/format';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface DayCell {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  income: number;
  expense: number;
  net: number;
  count: number;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [FormsModule, MoneyComponent],
  template: `
    <div class="page-actions">
      <div><h2 class="section-title">Calendar</h2><div class="muted">Your income &amp; spending, day by day</div></div>
      <button class="btn btn-sm" (click)="today()"><i class="bi bi-calendar-check"></i> Today</button>
    </div>

    <!-- Month totals -->
    <div class="grid cols-3" style="margin-bottom:18px">
      <div class="card stat"><div class="label"><span class="tileicon" style="background:color-mix(in srgb,var(--income) 16%,transparent);color:var(--income)"><i class="bi bi-arrow-down-left"></i></span> Income</div><div class="value pos"><app-money [value]="monthIncome()" /></div></div>
      <div class="card stat"><div class="label"><span class="tileicon" style="background:color-mix(in srgb,var(--expense) 16%,transparent);color:var(--expense)"><i class="bi bi-arrow-up-right"></i></span> Spending</div><div class="value neg"><app-money [value]="monthExpense()" /></div></div>
      <div class="card stat"><div class="label"><span class="tileicon" style="background:var(--brand-soft);color:var(--brand-strong)"><i class="bi bi-wallet2"></i></span> Net</div><div class="value" [class.pos]="monthNet() >= 0" [class.neg]="monthNet() < 0"><app-money [value]="monthNet()" signed /></div></div>
    </div>

    <div class="card card-pad cal">
      <!-- In-grid month/year header -->
      <div class="cal-title">
        <button class="cal-nav" (click)="shift(-1)" aria-label="Previous month"><i class="bi bi-chevron-left"></i></button>
        <div class="cal-my"><span class="mo">{{ monthName() }}</span> <span class="yr">{{ cursor().y }}</span></div>
        <button class="cal-nav" (click)="shift(1)" aria-label="Next month"><i class="bi bi-chevron-right"></i></button>
      </div>

      @if (loading()) { <div class="spinner"></div> }
      @else {
        <div class="cal-grid head">
          @for (w of weekdays(); track w) { <div class="cal-wd">{{ w }}</div> }
        </div>
        <div class="cal-grid">
          @for (c of cells(); track c.key) {
            <button type="button" class="cal-cell" [class.out]="!c.inMonth" [class.today]="c.isToday"
                    [style.background]="cellBg(c)" (click)="openDay(c)">
              <span class="cal-day">{{ c.day }}</span>
              @if (c.count) {
                <span class="cal-amts">
                  @if (c.income) { <span class="pos">+{{ short(c.income) }}</span> }
                  @if (c.expense) { <span class="neg">−{{ short(c.expense) }}</span> }
                </span>
              }
            </button>
          }
        </div>
      }
    </div>

    <!-- Day detail modal -->
    @if (selected(); as day) {
      <div class="overlay" (click)="selected.set(null)">
        <div class="modal" style="max-width:480px;width:100%" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <div><h3>{{ prettyDate(day.key) }}</h3><div class="muted" style="font-size:12.5px">{{ dayTx().length }} transactions</div></div>
            <button class="btn btn-icon btn-ghost" (click)="selected.set(null)"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-body">
            @if (dayTx().length) {
              <div class="day-list">
                @for (t of dayTx(); track t.id) {
                  <div class="day-row">
                    <span class="txicon" [style.background]="tint(t.category?.color)">{{ t.category?.icon || (t.type === 'INCOME' ? '💰' : '🧾') }}</span>
                    <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13.5px">{{ t.note || t.category?.name || 'Transaction' }}</div><div class="muted" style="font-size:11.5px">{{ t.category?.name || channelLabel(t.channel) }}</div></div>
                    <app-money [value]="t.amount" signed />
                  </div>
                }
              </div>
            } @else { <div class="muted" style="text-align:center;padding:16px">Nothing on this day yet.</div> }

            <div class="quick mt-16">
              <div class="field-label">Quick add on this day</div>
              <div class="row gap-8" style="margin-bottom:10px">
                <button class="chip" [class.active]="qa.type === 'EXPENSE'" (click)="qa.type = 'EXPENSE'; qa.categoryId = ''" style="flex:1;justify-content:center">Expense</button>
                <button class="chip" [class.active]="qa.type === 'INCOME'" (click)="qa.type = 'INCOME'; qa.categoryId = ''" style="flex:1;justify-content:center">Income</button>
              </div>
              <div class="form-row">
                <div class="field"><input class="input" type="number" [(ngModel)]="qa.amount" placeholder="Amount" /></div>
                <div class="field"><select class="input" [(ngModel)]="qa.categoryId"><option value="">— Category —</option>@for (c of qaCategories(); track c.id) { <option [value]="c.id">{{ c.icon }} {{ c.name }}</option> }</select></div>
              </div>
              <input class="input" [(ngModel)]="qa.note" placeholder="Note (optional)" />
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="selected.set(null)">Close</button>
            <button class="btn btn-primary" (click)="quickAdd(day.key)" [disabled]="!qa.amount || saving()">{{ saving() ? 'Adding…' : 'Add' }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cal-title { display: flex; align-items: center; justify-content: center; gap: 18px; padding: 2px 0 16px; }
    .cal-my { font-size: 20px; font-weight: 700; letter-spacing: -.01em; min-width: 190px; text-align: center; }
    .cal-my .yr { font-family: var(--num-font); color: var(--muted); font-weight: 600; }
    .cal-nav { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface-2); color: var(--ink); cursor: pointer; display: grid; place-items: center; transition: background .12s, border-color .12s; }
    .cal-nav:hover { border-color: var(--brand); color: var(--brand-strong); }
    .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
    .cal-grid.head { margin-bottom: 8px; }
    .cal-wd { text-align: center; font-size: 11px; font-weight: 650; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
    .cal-cell {
      aspect-ratio: 1 / .92; border: 1px solid var(--border); border-radius: 12px; background: var(--surface-2);
      display: flex; flex-direction: column; align-items: flex-start; padding: 7px 8px; cursor: pointer;
      transition: transform .08s, border-color .12s, box-shadow .12s; overflow: hidden;
      animation: cellIn .3s ease both;
    }
    .cal-cell:hover { border-color: var(--brand); transform: translateY(-1px); box-shadow: var(--shadow); }
    .cal-cell.out { opacity: .4; }
    .cal-cell.today { border-color: var(--brand); box-shadow: 0 0 0 1px var(--brand); }
    .cal-day { font-weight: 650; font-size: 13px; font-family: var(--num-font); }
    .cal-amts { margin-top: auto; display: flex; flex-direction: column; gap: 1px; font-size: 10.5px; font-weight: 700; font-family: var(--num-font); font-variant-numeric: tabular-nums; line-height: 1.25; }
    @keyframes cellIn { from { opacity: 0; transform: scale(.96); } }
    @media (max-width: 560px) {
      .cal-grid { gap: 4px; }
      .cal-cell { border-radius: 9px; padding: 4px 5px; aspect-ratio: 1 / 1.05; }
      .cal-amts { font-size: 8.5px; }
      .cal-day { font-size: 11px; }
      .cal-my { font-size: 17px; min-width: 150px; }
    }
    .day-list { display: flex; flex-direction: column; gap: 10px; }
    .day-row { display: flex; align-items: center; gap: 11px; }
    .field-label { font-size: 12px; font-weight: 640; color: var(--ink-2); margin-bottom: 10px; }
    .quick { border-top: 1px solid var(--border); padding-top: 14px; }
  `],
})
export class CalendarComponent implements OnInit {
  private api = inject(ApiService);
  private money = inject(MoneyService);
  private prefs = inject(PrefsService);

  private now = new Date();
  cursor = signal<{ y: number; m: number }>({ y: this.now.getFullYear(), m: this.now.getMonth() });
  txns = signal<Transaction[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  saving = signal(false);

  weekdays = computed(() =>
    this.prefs.weekStart() === 'sun'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  );
  selected = signal<DayCell | null>(null);
  qa = { type: 'EXPENSE' as TransactionType, amount: null as number | null, categoryId: '', note: '' };

  private byDay = computed(() => {
    const map = new Map<string, { income: number; expense: number; count: number }>();
    for (const t of this.txns()) {
      const key = t.date.split('T')[0];
      const e = map.get(key) ?? { income: 0, expense: 0, count: 0 };
      if (t.type === 'INCOME') e.income += t.amount; else e.expense += t.amount;
      e.count++;
      map.set(key, e);
    }
    return map;
  });

  cells = computed<DayCell[]>(() => {
    const { y, m } = this.cursor();
    const map = this.byDay();
    const todayKey = ymd(this.now);
    const first = new Date(y, m, 1);
    const startOffset = this.prefs.weekStart() === 'sun' ? first.getDay() : (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const weeks = Math.ceil((startOffset + daysInMonth) / 7);
    const gridStart = new Date(y, m, 1 - startOffset);
    const out: DayCell[] = [];
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const key = ymd(d);
      const agg = map.get(key) ?? { income: 0, expense: 0, count: 0 };
      out.push({
        key, day: d.getDate(), inMonth: d.getMonth() === m, isToday: key === todayKey,
        income: agg.income, expense: agg.expense, net: agg.income - agg.expense, count: agg.count,
      });
    }
    return out;
  });

  monthIncome = computed(() => this.cells().filter((c) => c.inMonth).reduce((s, c) => s + c.income, 0));
  monthExpense = computed(() => this.cells().filter((c) => c.inMonth).reduce((s, c) => s + c.expense, 0));
  monthNet = computed(() => this.monthIncome() - this.monthExpense());
  monthName = computed(() => MONTHS[this.cursor().m]);

  dayTx = computed(() => {
    const key = this.selected()?.key;
    if (!key) return [];
    return this.txns().filter((t) => t.date.split('T')[0] === key);
  });
  qaCategories = computed(() => this.categories().filter((c) => c.kind === this.qa.type));

  ngOnInit(): void {
    this.api.categories().subscribe((c) => this.categories.set(c));
    this.reload();
  }
  reload(): void {
    this.loading.set(true);
    this.api.transactions().subscribe((t) => { this.txns.set(t); this.loading.set(false); });
  }

  shift(delta: number): void {
    const { y, m } = this.cursor();
    const d = new Date(y, m + delta, 1);
    this.cursor.set({ y: d.getFullYear(), m: d.getMonth() });
  }
  today(): void { this.cursor.set({ y: this.now.getFullYear(), m: this.now.getMonth() }); }

  openDay(c: DayCell): void {
    this.qa = { type: 'EXPENSE', amount: null, categoryId: '', note: '' };
    this.selected.set(c);
  }
  quickAdd(key: string): void {
    if (!this.qa.amount) return;
    this.saving.set(true);
    this.api.createTransaction({
      type: this.qa.type, amount: Number(this.qa.amount), date: key, channel: 'MPESA',
      categoryId: this.qa.categoryId || undefined, note: this.qa.note || undefined,
    }).subscribe({
      next: () => { this.saving.set(false); this.selected.set(null); this.reload(); },
      error: () => this.saving.set(false),
    });
  }

  cellBg(c: DayCell): string {
    if (!c.count) return 'var(--surface-2)';
    if (c.net > 0) return 'color-mix(in srgb, var(--income) 12%, var(--surface-2))';
    if (c.net < 0) return 'color-mix(in srgb, var(--expense) 12%, var(--surface-2))';
    return 'var(--surface-2)';
  }
  short(v: number): string { return this.money.formatShort(v); }
  tint(color?: string): string { return color ? `color-mix(in srgb, ${color} 16%, transparent)` : 'var(--surface-2)'; }
  channelLabel(ch: string): string { return ch === 'MPESA' ? 'M-Pesa' : ch.charAt(0) + ch.slice(1).toLowerCase(); }
  prettyDate(key: string): string { return fmtDate(key); }
}
