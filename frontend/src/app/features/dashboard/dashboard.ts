import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Budget, DashboardSummary } from '../../core/models';
import { KesPipe } from '../../core/kes.pipe';
import { MoneyService } from '../../core/money.service';
import { fmtDay } from '../../core/format';
import { BarChartComponent } from '../../shared/bar-chart';
import { DonutComponent, DonutSegment } from '../../shared/donut';
import { RingComponent } from '../../shared/ring';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, LowerCasePipe, KesPipe, BarChartComponent, DonutComponent, RingComponent],
  template: `
    @if (loading()) {
      <div class="spinner"></div>
    } @else if (data(); as d) {
      <!-- Stat tiles -->
      <div class="grid cols-4">
        <div class="card stat hover">
          <div class="label"><span class="tileicon" style="background:var(--brand-soft);color:var(--brand-strong)"><i class="bi bi-wallet2"></i></span> Net worth</div>
          <div class="value">{{ d.totals.netWorth | kes }}</div>
          <div class="delta" [class.up]="d.totals.monthNet >= 0" [class.down]="d.totals.monthNet < 0">
            <i class="bi" [class]="d.totals.monthNet >= 0 ? 'bi-arrow-up-right' : 'bi-arrow-down-right'"></i> {{ d.totals.monthNet | kes }} this month
          </div>
        </div>
        <div class="card stat hover">
          <div class="label"><span class="tileicon" style="background:color-mix(in srgb,var(--series-1) 15%,transparent);color:var(--series-1)"><i class="bi bi-bank"></i></span> Total balance</div>
          <div class="value">{{ d.totals.totalBalance | kes }}</div>
          <div class="delta muted">across {{ d.accounts.length }} accounts</div>
        </div>
        <div class="card stat hover">
          <div class="label"><span class="tileicon" style="background:color-mix(in srgb,var(--income) 16%,transparent);color:var(--income)"><i class="bi bi-graph-up-arrow"></i></span> Income · this month</div>
          <div class="value pos">{{ d.totals.monthIncome | kes }}</div>
          <div class="delta muted">gross earnings</div>
        </div>
        <div class="card stat hover">
          <div class="label"><span class="tileicon" style="background:color-mix(in srgb,var(--expense) 16%,transparent);color:var(--expense)"><i class="bi bi-graph-down-arrow"></i></span> Expenses · this month</div>
          <div class="value neg">{{ d.totals.monthExpense | kes }}</div>
          <div class="delta muted">total spend</div>
        </div>
      </div>

      <!-- Charts row -->
      <div class="grid split mt-24">
        <div class="card">
          <div class="card-head">
            <div><h3>Income vs Expenses</h3><div class="sub">Last 6 months</div></div>
            <div class="row gap-16">
              <span class="row gap-6" style="font-size:12.5px;color:var(--ink-2)"><span class="dot" style="background:var(--income)"></span>Income</span>
              <span class="row gap-6" style="font-size:12.5px;color:var(--ink-2)"><span class="dot" style="background:var(--expense)"></span>Expense</span>
            </div>
          </div>
          <div class="card-pad"><app-bar-chart [data]="d.monthlySeries" /></div>
        </div>

        <div class="card">
          <div class="card-head"><div><h3>Spending</h3><div class="sub">This month by category</div></div></div>
          <div class="card-pad" style="display:flex;flex-direction:column;align-items:center;gap:14px">
            @if (donutSegments().length) {
              <app-donut [segments]="donutSegments()" [centerValue]="totalSpendShort()" centerLabel="spent this month" />
              <div class="legend">
                @for (s of donutSegments(); track s.label) {
                  <div class="leg-row">
                    <span class="dot" [style.background]="s.color"></span>
                    <span class="leg-name">{{ s.icon }} {{ s.label }}</span>
                    <span class="leg-val tabnum">{{ s.value | kes }}</span>
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
        <div class="card mt-24">
          <div class="card-head">
            <div class="row" style="gap:12px">
              <span class="tileicon" [style.background]="tint(b.color)" [style.color]="b.color" style="font-size:18px">{{ b.icon }}</span>
              <div><h3>{{ b.name }}</h3><div class="sub">{{ b.totalSpent | kes }} of {{ b.totalLimit | kes }} spent this month</div></div>
            </div>
            <a routerLink="/budgets" class="btn btn-sm btn-ghost">Manage <i class="bi bi-arrow-right-short"></i></a>
          </div>
          <div class="card-pad">
            <div class="progress thick" [class.over]="b.totalSpent > b.totalLimit">
              <span [style.width.%]="pct(b.totalSpent, b.totalLimit)" [style.background]="b.totalSpent > b.totalLimit ? 'var(--critical)' : 'var(--brand)'"></span>
            </div>
            <div class="grid cols-3 mt-16">
              @for (it of topItems(b); track it.id) {
                <div>
                  <div class="row between" style="gap:8px">
                    <span style="font-weight:600;font-size:13px">{{ it.icon }} {{ it.label }}</span>
                    <span class="tabnum" style="font-size:12px" [class.neg]="it.over">{{ it.spent | kes }}</span>
                  </div>
                  <div class="progress mt-8" [class.over]="it.over"><span [style.width.%]="pct(it.spent || 0, it.limitAmount)" [style.background]="it.over ? 'var(--critical)' : it.color"></span></div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Savings + Loans -->
      <div class="grid cols-2 mt-24">
        <div class="card">
          <div class="card-head"><div><h3>Savings goals</h3><div class="sub">{{ d.savingsGoals.length }} active</div></div><a routerLink="/savings" class="btn btn-sm btn-ghost">View all <i class="bi bi-arrow-right-short"></i></a></div>
          <div class="card-pad" style="display:flex;flex-direction:column;gap:16px">
            @for (g of d.savingsGoals.slice(0, 4); track g.id) {
              <div class="row" style="gap:16px">
                <app-ring [progress]="g.progress" [color]="g.color" [size]="66" />
                <div style="flex:1;min-width:0">
                  <div class="between"><b>{{ g.icon }} {{ g.name }}</b><span class="tabnum">{{ g.savedAmount | kes }}</span></div>
                  <div class="muted" style="font-size:12.5px;margin-top:2px">of {{ g.targetAmount | kes }} · {{ g.remaining | kes }} to go</div>
                </div>
              </div>
            } @empty { <div class="empty"><div class="big">🎯</div>No savings goals yet.</div> }
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div><h3>Active loans</h3><div class="sub">Outstanding {{ totalDebt() | kes }}</div></div><a routerLink="/loans" class="btn btn-sm btn-ghost">View all <i class="bi bi-arrow-right-short"></i></a></div>
          <div class="card-pad" style="display:flex;flex-direction:column;gap:16px">
            @for (l of activeLoans(); track l.id) {
              <div>
                <div class="between"><b><i class="bi bi-bank2"></i> {{ l.lender }}</b><span class="tabnum neg">{{ l.outstanding | kes }}</span></div>
                <div class="progress mt-8"><span [style.width.%]="l.progress * 100" style="background:var(--series-1)"></span></div>
                <div class="between muted" style="font-size:12px;margin-top:6px">
                  <span>{{ (l.progress * 100).toFixed(0) }}% repaid</span>
                  <span>{{ l.monthlyPayment | kes }}/mo · {{ l.interestRate }}% {{ l.interestType | lowercase }}</span>
                </div>
              </div>
            } @empty { <div class="empty"><div class="big">✅</div>No active loans. Debt-free!</div> }
          </div>
        </div>
      </div>

      <!-- Recent transactions -->
      <div class="card mt-24">
        <div class="card-head"><div><h3>Recent transactions</h3></div><a routerLink="/transactions" class="btn btn-sm btn-ghost">See all <i class="bi bi-arrow-right-short"></i></a></div>
        <div class="table-wrap">
          <table class="table">
            <tbody>
              @for (t of d.recentTransactions; track t.id) {
                <tr>
                  <td style="width:44px"><div class="txicon" [style.background]="tint2(t.category?.color)">{{ t.category?.icon || (t.type === 'INCOME' ? '💰' : '🧾') }}</div></td>
                  <td>
                    <div style="font-weight:600">{{ t.note || t.category?.name || (t.type === 'INCOME' ? 'Income' : 'Expense') }}</div>
                    <div class="muted" style="font-size:12px">{{ t.category?.name }}</div>
                  </td>
                  <td><span class="badge">{{ channelLabel(t.channel) }}</span></td>
                  <td class="muted" style="font-size:12.5px">{{ day(t.date) }}</td>
                  <td class="num" style="font-weight:650" [class.pos]="t.type === 'INCOME'" [class.neg]="t.type === 'EXPENSE'">
                    {{ t.type === 'INCOME' ? '+' : '−' }}{{ t.amount | kes }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    } @else {
      <div class="empty"><div class="big">⚠️</div>Couldn't load your dashboard. Is the API running?</div>
    }
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private money = inject(MoneyService);
  data = signal<DashboardSummary | null>(null);
  activeBudget = signal<Budget | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    this.api.dashboard().subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.budgets().subscribe({
      next: (bs) => this.activeBudget.set(bs.find((b) => b.isActive) ?? bs[0] ?? null),
    });
  }

  activeLoans = computed(() => (this.data()?.loans.filter((l) => l.status === 'ACTIVE') ?? []).slice(0, 4));
  totalDebt = computed(() => this.data()?.totals.totalDebt ?? 0);

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
  tint(color: string): string { return `color-mix(in srgb, ${color} 15%, transparent)`; }

  channelLabel(ch: string): string {
    return ch === 'MPESA' ? 'M-Pesa' : ch.charAt(0) + ch.slice(1).toLowerCase();
  }
  day(iso: string): string { return fmtDay(iso); }
  tint2(color?: string): string {
    return color ? `color-mix(in srgb, ${color} 16%, transparent)` : 'var(--surface-2)';
  }
}
