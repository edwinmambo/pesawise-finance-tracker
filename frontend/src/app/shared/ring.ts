import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-ring',
  standalone: true,
  template: `
    <div class="ring" [style.width.px]="size()" [style.height.px]="size()">
      <svg [attr.viewBox]="'0 0 ' + size() + ' ' + size()">
        <circle [attr.cx]="c()" [attr.cy]="c()" [attr.r]="r()" fill="none"
                stroke="var(--grid)" [attr.stroke-width]="thickness()" />
        <circle [attr.cx]="c()" [attr.cy]="c()" [attr.r]="r()" fill="none"
                [attr.stroke]="color()" [attr.stroke-width]="thickness()" stroke-linecap="round"
                [attr.stroke-dasharray]="circ()"
                [attr.stroke-dashoffset]="offset()"
                [attr.transform]="'rotate(-90 ' + c() + ' ' + c() + ')'"
                style="transition: stroke-dashoffset .6s ease;" />
      </svg>
      <div class="ring-label">
        <div class="rp">{{ pctLabel() }}</div>
        @if (sub()) { <div class="rs">{{ sub() }}</div> }
      </div>
    </div>
  `,
  styles: [`
    .ring { position: relative; display: inline-grid; place-items: center; }
    .ring svg { width: 100%; height: 100%; }
    .ring-label { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
    .rp { font-size: 15px; font-weight: 720; letter-spacing: -.02em; }
    .rs { font-size: 10px; color: var(--muted); font-weight: 600; }
  `],
})
export class RingComponent {
  progress = input(0); // 0..1
  size = input(84);
  thickness = input(9);
  color = input('var(--brand)');
  sub = input('');

  c = computed(() => this.size() / 2);
  r = computed(() => (this.size() - this.thickness()) / 2);
  circ = computed(() => 2 * Math.PI * this.r());
  offset = computed(() => this.circ() * (1 - Math.min(Math.max(this.progress(), 0), 1)));
  pctLabel = computed(() => `${Math.round(this.progress() * 100)}%`);
}
