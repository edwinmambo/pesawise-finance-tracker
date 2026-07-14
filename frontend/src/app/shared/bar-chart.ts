import { Component, computed, inject, input, signal } from '@angular/core';
import { KesPipe } from '../core/kes.pipe';
import { MoneyService } from '../core/money.service';
import { PrivacyService } from '../core/privacy.service';
import { ThemeService } from '../core/theme.service';
import { incomeExpensePair } from './chart-colors';
import { monthLabel } from '../core/format';

export interface MonthPoint {
  month: string;
  income: number;
  expense: number;
}

const W = 720;
const H = 260;
const PAD = { l: 62, r: 14, t: 16, b: 42 };
const MAX_GROUP_W = 130; // cap so sparse data stays tidy instead of stretching
const MAX_BAR_W = 44;

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [KesPipe],
  template: `
    <div class="chart-wrap" [class.masked]="masked()">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="xMidYMid meet" class="chart-svg">
        <!-- gridlines -->
        @for (g of gridlines(); track g.v) {
          <line [attr.x1]="PAD.l" [attr.x2]="W - PAD.r" [attr.y1]="g.y" [attr.y2]="g.y"
                stroke="var(--grid)" stroke-width="1" vector-effect="non-scaling-stroke" />
        }
        <!-- bars -->
        @for (grp of groups(); track grp.month) {
          <rect class="bar" [attr.x]="grp.ix" [attr.y]="grp.incomeY" [attr.width]="barW()" [attr.height]="grp.incomeH"
                rx="4" [attr.fill]="colors().income" [style.opacity]="dim(grp.i)" [style.animation-delay.ms]="grp.i * 55" />
          <rect class="bar" [attr.x]="grp.ex" [attr.y]="grp.expenseY" [attr.width]="barW()" [attr.height]="grp.expenseH"
                rx="4" [attr.fill]="colors().expense" [style.opacity]="dim(grp.i)" [style.animation-delay.ms]="grp.i * 55 + 25" />
          <rect [attr.x]="grp.gx" [attr.y]="PAD.t" [attr.width]="groupW()" [attr.height]="H - PAD.t - PAD.b"
                fill="transparent" style="cursor:pointer"
                (mouseenter)="active.set(grp.i)" (mouseleave)="active.set(null)" />
        }
      </svg>
      <!-- Axis labels overlaid as real-px HTML so they stay legible on mobile
           (SVG text would shrink with the viewBox on narrow screens). -->
      <div class="axis-y">
        @for (g of gridlines(); track g.v) {
          <span class="gval" [style.top.%]="g.y / H * 100">{{ short(g.v) }}</span>
        }
      </div>
      <div class="axis-x">
        @for (grp of groups(); track grp.month) {
          <span class="xlab" [style.left.%]="grp.cx / W * 100">{{ grp.label }}</span>
        }
      </div>
      @if (!masked() && activeGrp(); as a) {
        <div class="tip" [style.left.%]="a.leftPct">
          <div class="tip-title">{{ a.full }}</div>
          <div class="tip-row"><span class="d" [style.background]="colors().income"></span>Income<b>{{ a.income | kes }}</b></div>
          <div class="tip-row"><span class="d" [style.background]="colors().expense"></span>Expense<b>{{ a.expense | kes }}</b></div>
          <div class="tip-row net">Net<b [class.pos]="a.income - a.expense >= 0" [class.neg]="a.income - a.expense < 0">{{ a.income - a.expense | kes }}</b></div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* The SVG fills .chart-wrap exactly (matching aspect ratio), so overlay
       labels positioned by % map straight onto viewBox coordinates. */
    .chart-wrap { position: relative; width: 100%; margin-inline: auto; }
    .chart-svg { width: 100%; height: auto; display: block; overflow: visible; }
    /* Y-axis value labels live in the left gutter (PAD.l = 62 / 720 ≈ 8.6%). */
    .axis-y { position: absolute; top: 0; left: 0; height: 100%; width: 8.6%; pointer-events: none; }
    .axis-y .gval { position: absolute; right: 5px; transform: translateY(-50%); font-size: 11px; color: var(--muted); font-family: var(--num-font); font-variant-numeric: tabular-nums; white-space: nowrap; transition: filter .22s ease; }
    /* X-axis month labels along the base band. */
    .axis-x { position: absolute; left: 0; right: 0; bottom: 0; height: 18px; pointer-events: none; }
    .axis-x .xlab { position: absolute; bottom: 0; transform: translateX(-50%); font-size: 12px; color: var(--muted); white-space: nowrap; }
    /* MPESA-style: blur the bars + value labels (real values underneath) when hidden. */
    .chart-wrap.masked .bar { filter: blur(6px); }
    .chart-wrap.masked .axis-y .gval { filter: blur(4px); }
    .bar { transform-box: fill-box; transform-origin: center bottom; animation: barGrow .55s cubic-bezier(.34,.12,.2,1) both; transition: opacity .15s, filter .22s ease; }
    @keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
    .tip {
      position: absolute; top: 6px; transform: translateX(-50%);
      background: var(--surface); border: 1px solid var(--border-2); border-radius: 10px;
      box-shadow: var(--shadow-lg); padding: 10px 12px; font-size: 12.5px; min-width: 150px;
      pointer-events: none; z-index: 5;
    }
    .tip-title { font-weight: 700; margin-bottom: 6px; font-size: 12px; }
    .tip-row { display: flex; align-items: center; gap: 7px; padding: 2px 0; color: var(--ink-2); }
    .tip-row b { margin-left: auto; color: var(--ink); font-variant-numeric: tabular-nums; }
    .tip-row.net { margin-top: 4px; padding-top: 6px; border-top: 1px solid var(--border); }
    .d { width: 9px; height: 9px; border-radius: 3px; }
  `],
})
export class BarChartComponent {
  private money = inject(MoneyService);
  private privacy = inject(PrivacyService);
  private theme = inject(ThemeService);

  data = input<MonthPoint[]>([]);
  readonly W = W; readonly H = H; readonly PAD = PAD;

  active = signal<number | null>(null);
  masked = computed(() => this.privacy.hidden());
  /** Distinct income/expense colour pair for the chosen accent (reactive). */
  colors = computed(() => incomeExpensePair(this.theme.accent(), this.theme.mode()));

  /** Axis label — real (unmasked) value; blurred via CSS when balances hidden. */
  short(v: number): string { return this.money.formatShort(v, false); }

  private max = computed(() => {
    const m = Math.max(1, ...this.data().flatMap((d) => [d.income, d.expense]));
    const mag = Math.pow(10, Math.floor(Math.log10(m)));
    return Math.ceil(m / mag) * mag;
  });

  private plotH = H - PAD.t - PAD.b;
  private plotW = W - PAD.l - PAD.r;
  private n = computed(() => Math.max(this.data().length, 1));

  // Cap the per-group width so a couple of data points don't stretch across the
  // whole plot; the cluster is then centred within the plot area.
  groupW = computed(() => Math.min(this.plotW / this.n(), MAX_GROUP_W));
  barW = computed(() => Math.min(this.groupW() * 0.3, MAX_BAR_W));
  private startX = computed(() => PAD.l + (this.plotW - this.groupW() * this.n()) / 2);

  gridlines = computed(() => {
    const max = this.max();
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const v = (max / steps) * i;
      const y = PAD.t + this.plotH - (v / max) * this.plotH;
      return { v, y };
    });
  });

  groups = computed(() => {
    const max = this.max();
    const gw = this.groupW();
    const bw = this.barW();
    const sx = this.startX();
    return this.data().map((d, i) => {
      const gx = sx + i * gw;
      const cx = gx + gw / 2;
      const incomeH = (d.income / max) * this.plotH;
      const expenseH = (d.expense / max) * this.plotH;
      return {
        i,
        month: d.month,
        label: monthLabel(d.month),
        gx,
        cx,
        ix: cx - bw - 3,
        ex: cx + 3,
        incomeH,
        expenseH,
        incomeY: PAD.t + this.plotH - incomeH,
        expenseY: PAD.t + this.plotH - expenseH,
        income: d.income,
        expense: d.expense,
      };
    });
  });

  activeGrp = computed(() => {
    const a = this.active();
    if (a === null) return null;
    const g = this.groups()[a];
    if (!g) return null;
    const [y] = g.month.split('-');
    const full = `${monthLabel(g.month)} ${y}`;
    return { ...g, full, leftPct: (g.cx / W) * 100 };
  });

  dim(i: number): number {
    const a = this.active();
    return a === null || a === i ? 1 : 0.4;
  }
}
