export interface CurrencyInfo {
  code: string;
  symbol: string;
  locale: string;
  name: string;
}

/** Display currencies (symbol + formatting only — no FX conversion). */
export const CURRENCIES: CurrencyInfo[] = [
  { code: 'KES', symbol: 'Ksh', locale: 'en-KE', name: 'Kenyan Shilling' },
  { code: 'USD', symbol: '$', locale: 'en-US', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', locale: 'de-DE', name: 'Euro' },
  { code: 'GBP', symbol: '£', locale: 'en-GB', name: 'British Pound' },
  { code: 'TZS', symbol: 'TSh', locale: 'en-TZ', name: 'Tanzanian Shilling' },
  { code: 'UGX', symbol: 'USh', locale: 'en-UG', name: 'Ugandan Shilling' },
  { code: 'ZAR', symbol: 'R', locale: 'en-ZA', name: 'South African Rand' },
  { code: 'NGN', symbol: '₦', locale: 'en-NG', name: 'Nigerian Naira' },
];

export function currencyInfo(code?: string | null): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}
