import { Component, computed, input, signal } from '@angular/core';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
  icon?: string;
}

@Component({
  selector: 'app-donut',
  standalone: true,
  template: `
    <div class="donut-wrap">
      <svg class="donut-svg" [attr.viewBox]="'0 0 ' + size() + ' ' + size()" [style.width.px]="size()" [style.height.px]="size()">
        <circle [attr.cx]="c()" [attr.cy]="c()" [attr.r]="r()" fill="none"
                [attr.stroke]="'var(--grid)'" [attr.stroke-width]="thickness()" />
        @for (seg of arcs(); track seg.label) {
          <circle [attr.cx]="c()" [attr.cy]="c()" [attr.r]="r()" fill="none"
                  [attr.stroke]="seg.color" [attr.stroke-width]="thickness()"
                  stroke-linecap="butt"
                  [attr.stroke-dasharray]="seg.dash"
                  [attr.stroke-dashoffset]="seg.offset"
                  [attr.transform]="'rotate(-90 ' + c() + ' ' + c() + ')'"
                  [style.opacity]="active() && active() !== seg.label ? 0.35 : 1"
                  style="transition: opacity .15s, stroke-width .15s; cursor: pointer;"
                  (mouseenter)="active.set(seg.label)" (mouseleave)="active.set(null)">
            <title>{{ seg.label }}: {{ seg.pct }}%</title>
          </circle>
        }
      </svg>
      <div class="donut-center">
        @if (activeSeg(); as a) {
          <div class="dc-icon">{{ a.icon || '' }}</div>
          <div class="dc-val">{{ a.pct }}%</div>
          <div class="dc-lbl">{{ a.label }}</div>
        } @else {
          <div class="dc-val">{{ centerValue() }}</div>
          <div class="dc-lbl">{{ centerLabel() }}</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .donut-wrap { position: relative; display: inline-grid; place-items: center; }
    .donut-svg { animation: donutIn .5s cubic-bezier(.34,.12,.2,1) both; transform-origin: center; }
    @keyframes donutIn { from { transform: rotate(-14deg) scale(.9); opacity: 0; } to { transform: rotate(0) scale(1); opacity: 1; } }
    .donut-center { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; pointer-events: none; }
    .dc-icon { font-size: 20px; }
    .dc-val { font-size: 20px; font-weight: 720; letter-spacing: -.02em; font-family: var(--num-font); font-variant-numeric: tabular-nums; }
    .dc-lbl { font-size: 11.5px; color: var(--muted); font-weight: 600; max-width: 110px; }
  `],
})
export class DonutComponent {
  segments = input<DonutSegment[]>([]);
  size = input(190);
  thickness = input(24);
  centerValue = input('');
  centerLabel = input('');

  active = signal<string | null>(null);

  c = computed(() => this.size() / 2);
  r = computed(() => (this.size() - this.thickness()) / 2);
  circ = computed(() => 2 * Math.PI * this.r());

  private total = computed(() => this.segments().reduce((s, x) => s + x.value, 0) || 1);

  arcs = computed(() => {
    const circ = this.circ();
    const total = this.total();
    const gap = this.segments().length > 1 ? 3 : 0; // px surface gap
    let cursor = 0;
    return this.segments().map((seg) => {
      const frac = seg.value / total;
      const len = Math.max(frac * circ - gap, 0.5);
      const dash = `${len} ${circ - len}`;
      const offset = -cursor * circ;
      cursor += frac;
      return { ...seg, dash, offset, pct: Math.round(frac * 100) };
    });
  });

  activeSeg = computed(() => {
    const a = this.active();
    return a ? this.arcs().find((s) => s.label === a) ?? null : null;
  });
}
