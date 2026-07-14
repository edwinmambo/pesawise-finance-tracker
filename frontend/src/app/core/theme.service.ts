import { computed, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';
export type Accent = 'emerald' | 'ocean' | 'violet' | 'sunset';

export const ACCENTS: { id: Accent; name: string; swatch: string }[] = [
  { id: 'emerald', name: 'Emerald', swatch: '#10a37f' },
  { id: 'ocean', name: 'Ocean', swatch: '#1f7ae0' },
  { id: 'violet', name: 'Violet', swatch: '#7c5cdb' },
  { id: 'sunset', name: 'Sunset', swatch: '#e8722a' },
];

/** The resolved --brand hex per accent × mode (mirrors styles.scss :144-156).
 *  Kept here so charts can derive accent-shade ramps without a DOM read. */
const BRAND: Record<Accent, Record<ThemeMode, string>> = {
  emerald: { light: '#10a37f', dark: '#17c199' },
  ocean:   { light: '#1f7ae0', dark: '#3f9bff' },
  violet:  { light: '#7c5cdb', dark: '#9a80f0' },
  sunset:  { light: '#e8722a', dark: '#f5934e' },
};

const MODE_KEY = 'pesawise_theme';
const ACCENT_KEY = 'pesawise_accent';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.initialMode());
  readonly accent = signal<Accent>(this.initialAccent());

  /** Current accent base colour (hex), reactive to accent + mode changes. */
  readonly brand = computed(() => BRAND[this.accent()][this.mode()]);

  /** Back-compat alias so existing `theme.theme()` callers keep working. */
  readonly theme = this.mode;

  constructor() {
    this.applyMode(this.mode());
    this.applyAccent(this.accent());
  }

  toggleMode(): void {
    this.setMode(this.mode() === 'dark' ? 'light' : 'dark');
  }

  /** Back-compat alias. */
  toggle(): void {
    this.toggleMode();
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    localStorage.setItem(MODE_KEY, mode);
    this.applyMode(mode);
  }

  setAccent(accent: Accent): void {
    this.accent.set(accent);
    localStorage.setItem(ACCENT_KEY, accent);
    this.applyAccent(accent);
  }

  private initialMode(): ThemeMode {
    const saved = localStorage.getItem(MODE_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private initialAccent(): Accent {
    const saved = localStorage.getItem(ACCENT_KEY) as Accent | null;
    return ACCENTS.some((a) => a.id === saved) ? (saved as Accent) : 'emerald';
  }

  private applyMode(mode: ThemeMode): void {
    document.documentElement.setAttribute('data-theme', mode);
  }

  private applyAccent(accent: Accent): void {
    document.documentElement.setAttribute('data-accent', accent);
  }
}
