/**
 * A curated qualitative palette for multi-series charts (category / channel
 * donuts, budget snapshot, savings, overview). Colours are distinct yet
 * balanced in tone so they "take to each other" — easy to glance and tell
 * apart — with a lighter/brighter dark-mode set for contrast on dark surfaces.
 *
 * (Income/expense colours are NOT here — they live in CSS as the themeable
 * --income / --expense vars so the whole app shifts with the chosen theme.)
 */
import type { ThemeMode } from '../core/theme.service';

const PALETTE: Record<ThemeMode, string[]> = {
  light: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'],
  dark:  ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#2dd4bf', '#fb923c', '#818cf8'],
};

/** `n` palette colours, cycling if there are more series than the palette. */
export function paletteColors(mode: ThemeMode, n: number): string[] {
  const p = PALETTE[mode];
  return Array.from({ length: n }, (_, i) => p[i % p.length]);
}

/** A single palette colour by index (cycles). */
export function paletteColor(mode: ThemeMode, i: number): string {
  const p = PALETTE[mode];
  return p[((i % p.length) + p.length) % p.length];
}
