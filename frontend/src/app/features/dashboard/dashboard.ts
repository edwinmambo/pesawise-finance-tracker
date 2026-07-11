import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Budget, DashboardSummary } from '../../core/models';
import { MoneyService } from '../../core/money.service';
import { PrivacyService } from '../../core/privacy.service';
import { channelColor, channelLabel } from '../../core/channel-colors';
import { bankColor } from '../../core/bank-colors';
import { fmtDay } from '../../core/format';
import { MoneyComponent } from '../../shared/money';
import { BarChartComponent } from '../../shared/bar-chart';
import { DonutComponent, DonutSegment } from '../../shared/donut';
import { RingComponent } from '../../shared/ring';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, LowerCasePipe, MoneyComponent, BarChartComponent, DonutComponent, RingComponent],
  template: `
    @if (loading()) {
      <div class="spinner"></div>
    } @else if (data(); as d) {
      <!-- Digestible insight -->
      <div class="insight">
        <span class="ic"><i class="bi bi-stars"></i></span>
        <span>{{ insight() }}</span>
      </div>

      <!-- Overview tiles (clickable shortcuts) -->
      <div class="between" style="margin:18px 0 12px">
        <div class="section-title">Overview</div>
        <button class="eye-btn" (click)="toggle(hideTiles)" [attr.aria-label]="eff(hideTiles()) ? 'Show' : 'Hide'"><i class="bi" [class]="eff(hideTiles()) ? 'bi-eye-slash' : 'bi-eye'"></i></button>
      </div>
      <div class="grid cols-4">
        <a routerLink="/reports" class="card stat hover">
          <div class="label"><span class="tileicon" style="background:var(--brand-soft);color:var(--brand-strong)"><i class="bi bi-wallet2"></i></span> Net worth</div>
          <div class="value"><app-money [value]="d.totals.netWorth" [hidden]="hideTiles()" /></div>
          <div class="delta" [class.up]="d.totals.monthNet >= 0" [class.down]="d.totals.monthNet < 0">
            <i class="bi" [class]="d.totals.monthNet >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right'"></i> <app-money [value]="d.totals.monthNet" signed [hidden]="hideTiles()" /> this month
          </div>
        </a>
        <a routerLink="/settings" class="card stat hover">
          <div class="label"><span class="tileicon" style="background:color-mix(in srgb,var(--series-1) 15%,transparent);color:var(--series-1)"><i class="bi bi-bank"></i></span> Total balance</div>
          <div class="value"><app-money [value]="d.totals.totalBalance" [hidden]="hideTiles()" /></div>
          <div class="delta muted">across {{ d.accounts.length }} accounts</div>
        </a>
        <a routerLink="/transactions" class="card stat hover">
          <div class="label"><span class="tileicon" style="background:color-mix(in srgb,var(--income) 16%,transparent);color:var(--income)"><i class="bi bi-graph-up-arrow"></i></span> Income · this month</div>
          <div class="value" style="color:var(--income)"><app-money [value]="d.totals.monthIncome" [hidden]="hideTiles()" /></div>
          <div class="delta muted">gross earnings</div>
        </a>
        <a routerLink="/transactions" class="card stat hover">
          <div class="label"><span class="tileicon" style="background:color-mix(in srgb,var(--expense) 16%,transparent);color:var(--expense)"><i class="bi bi-graph-down-arrow"></i></span> Expenses · this month</div>
          <div class="value" style="color:var(--expense)"><app-money [value]="d.totals.monthExpense" [hidden]="hideTiles()" /></div>
          <div class="delta muted">total spend</div>
        </a>
      </div>

      <!-- Charts row -->
      <div class="grid split mt-24">
        <div class="card">
          <div class="card-head">
            <div><h3>Income vs Expenses</h3><div class="sub">Last 6 months</div></div>
            <div class="row gap-16">
              <span class="row gap-6" style="font-size:12.5px;color:var(--ink-2)"><span class="dot" style="background:var(--income)"></span>Income</span>
              <span class="row gap-6" style="font-size:12.5px;color:var(--ink-2)"><span class="dot" style="background:var(--expense)"></span>Expense</span>
              <button class="eye-btn" (click)="expand.set('bars')" aria-label="Expand"><i class="bi bi-arrows-fullscreen"></i></button>
            </div>
          </div>
          <div class="card-pad"><app-bar-chart [data]="d.monthlySeries" /></div>
        </div>

        <div class="card">
          <div class="card-head"><div><h3>Spending</h3><div class="sub">This month by category</div></div>
            <button class="eye-btn" (click)="expand.set('donut')" aria-label="Expand"><i class="bi bi-arrows-fullscreen"></i></button>
          </div>
          <div class="card-pad" style="display:flex;flex-direction:column;align-items:center;gap:14px">
            @if (donutSegments().length) {
              <app-donut [segments]="donutSegments()" [centerValue]="totalSpendShort()" centerLabel="spent this month" />
              <div class="legend">
                @for (s of donutSegments(); track s.label) {
                  <div class="leg-row">
                    <span class="dot" [style.background]="s.color"></span>
                    <span class="leg-name">{{ s.icon }} {{ s.label }}</span>
                    <app-money class="leg-val" [value]="s.value" />
                  </div>
                }
              </div>
            } @else {
              <div class="empty"><div class="big">🧾</div>No spending recorded this month yet.</div>
            }
          </div>
        </div>
      </div>

      <!-- Budget snapshot -->
      @if (activeBudget(); as b) {
        <a routerLink="/budgets" class="card mt-24 budget-snap" [style.--card-accent]="b.color" style="display:block">
          <div class="card-head">
            <div class="row" style="gap:12px">
              <span class="tileicon" [style.background]="tint(b.color)" [style.color]="b.color" style="font-size:18px">{{ b.icon }}</span>
              <div><h3>{{ b.name }}</h3><div class="sub">this month's plan</div></div>
            </div>
            <div class="row gap-8">
              <button class="eye-btn" (click)="toggle(hideBudget); $event.preventDefault(); $event.stopPropagation()"><i class="bi" [class]="eff(hideBudget()) ? 'bi-eye-slash' : 'bi-eye'"></i></button>
              <span class="btn btn-sm btn-ghost">Manage <i class="bi bi-arrow-right-short"></i></span>
            </div>
          </div>
          <div class="card-pad">
            <div class="between mb-2">
              <div class="tabnum" style="font-size:15px"><app-money [value]="b.totalSpent" [hidden]="hideBudget()" /> <span class="muted">of <app-money [value]="b.totalLimit" [hidden]="hideBudget()" /></span></div>
              <b class="tabnum" [style.color]="b.color">{{ pctInt(b.totalSpent, b.totalLimit) }}%</b>
            </div>
            <div class="progress thick" [class.over]="b.totalSpent > b.totalLimit">
              <span [style.width.%]="pct(b.totalSpent, b.totalLimit)" [style.background]="b.totalSpent > b.totalLimit ? 'var(--critical)' : b.color"></span>
            </div>
            <div class="grid cols-3 mt-16">
              @for (it of topItems(b); track it.id) {
                <div>
                  <div class="row between" style="gap:8px">
                    <span style="font-weight:600;font-size:13px">{{ it.icon }} {{ it.label }}</span>
                    <app-money [value]="it.spent" [hidden]="hideBudget()" />
                  </div>
                  <div class="progress mt-8" [class.over]="it.over"><span [style.width.%]="pct(it.spent || 0, it.limitAmount)" [style.background]="it.over ? 'var(--critical)' : it.color"></span></div>
                </div>
              }
            </div>
          </div>
        </a>
      }

      <!-- Savings + Loans -->
      <div class="grid cols-2 mt-24">
        <div class="card">
          <div class="card-head"><div><h3>Savings goals</h3><div class="sub">{{ d.savingsGoals.length }} active</div></div><a routerLink="/savings" class="btn btn-sm btn-ghost">View all <i class="bi bi-arrow-right-short"></i></a></div>
          <div class="card-pad" style="display:flex;flex-direction:column;gap:16px">
            @for (g of d.savingsGoals.slice(0, 4); track g.id) {
              <a [routerLink]="['/savings']" class="row" style="gap:16px;color:var(--ink)">
                <app-ring [progress]="g.progress" [color]="g.color" [size]="66" />
                <div style="flex:1;min-width:0">
                  <div class="between"><b>{{ g.icon }} {{ g.name }}</b><app-money [value]="g.savedAmount" /></div>
                  <div class="muted" style="font-size:12.5px;margin-top:2px">of <app-money [value]="g.targetAmount" /> · <app-money [value]="g.remaining" /> to go</div>
                </div>
              </a>
            } @empty { <div class="empty"><div class="big">🎯</div>No savings goals yet.</div> }
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><h3>Active loans</h3><div class="sub">Outstanding <app-money [value]="totalDebt()" /></div></div><a routerLink="/loans" class="btn btn-sm btn-ghost">View all <i class="bi bi-arrow-right-short"></i></a></div>
          <div class="card-pad" style="display:flex;flex-direction:column;gap:16px">
            @for (l of activeLoans(); track l.id) {
              <a routerLink="/loans" style="color:var(--ink)">
                <div class="between"><b><i class="bi bi-bank2" [style.color]="lenderColor(l)"></i> {{ l.lender }}</b><app-money class="neg" [value]="l.outstanding" /></div>
                <div class="progress mt-8"><span [style.width.%]="l.progress * 100" [style.background]="lenderColor(l)"></span></div>
                <div class="between muted" style="font-size:12px;margin-top:6px">
                  <span>{{ (l.progress * 100).toFixed(0) }}% repaid</span>
                  <span><app-money [value]="l.monthlyPayment" />/mo · {{ l.interestRate }}% {{ l.interestType | lowercase }}</span>
                </div>
              </a>
            } @empty { <div class="empty"><div class="big">✅</div>No active loans. Debt-free!</div> }
          </div>
        </div>
      </div>

      <!-- Recent transactions (compact) -->
      <div class="card mt-24">
        <div class="card-head">
          <div class="row" style="gap:10px"><h3>Recent transactions</h3>
            <button class="eye-btn" (click)="toggle(hideRecent)"><i class="bi" [class]="eff(hideRecent()) ? 'bi-eye-slash' : 'bi-eye'"></i></button>
          </div>
          <a routerLink="/transactions" class="btn btn-sm btn-ghost">See all <i class="bi bi-arrow-right-short"></i></a>
        </div>
        <div class="rtx">
          @for (t of d.recentTransactions; track t.id) {
            <a routerLink="/transactions" class="rtx-row">
              <span class="rtx-bar" [style.background]="chColor(t.channel)"></span>
              <span class="rtx-main">
                <span class="rtx-title">{{ t.note || t.category?.name || 'Transaction' }}</span>
                <span class="rtx-sub"><span class="ch" [style.color]="chColor(t.channel)">{{ chLabel(t.channel) }}</span> · {{ day(t.date) }}</span>
              </span>
              <app-money [value]="t.amount" signed [hidden]="hideRecent()" />
            </a>
          }
        </div>
      </div>
    } @else {
      <div class="empty"><div class="big">⚠️</div>Couldn't load your dashboard. Is the API running?</div>
    }

    <!-- Expanded chart modal -->
    @if (expand(); as ex) {
      @if (data(); as d) {
        <div class="overlay" (click)="expand.set(null)">
          <div class="modal wide" (click)="$event.stopPropagation()">
            <div class="modal-head"><h3>{{ ex === 'bars' ? 'Income vs Expenses' : 'Spending by category' }}</h3><button class="btn btn-icon btn-ghost" (click)="expand.set(null)"><i class="bi bi-x-lg"></i></button></div>
            <div class="modal-body">
              @if (ex === 'bars') {
                <app-bar-chart [data]="d.monthlySeries" />
                <div class="table-wrap mt-16"><table class="table"><thead><tr><th>Month</th><th class="num">Income</th><th class="num">Expense</th><th class="num">Net</th></tr></thead><tbody>
                  @for (m of d.monthlySeries; track m.month) {
                    <tr><td>{{ monthFull(m.month) }}</td><td class="num pos"><app-money [value]="m.income" /></td><td class="num neg"><app-money [value]="m.expense" /></td><td class="num"><app-money [value]="m.income - m.expense" signed /></td></tr>
                  }
                </tbody></table></div>
              } @else {
                <div style="display:flex;justify-content:center"><app-donut [segments]="donutSegments()" [size]="240" [centerValue]="totalSpendShort()" centerLabel="this month" /></div>
                <div class="table-wrap mt-16"><table class="table"><tbody>
                  @for (s of donutSegments(); track s.label) {
                    <tr><td style="width:34px"><span class="dot" [style.background]="s.color"></span></td><td>{{ s.icon }} {{ s.label }}</td><td class="num"><app-money [value]="s.value" /></td></tr>
                  }
                </tbody></table></div>
              }
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .insight { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-radius: 16px; font-size: 14px; font-weight: 550;
      background: linear-gradient(100deg, color-mix(in srgb, var(--brand) 14%, var(--surface)), var(--surface));
      border: 1px solid color-mix(in srgb, var(--brand) 24%, var(--border)); color: var(--ink); box-shadow: var(--shadow); }
    .insight .ic { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--brand); color: #fff; flex-shrink: 0; }
    a.card.stat { text-decoration: none; color: var(--ink); }
    .eye-btn { border: none; background: transparent; color: var(--muted); cursor: pointer; padding: 3px 6px; font-size: 14px; border-radius: 7px; line-height: 1; }
    .eye-btn:hover { color: var(--ink); background: var(--surface-2); }
    .budget-snap { text-decoration: none; }
    .mb-2 { margin-bottom: 12px; }
    .rtx { display: flex; flex-direction: column; }
    .rtx-row { display: flex; align-items: center; gap: 12px; padding: 11px 20px; border-bottom: 1px solid var(--border); color: var(--ink); transition: background .1s; }
    .rtx-row:last-child { border-bottom: none; }
    .rtx-row:hover { background: var(--surface-2); }
    .rtx-bar { width: 4px; align-self: stretch; min-height: 34px; border-radius: 3px; flex-shrink: 0; }
    .rtx-main { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .rtx-title { font-weight: 600; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rtx-sub { font-size: 11.5px; color: var(--muted); }
    .rtx-sub .ch { font-weight: 700; }
  `],
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private money = inject(MoneyService);
  private priv = inject(PrivacyService);
  data = signal<DashboardSummary | null>(null);
  activeBudget = signal<Budget | null>(null);
  loading = signal(true);

  hideTiles = signal<boolean | undefined>(undefined);
  hideBudget = signal<boolean | undefined>(undefined);
  hideRecent = signal<boolean | undefined>(undefined);
  expand = signal<'bars' | 'donut' | null>(null);

  ngOnInit(): void {
    this.api.dashboard().subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.budgets().subscribe({
      next: (bs) => this.activeBudget.set(bs.find((b) => b.isActive) ?? bs[0] ?? null),
    });
  }

  // per-card privacy: undefined = follow global, else local override
  eff(v: boolean | undefined): boolean { return v ?? this.priv.hidden(); }
  toggle(s: { set: (v: boolean) => void; (): boolean | undefined }): void { s.set(!this.eff(s())); }

  activeLoans = computed(() => (this.data()?.loans.filter((l) => l.status === 'ACTIVE') ?? []).slice(0, 4));
  totalDebt = computed(() => this.data()?.totals.totalDebt ?? 0);

  insight = computed(() => {
    const d = this.data();
    const b = this.activeBudget();
    if (!d) return '';
    const net = d.totals.monthNet;
    const netClause = net >= 0 ? 'you’re net positive this month' : 'you’re spending more than you earn this month';
    if (b && b.totalLimit > 0) {
      const p = this.pctInt(b.totalSpent, b.totalLimit);
      const status = p > 100 ? 'over budget — ease up' : p >= 80 ? 'getting close' : 'on track';
      return `You’re ${p}% through your ${b.name} — ${status}, and ${netClause}.`;
    }
    return `So far ${netClause}. Set up a budget to track your spending by category.`;
  });

  donutSegments = computed<DonutSegment[]>(() => {
    const cats = this.data()?.categoryBreakdown ?? [];
    const top = cats.slice(0, 7).map((c) => ({ label: c.name, value: c.total, color: c.color, icon: c.icon }));
    const rest = cats.slice(7);
    if (rest.length) {
      top.push({ label: 'Other', value: rest.reduce((s, c) => s + c.total, 0), color: '#94a3b8', icon: '➕' });
    }
    return top;
  });

  totalSpendShort = computed(() => {
    const total = (this.data()?.categoryBreakdown ?? []).reduce((s, c) => s + c.total, 0);
    return this.money.format(total);
  });

  topItems(b: Budget) { return [...b.items].sort((a, c) => (c.spent || 0) - (a.spent || 0)).slice(0, 3); }
  pct(a: number, b: number): number { return b > 0 ? Math.min((a / b) * 100, 100) : 0; }
  pctInt(a: number, b: number): number { return b > 0 ? Math.round((a / b) * 100) : 0; }
  tint(color: string): string { return `color-mix(in srgb, ${color} 15%, transparent)`; }
  lenderColor(l: { lender: string; lenderType: any }): string { return bankColor(l.lender, l.lenderType); }
  chColor(ch: any): string { return channelColor(ch); }
  chLabel(ch: string): string { return channelLabel(ch); }
  day(iso: string): string { return fmtDay(iso); }
  monthFull(ym: string): string {
    const [y, m] = ym.split('-');
    return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1]} ${y}`;
  }
}
