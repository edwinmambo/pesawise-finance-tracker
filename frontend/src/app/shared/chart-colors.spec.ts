import { accentShades, incomeExpensePair, paletteColors, paletteColor } from './chart-colors';

describe('accentShades', () => {
  it('returns the base for count <= 1', () => {
    expect(accentShades('#10a37f', 1)).toEqual(['#10a37f']);
    expect(accentShades('#10a37f', 0)).toEqual(['#10a37f']);
  });

  it('returns the requested number of valid hex shades', () => {
    const shades = accentShades('#10a37f', 5);
    expect(shades).toHaveLength(5);
    for (const s of shades) {
      expect(s).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('ramps from light to dark (lightest first)', () => {
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255);
    };
    const shades = accentShades('#1f7ae0', 6);
    expect(lum(shades[0])).toBeGreaterThan(lum(shades[shades.length - 1]));
  });

  it('holds the accent hue (a green base yields green-dominant shades)', () => {
    for (const s of accentShades('#10a37f', 4)) {
      const n = parseInt(s.slice(1), 16);
      const g = (n >> 8) & 255;
      const r = (n >> 16) & 255;
      expect(g).toBeGreaterThan(r);
    }
  });
});

describe('incomeExpensePair', () => {
  it('gives distinct income/expense colours per accent and mode', () => {
    const p = incomeExpensePair('emerald', 'light');
    expect(p.income).toMatch(/^#[0-9a-f]{6}$/);
    expect(p.expense).toMatch(/^#[0-9a-f]{6}$/);
    expect(p.income).not.toEqual(p.expense);
    // dark variant differs from light
    expect(incomeExpensePair('emerald', 'dark').income).not.toEqual(p.income);
  });
});

describe('paletteColors / paletteColor', () => {
  it('returns n distinct-leading colours and cycles beyond the palette', () => {
    const five = paletteColors('light', 5);
    expect(five).toHaveLength(5);
    expect(new Set(five).size).toBe(5); // first 5 are distinct
    // cycles: index 8 wraps to index 0
    expect(paletteColor('light', 8)).toEqual(paletteColor('light', 0));
  });

  it('has a separate dark palette', () => {
    expect(paletteColor('dark', 0)).not.toEqual(paletteColor('light', 0));
  });
});
