import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MoneyService } from './money.service';
import { AuthService } from './auth.service';
import { PrivacyService } from './privacy.service';

describe('MoneyService', () => {
  const user = signal<{ currency?: string } | null>({ currency: 'KES' });
  const hidden = signal(false);
  let money: MoneyService;

  beforeEach(() => {
    user.set({ currency: 'KES' });
    hidden.set(false);
    TestBed.configureTestingModule({
      providers: [
        MoneyService,
        { provide: AuthService, useValue: { user } },
        { provide: PrivacyService, useValue: { hidden } },
      ],
    });
    money = TestBed.inject(MoneyService);
  });

  it('formats a positive amount with the currency symbol', () => {
    expect(money.format(1234)).toBe('Ksh 1,234');
  });

  it('prefixes negative amounts with a minus sign', () => {
    expect(money.format(-1234)).toBe('-Ksh 1,234');
  });

  it('adds two decimals when asked', () => {
    expect(money.format(1234.5, true)).toBe('Ksh 1,234.50');
  });

  it('masks the value when balances are hidden', () => {
    hidden.set(true);
    expect(money.format(1234)).toBe('Ksh ••••');
  });

  it('formatNumber ignores both privacy and the symbol', () => {
    hidden.set(true);
    expect(money.formatNumber(1234)).toBe('1,234');
  });

  it('formatShort abbreviates thousands and millions', () => {
    expect(money.formatShort(85_000)).toBe('85K');
    expect(money.formatShort(1_500)).toBe('1.5K');
    expect(money.formatShort(2_000_000)).toBe('2.0M');
    expect(money.formatShort(-50_000)).toBe('-50K');
  });

  it('formatShort masks when hidden', () => {
    hidden.set(true);
    expect(money.formatShort(85_000)).toBe('•••');
  });

  it('reacts to a currency change on the user profile', () => {
    user.set({ currency: 'USD' });
    expect(money.symbol()).toBe('$');
    expect(money.format(1000)).toBe('$ 1,000');
  });
});
