import { Component, input, model } from '@angular/core';

/** Curated, finance-relevant emoji set for categories/budgets. */
export const ICON_CHOICES = [
  '🍔', '🍲', '🛍️', '🛒', '☕', '🍺', '🏠', '🏢', '🛏️', '💡',
  '💧', '🔌', '🚌', '🚗', '⛽', '🏍️', '✈️', '🚕', '📱', '📶',
  '💻', '🎬', '🎮', '🎵', '⚽', '💊', '🏥', '🎓', '📚', '👕',
  '💇', '🎁', '🐖', '🤝', '📈', '🏦', '💳', '💰', '🪙', '🧰',
  '👪', '👶', '🐾', '⛪', '🌍', '🧱', '🥬', '🧾', '❤️', '⭐',
];

/** A pleasant swatch palette for categories/budgets. */
export const COLOR_CHOICES = [
  '#e0413f', '#e0891e', '#eab308', '#12a373', '#0d9488', '#0ea5e9',
  '#2563eb', '#6b57d3', '#9333ea', '#ec4899', '#f97316', '#64748b',
];

@Component({
  selector: 'app-icon-picker',
  standalone: true,
  template: `
    <div class="ip">
      <div class="ip-label">Icon</div>
      <div class="ip-grid">
        @for (i of icons; track i) {
          <button type="button" class="ip-emoji" [class.sel]="i === icon()" (click)="icon.set(i)">{{ i }}</button>
        }
      </div>
      <div class="ip-label mt">Colour</div>
      <div class="ip-swatches">
        @for (c of colors; track c) {
          <button type="button" class="ip-swatch" [class.sel]="c === color()" [style.background]="c" (click)="color.set(c)" [attr.aria-label]="c"></button>
        }
      </div>
    </div>
  `,
  styles: [`
    .ip-label { font-size: 12px; font-weight: 640; color: var(--ink-2); margin-bottom: 8px; }
    .ip-label.mt { margin-top: 16px; }
    .ip-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 6px; }
    @media (max-width: 520px) { .ip-grid { grid-template-columns: repeat(8, 1fr); } }
    .ip-emoji { aspect-ratio: 1; border: 1px solid var(--border); background: var(--surface-2); border-radius: 9px; font-size: 17px; cursor: pointer; display: grid; place-items: center; transition: transform .08s, border-color .12s, background .12s; }
    .ip-emoji:hover { transform: translateY(-1px); border-color: var(--brand); }
    .ip-emoji.sel { border-color: var(--brand); background: var(--brand-soft); box-shadow: 0 0 0 2px var(--brand-soft); }
    .ip-swatches { display: flex; flex-wrap: wrap; gap: 8px; }
    .ip-swatch { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform .08s; }
    .ip-swatch:hover { transform: scale(1.1); }
    .ip-swatch.sel { border-color: var(--ink); box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px currentColor; }
  `],
})
export class IconPickerComponent {
  icon = model<string>('🏷️');
  color = model<string>('#64748b');
  icons = ICON_CHOICES;
  colors = COLOR_CHOICES;
  compact = input(false);
}
