import { Component, computed, effect, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { MoneyService } from '../../core/money.service';
import { ReportData, ReportPeriod } from '../../core/models';
import { KesPipe } from '../../core/kes.pipe';
import { BarChartComponent } from '../../shared/bar-chart';
import { DonutComponent, DonutSegment } from '../../shared/donut';

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
        <span class="divider"></span>
        <button class="chip export" (click)="download('csv')" [disabled]="!!exporting()">
          @if (exporting() === 'csv') { <span class="spin"></span> } @else { <i class="bi bi-filetype-csv"></i> } CSV
        </button>
        <button class="chip export" (click)="download('pdf')" [disabled]="!!exporting()">
          @if (exporting() === 'pdf') { <span class="spin"></span> } @else { <i class="bi bi-filetype-pdf"></i> } PDF
        </button>
      </div>
    </div>

    @if (loading()) { <div class="spinner"></div> }
    @else {
      <div class="grid cols-4">
        <div class="card stat"><div class="label">Total income</div><div class="value pos">{{ totals().income | kes }}</div></div>
        <div class="card stat"><div class="label">Total expenses</div><div class="value neg">{{ totals().expense | kes }}</div></div>
        <div class="card stat"><div class="label">Net</div><div class="value" [class.pos]="totals().net >= 0" [class.neg]="totals().net < 0">{{ totals().net | kes }}</div></div>
        <div class="card stat"><div class="label">Savings rate</div><div class="value">{{ totals().savingsRate }}%</div><div class="delta muted">of income kept</div></div>
      </div>

      @if (insights().length) {
        <div class="card mt-24 insights">
          <div class="card-head"><div><h3>Insights</h3><div class="sub">What the numbers say</div></div></div>
          <div class="card-pad">
            @for (ins of insights(); track ins.text) {
              <div class="insight" [class]="ins.kind">
                <span class="ic">{{ icon(ins.kind) }}</span><span>{{ ins.text }}</span>
              </div>
            }
          </div>
        </div>
      }

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
            @for (c of categories(); track c.name) {
              <div class="cat-bar">
                <div class="between" style="font-size:13px;margin-bottom:5px">
                  <span>{{ c.icon }} {{ c.name }}</span><b class="tabnum">{{ c.total | kes }}</b>
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
    .divider { width: 1px; height: 20px; background: var(--line); margin: 0 2px; }
    .chip.export { display: inline-flex; align-items: center; gap: 6px; }
    .chip.export:disabled { opacity: .6; cursor: default; }
    .insights .insight { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; padding: 7px 0; }
    .insights .insight + .insight { border-top: 1px solid var(--line); }
    .insight .ic { flex: none; }
    .insight.positive { color: var(--income); }
    .insight.warning { color: var(--expense); }
    .insight.neutral { color: var(--ink-2); }
    .spin { width: 13px; height: 13px; border: 2px solid var(--line); border-top-color: var(--brand); border-radius: 50%; display: inline-block; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 720px) { .reports-split { grid-template-columns: 1fr !important; } }
  `],
})
export class ReportsComponent {
  private api = inject(ApiService);
  private money = inject(MoneyService);

  period = signal<ReportPeriod>('6');
  loading = signal(true);
  exporting = signal<'csv' | 'pdf' | null>(null);
  private data = signal<ReportData | null>(null);

  constructor() {
    // Refetch whenever the period changes (runs once on init too).
    effect(() => {
      const p = this.period();
      this.loading.set(true);
      this.api.report(p).subscribe({
        next: (d) => { this.data.set(d); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    });
  }

  totals = computed(() => this.data()?.totals ?? { income: 0, expense: 0, net: 0, savingsRate: 0 });
  monthly = computed(() => this.data()?.monthly ?? []);
  categories = computed(() => this.data()?.categories ?? []);
  insights = computed(() => this.data()?.insights ?? []);
  expenseShort = computed(() => this.money.formatShort(this.totals().expense));

  channelSegments = computed<DonutSegment[]>(() =>
    (this.data()?.channels ?? []).map((c) => ({
      label: CHANNEL_META[c.channel]?.label ?? c.channel,
      value: c.total,
      color: CHANNEL_META[c.channel]?.color ?? '#94a3b8',
      icon: CHANNEL_META[c.channel]?.icon ?? '',
    })),
  );

  icon(kind: string): string {
    return kind === 'positive' ? '✅' : kind === 'warning' ? '⚠️' : '•';
  }

  download(format: 'csv' | 'pdf'): void {
    if (this.exporting()) return;
    this.exporting.set(format);
    this.api.downloadReport(this.period(), format).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pesawise-report-${this.period()}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(null);
      },
      error: () => this.exporting.set(null),
    });
  }
}
