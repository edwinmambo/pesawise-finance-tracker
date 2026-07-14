import { currencyInfo, CURRENCIES } from './currency';

describe('currencyInfo', () => {
  it('resolves a known currency code', () => {
    expect(currencyInfo('USD')).toMatchObject({ code: 'USD', symbol: '$' });
    expect(currencyInfo('KES')).toMatchObject({ code: 'KES', symbol: 'KES' });
  });

  it('falls back to KES (the first entry) for unknown / missing codes', () => {
    expect(currencyInfo('XYZ').code).toBe('KES');
    expect(currencyInfo(null).code).toBe('KES');
    expect(currencyInfo(undefined).code).toBe(CURRENCIES[0].code);
  });
});
