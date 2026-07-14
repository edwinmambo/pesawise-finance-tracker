import { paletteColors, paletteColor } from './chart-colors';

describe('paletteColors / paletteColor', () => {
  it('returns n distinct-leading colours and cycles beyond the palette', () => {
    const five = paletteColors('light', 5);
    expect(five).toHaveLength(5);
    expect(new Set(five).size).toBe(5); // first 5 are distinct
    for (const c of five) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    // cycles: index 8 wraps to index 0
    expect(paletteColor('light', 8)).toEqual(paletteColor('light', 0));
  });

  it('has a separate, brighter dark palette', () => {
    expect(paletteColor('dark', 0)).not.toEqual(paletteColor('light', 0));
    expect(paletteColors('dark', 8)).toHaveLength(8);
  });

  it('handles index wrap defensively', () => {
    expect(paletteColor('light', 0)).toEqual(paletteColor('light', 16));
  });
});
