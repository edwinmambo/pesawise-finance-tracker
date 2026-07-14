import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UpperCasePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { MoneyService } from '../../core/money.service';
import { ThemeService } from '../../core/theme.service';
import { ToastService } from '../../core/toast.service';
import { ReportData, ReportPeriod } from '../../core/models';
import { MoneyComponent } from '../../shared/money';
import { BarChartComponent } from '../../shared/bar-chart';
import { DonutComponent, DonutSegment } from '../../shared/donut';
import { paletteColors } from '../../shared/chart-colors';

const CHANNEL_META: Record<string, { label: string; color: string; icon: string }> = {
  MPESA: { label: 'M-Pesa', color: '#1baf7a', icon: '📱' },
  BANK: { label: 'Bank', color: '#2a78d6', icon: '🏦' },
  CASH: { label: 'Cash', color: '#eda100', icon: '💵' },
  SACCO: { label: 'SACCO', color: '#4a3aa7', icon: '🤝' },
};

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule, UpperCasePipe, MoneyComponent, BarChartComponent, DonutComponent],
  template: `
    <div class="page-actions">
      <div><h2 class="section-title">Reports</h2><div class="muted">Analyse your income and spending</div></div>
      <div class="row wrap gap-8">
        <button class="chip" [class.active]="period() === '1'" (click)="period.set('1')">This month</button>
        <button class="chip" [class.active]="period() === '3'" (click)="period.set('3')">3 months</button>
        <button class="chip" [class.active]="period() === '6'" (click)="period.set('6')">6 months</button>
        <button class="chip" [class.active]="period() === 'all'" (click)="period.set('all')">All time</button>
        <span class="divider"></span>
        <button class="chip export" (click)="openExport()" [disabled]="!!exporting()">
          @if (exporting()) { <span class="spin"></span> Exporting… } @else { <i class="bi bi-download"></i> Export }
        </button>
      </div>
    </div>

    <!-- Export dialog: pick format + period before downloading -->
    @if (showExport()) {
      <div class="overlay" (click)="showExport.set(false)">
        <div class="modal" style="max-width:440px;width:100%" (click)="$event.stopPropagation()">
          <div class="modal-head"><h3>Export report</h3><button class="btn btn-icon btn-ghost" (click)="showExport.set(false)"><i class="bi bi-x-lg"></i></button></div>
          <div class="modal-body">
            <div class="field">
              <label>Format</label>
              <div class="segmented" style="width:100%">
                <button [class.active]="exportFormat() === 'csv'" (click)="exportFormat.set('csv')" style="flex:1"><i class="bi bi-filetype-csv"></i> CSV</button>
                <button [class.active]="exportFormat() === 'pdf'" (click)="exportFormat.set('pdf')" style="flex:1"><i class="bi bi-filetype-pdf"></i> PDF</button>
              </div>
            </div>
            <div class="field">
              <label>Period</label>
              <select class="input" [ngModel]="exportPeriod()" (ngModelChange)="exportPeriod.set($event)">
                <option value="1">This month</option>
                <option value="3">Last 3 months</option>
                <option value="6">Last 6 months</option>
                <option value="all">All time</option>
              </select>
            </div>
            <div class="muted" style="font-size:12.5px">Downloads <b>{{ exportFormat() | uppercase }}</b> for <b>{{ periodLabel(exportPeriod()) }}</b>.</div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="showExport.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="runExport()" [disabled]="!!exporting()"><i class="bi bi-download"></i> Download</button>
          </div>
        </div>
      </div>
    }

    @if (loading()) { <div class="spinner"></div> }
    @else {
      <div class="grid cols-4">
        <div class="card stat"><div class="label">Total income</div><div class="value pos"><app-money [value]="totals().income" /></div></div>
        <div class="card stat"><div class="label">Total expenses</div><div class="value neg"><app-money [value]="totals().expense" /></div></div>
        <div class="card stat"><div class="label">Net</div><div class="value"><app-money [value]="totals().net" signed /></div></div>
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
                  <span>{{ c.icon }} {{ c.name }}</span><b><app-money [value]="c.total" column /></b>
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
                  <div class="leg-row"><span class="dot" [style.background]="s.color"></span><span class="leg-name">{{ s.icon }} {{ s.label }}</span><app-money class="leg-val" [value]="s.value" column /></div>
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
  private theme = inject(ThemeService);
  private toast = inject(ToastService);

  period = signal<ReportPeriod>('6');
  loading = signal(true);
  exporting = signal<'csv' | 'pdf' | null>(null);
  private data = signal<ReportData | null>(null);

  // Export dialog state
  showExport = signal(false);
  exportFormat = signal<'csv' | 'pdf'>('csv');
  exportPeriod = signal<ReportPeriod>('6');

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
  insights = computed(() => this.data()?.insights ?? []);
  expenseShort = computed(() => this.money.formatShort(this.totals().expense));

  // Categories & channel breakdowns use the distinct harmonious palette.
  categories = computed(() => {
    const cats = this.data()?.categories ?? [];
    const palette = paletteColors(this.theme.mode(), cats.length);
    return cats.map((c, i) => ({ ...c, color: palette[i] }));
  });

  channelSegments = computed<DonutSegment[]>(() => {
    const chans = this.data()?.channels ?? [];
    const palette = paletteColors(this.theme.mode(), chans.length);
    return chans.map((c, i) => ({
      label: CHANNEL_META[c.channel]?.label ?? c.channel,
      value: c.total,
      color: palette[i],
      icon: CHANNEL_META[c.channel]?.icon ?? '',
    }));
  });

  icon(kind: string): string {
    return kind === 'positive' ? '✅' : kind === 'warning' ? '⚠️' : '•';
  }

  periodLabel(p: ReportPeriod): string {
    return { '1': 'this month', '3': 'the last 3 months', '6': 'the last 6 months', all: 'all time' }[p] ?? p;
  }

  openExport(): void {
    this.exportPeriod.set(this.period()); // default to what's on screen
    this.exportFormat.set('csv');
    this.showExport.set(true);
  }

  runExport(): void {
    if (this.exporting()) return;
    const format = this.exportFormat();
    const period = this.exportPeriod();
    this.showExport.set(false);
    this.exporting.set(format);
    this.toast.info(`Preparing ${format.toUpperCase()} for ${this.periodLabel(period)}…`);
    this.api.downloadReport(period, format).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pesawise-report-${period}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(null);
        this.toast.success(`${format.toUpperCase()} downloaded`);
      },
      error: () => { this.exporting.set(null); this.toast.error('Export failed — please try again'); },
    });
  }
}
