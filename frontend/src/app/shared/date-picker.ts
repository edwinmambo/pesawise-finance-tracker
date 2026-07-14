import { Component, computed, input, model, signal } from '@angular/core';
import { fmtDate } from '../core/format';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

interface Cell { key: string; d: number; in: boolean; today: boolean; }

/**
 * A themed calendar-popover date picker. Two-way binds an ISO date string
 * (YYYY-MM-DD) so it drops in where a native <input type="date"> was.
 *
 *   <app-date-picker [(value)]="form.date" placeholder="Target date" />
 */
@Component({
  selector: 'app-date-picker',
  standalone: true,
  host: { style: 'position:relative;display:block' },
  template: `
    <button type="button" class="input dp-trigger" (click)="toggle()" [class.on]="open()">
      <span [class.muted]="!value()">{{ value() ? display() : placeholder() }}</span>
      <i class="bi bi-calendar3"></i>
    </button>
    @if (open()) {
      <div class="dp-backdrop" (click)="open.set(false)"></div>
      <div class="dp-pop">
        <div class="dp-head">
          <button type="button" class="dp-nav" (click)="shift(-1)" aria-label="Previous month"><i class="bi bi-chevron-left"></i></button>
          <b>{{ monthName() }} {{ view().y }}</b>
          <button type="button" class="dp-nav" (click)="shift(1)" aria-label="Next month"><i class="bi bi-chevron-right"></i></button>
        </div>
        <div class="dp-grid dp-wd">@for (w of wd; track w) { <span>{{ w }}</span> }</div>
        <div class="dp-grid">
          @for (c of cells(); track c.key) {
            <button type="button" class="dp-cell" [class.out]="!c.in" [class.today]="c.today" [class.sel]="c.key === value()" (click)="pick(c.key)">{{ c.d }}</button>
          }
        </div>
        <div class="dp-foot">
          <button type="button" class="btn btn-sm btn-ghost" (click)="clear()">Clear</button>
          <button type="button" class="btn btn-sm" (click)="pickToday()">Today</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .dp-trigger { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; text-align: left; cursor: pointer; }
    .dp-trigger.on { border-color: var(--brand); }
    .dp-trigger i { color: var(--muted); }
    .dp-backdrop { position: fixed; inset: 0; z-index: 1095; }
    .dp-pop { position: absolute; z-index: 1096; top: calc(100% + 6px); left: 0; width: 268px; max-width: 92vw;
      background: var(--surface); border: 1px solid var(--border-2); border-radius: 14px; box-shadow: var(--shadow-lg); padding: 12px; animation: pop .14s ease; }
    .dp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .dp-head b { font-size: 13.5px; }
    .dp-nav { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-2); color: var(--ink); cursor: pointer; display: grid; place-items: center; }
    .dp-nav:hover { border-color: var(--brand); color: var(--brand-strong); }
    .dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
    .dp-wd { margin-bottom: 4px; }
    .dp-wd span { text-align: center; font-size: 10.5px; font-weight: 650; color: var(--muted); }
    .dp-cell { aspect-ratio: 1; border: none; background: transparent; border-radius: 8px; color: var(--ink); font-size: 12.5px; font-family: var(--num-font); cursor: pointer; }
    .dp-cell:hover { background: var(--surface-2); }
    .dp-cell.out { color: var(--muted); opacity: .5; }
    .dp-cell.today { box-shadow: inset 0 0 0 1px var(--brand); }
    .dp-cell.sel { background: var(--brand); color: #fff; font-weight: 700; }
    .dp-foot { display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); }
  `],
})
export class DatePickerComponent {
  value = model<string>('');
  placeholder = input('Select date');

  open = signal(false);
  view = signal(this.initView());
  wd = WD;

  monthName = computed(() => MONTHS[this.view().m]);

  private initView(): { y: number; m: number } {
    const v = this.value();
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m] = v.split('-').map(Number);
      return { y, m: m - 1 };
    }
    const now = new Date();
    return { y: now.getFullYear(), m: now.getMonth() };
  }

  cells = computed<Cell[]>(() => {
    const { y, m } = this.view();
    const now = new Date();
    const todayKey = iso(now.getFullYear(), now.getMonth(), now.getDate());
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7; // Monday-start
    const start = new Date(y, m, 1 - offset);
    const out: Cell[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = iso(d.getFullYear(), d.getMonth(), d.getDate());
      out.push({ key, d: d.getDate(), in: d.getMonth() === m, today: key === todayKey });
    }
    return out;
  });

  display(): string { return fmtDate(this.value()); }

  toggle(): void {
    if (!this.open()) this.view.set(this.initView());
    this.open.set(!this.open());
  }
  shift(delta: number): void {
    const d = new Date(this.view().y, this.view().m + delta, 1);
    this.view.set({ y: d.getFullYear(), m: d.getMonth() });
  }
  pick(key: string): void { this.value.set(key); this.open.set(false); }
  pickToday(): void {
    const n = new Date();
    this.pick(iso(n.getFullYear(), n.getMonth(), n.getDate()));
  }
  clear(): void { this.value.set(''); this.open.set(false); }
}
