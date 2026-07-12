import { FxService } from './fx.service';

describe('FxService', () => {
  const fx = new FxService();

  it('is a no-op for the same currency', () => {
    expect(fx.convert(1000, 'KES', 'KES')).toBe(1000);
  });

  it('converts USD to KES at the seeded rate', () => {
    expect(fx.convert(10, 'USD', 'KES')).toBe(1300);
  });

  it('converts KES to USD', () => {
    expect(fx.convert(1300, 'KES', 'USD')).toBe(10);
  });

  it('converts between two non-KES currencies via KES', () => {
    // 10 USD = 1300 KES = 1300/140 EUR ≈ 9.29
    expect(fx.convert(10, 'USD', 'EUR')).toBeCloseTo(9.29, 1);
  });

  it('rounds to 2 decimal places', () => {
    expect(fx.convert(1, 'USD', 'EUR')).toBe(Math.round((130 / 140) * 100) / 100);
  });

  it('treats an unknown currency as rate 1', () => {
    expect(fx.convert(100, 'XXX', 'KES')).toBe(100);
  });

  it('reports supported currencies', () => {
    expect(FxService.isSupported('USD')).toBe(true);
    expect(FxService.isSupported('XXX')).toBe(false);
  });
});
