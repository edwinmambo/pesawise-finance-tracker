import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { Transaction } from '../../core/models';
import { KesPipe } from '../../core/kes.pipe';
import { BarChartComponent, MonthPoint } from '../../shared/bar-chart';
import { DonutComponent, DonutSegment } from '../../shared/donut';

type Period = '1' | '3' | '6' | 'all';
const CHANNEL_META: Record<string, { label: string; color: string; icon: string }> = {
  MPESA: { label: 'M-Pesa', color: '#1baf7a', icon: '📱' },
  BANK: { label: 'Bank', color: '#2a78d6', icon: '🏦' },
  CASH: { label: 'Cash', color: '#eda100', icon: '💵' },
  SACCO: { label: 'SACCO', color: '#4a3aa7', icon: '🤝' },
};

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [KesPipe, BarChartComponent, DonutComponent],
  template: `
    <div class="page-actions">
      <div><h2 class="section-title">Reports</h2><div class="muted">Analyse your income and spending</div></div>
      <div class="row wrap gap-8">
        <button class="chip" [class.active]="period() === '1'" (click)="period.set('1')">This month</button>
        <button class="chip" [class.active]="period() === '3'" (click)="period.set('3')">3 months</button>
        <button class="chip" [class.active]="period() === '6'" (click)="period.set('6')">6 months</button>
        <button class="chip" [class.active]="period() === 'all'" (click)="period.set('all')">All time</button>
      </div>
    </div>

    @if (loading()) { <div class="spinner"></div> }
    @else {
      <div class="grid cols-4">
        <div class="card stat"><div class="label">Total income</div><div class="value pos">{{ totals().income | kes }}</div></div>
        <div class="card stat"><div class="label">Total expenses</div><div class="value neg">{{ totals().expense | kes }}</div></div>
        <div class="card stat"><div class="label">Net</div><div class="value" [class.pos]="totals().net >= 0" [class.neg]="totals().net < 0">{{ totals().net | kes }}</div></div>
        <div class="card stat"><div class="label">Savings rate</div><div class="value">{{ savingsRate() }}%</div><div class="delta muted">of income kept</div></div>
      </div>

      <div class="card mt-24">
        <div class="card-head"><div><h3>Income vs Expenses</h3><div class="sub">Monthly</div></div>
          <div class="row gap-16">
            <span class="row" style="gap:6px;font-size:12.5px;color:var(--ink-2)"><span class="dot" style="background:var(--income)"></span>Income</span>
            <span class="row" style="gap:6px;font-size:12.5px;color:var(--ink-2)"><span class="dot" style="background:var(--expense)"></span>Expense</span>
          </div>
        </div>
        <div class="card-pad">
          @if (monthly().length) { <app-bar-chart [data]="monthly()" /> }
          @else { <div class="empty">No data for this period.</div> }
        </div>
      </div>

      <div class="grid mt-24 reports-split" style="grid-template-columns: 1.4fr 1fr;">
        <div class="card">
          <div class="card-head"><div><h3>Top spending categories</h3></div></div>
          <div class="card-pad">
            @for (c of categoryBars(); track c.label) {
              <div class="cat-bar">
                <div class="between" style="font-size:13px;margin-bottom:5px">
                  <span>{{ c.icon }} {{ c.label }}</span><b class="tabnum">{{ c.value | kes }}</b>
                </div>
                <div class="progress"><span [style.width.%]="c.pct" [style.background]="c.color"></span></div>
              </div>
            } @empty { <div class="empty">No expenses in this period.</div> }
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><h3>By channel</h3><div class="sub">Where money is spent</div></div></div>
          <div class="card-pad" style="display:flex;flex-direction:column;align-items:center;gap:14px">
            @if (channelSegments().length) {
              <app-donut [segments]="channelSegments()" [centerValue]="expenseShort()" centerLabel="total spent" />
              <div class="legend">
                @for (s of channelSegments(); track s.label) {
                  <div class="leg-row"><span class="dot" [style.background]="s.color"></span><span class="leg-name">{{ s.icon }} {{ s.label }}</span><span class="leg-val tabnum">{{ s.value | kes }}</span></div>
                }
              </div>
            } @else { <div class="empty">No expenses in this period.</div> }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cat-bar { margin-bottom: 16px; }
    .cat-bar:last-child { margin-bottom: 0; }
    .legend { width: 100%; display: flex; flex-direction: column; gap: 8px; }
    .leg-row { display: flex; align-items: center; gap: 9px; font-size: 13px; }
    .leg-name { color: var(--ink-2); }
    .leg-val { margin-left: auto; font-weight: 600; }
    @media (max-width: 720px) { .reports-split { grid-template-columns: 1fr !important; } }
  `],
})
export class ReportsComponent implements OnInit {
  private api = inject(ApiService);
  private txns = signal<Transaction[]>([]);
  loading = signal(true);
  period = signal<Period>('6');

  ngOnInit(): void {
    this.api.transactions().subscribe((t) => { this.txns.set(t); this.loading.set(false); });
  }

  private cutoff = computed(() => {
    const p = this.period();
    if (p === 'all') return '0000-00-00';
    const months = parseInt(p, 10);
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth() - (months - 1), 1);
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
  });

  private filtered = computed(() => this.txns().filter((t) => t.date.split('T')[0] >= this.cutoff()));

  totals = computed(() => {
    let income = 0, expense = 0;
    for (const t of this.filtered()) {
      if (t.type === 'INCOME') income += t.amount; else expense += t.amount;
    }
    return { income, expense, net: income - expense };
  });

  savingsRate = computed(() => {
    const { income, net } = this.totals();
    if (income <= 0) return 0;
    return Math.max(0, Math.round((net / income) * 100));
  });

  monthly = computed<MonthPoint[]>(() => {
    const map = new Map<string, MonthPoint>();
    for (const t of this.filtered()) {
      const ym = t.date.split('T')[0].slice(0, 7);
      if (!map.has(ym)) map.set(ym, { month: ym, income: 0, expense: 0 });
      const p = map.get(ym)!;
      if (t.type === 'INCOME') p.income += t.amount; else p.expense += t.amount;
    }
    return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
  });

  categoryBars = computed(() => {
    const map = new Map<string, { label: string; value: number; color: string; icon: string }>();
    for (const t of this.filtered()) {
      if (t.type !== 'EXPENSE') continue;
      const key = t.category?.name ?? 'Uncategorized';
      if (!map.has(key)) map.set(key, { label: key, value: 0, color: t.category?.color ?? '#94a3b8', icon: t.category?.icon ?? '❓' });
      map.get(key)!.value += t.amount;
    }
    const arr = [...map.values()].sort((a, b) => b.value - a.value).slice(0, 8);
    const max = Math.max(1, ...arr.map((a) => a.value));
    return arr.map((a) => ({ ...a, pct: (a.value / max) * 100 }));
  });

  channelSegments = computed<DonutSegment[]>(() => {
    const map = new Map<string, number>();
    for (const t of this.filtered()) {
      if (t.type !== 'EXPENSE') continue;
      map.set(t.channel, (map.get(t.channel) ?? 0) + t.amount);
    }
    return [...map.entries()]
      .map(([ch, value]) => ({ label: CHANNEL_META[ch]?.label ?? ch, value, color: CHANNEL_META[ch]?.color ?? '#94a3b8', icon: CHANNEL_META[ch]?.icon ?? '' }))
      .sort((a, b) => b.value - a.value);
  });

  expenseShort = computed(() => new KesPipe().transform(this.totals().expense));
}
