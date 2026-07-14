/**
 * Derives a monochrome ramp of "shades of the accent" for analytical charts
 * (category/channel breakdowns), so the graphs adopt the user's chosen theme
 * hue instead of a fixed rainbow. Pure functions — feed the current accent
 * base hex (see ThemeService.brand) and how many shades you need.
 */

interface Hsl { h: number; s: number; l: number; }

function hexToHsl(hex: string): Hsl {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let hue = 0;
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h: hue, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }: Hsl): string {
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/**
 * `count` shades of `base`, ramping light → dark while holding the hue, with the
 * lightest end a touch desaturated. Assign by index (largest slice first reads
 * best). Falls back gracefully for count <= 1.
 */
export function accentShades(base: string, count: number): string[] {
  const { h, s, l } = hexToHsl(base);
  if (count <= 1) return [base];
  const top = Math.min(l + 18, 80);     // lightest
  const bottom = Math.max(l - 24, 28);  // darkest
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const li = top + (bottom - top) * t;
    const si = s * (0.72 + 0.28 * t);   // lighter end slightly desaturated
    return hslToHex({ h, s: si, l: li });
  });
}

/**
 * A high-contrast income / expense pair in the accent hue for the bar chart.
 * Same hue keeps it on-theme, but a wide lightness gap (light income vs. deep
 * expense) gives the two bars a strong, readable contrast — unlike a muted
 * same-lightness shade, which washed out. Works in light and dark mode because
 * it derives from the mode-resolved accent base.
 */
export function incomeExpenseColors(base: string): { income: string; expense: string } {
  const { h, s } = hexToHsl(base);
  return {
    income: hslToHex({ h, s: Math.min(s + 4, 100), l: 62 }),
    expense: hslToHex({ h, s: Math.min(s + 12, 100), l: 34 }),
  };
}
