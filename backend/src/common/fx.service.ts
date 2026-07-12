import { Injectable } from '@nestjs/common';

/**
 * Currency conversion. Rates are a seeded static table expressed as "1 unit of
 * this currency = N KES" — good enough for a KES-centric app and trivially
 * swappable for a live provider or an admin-editable table later.
 *
 * Deliberately simple and pure so it is easy to unit-test and reason about.
 */
@Injectable()
export class FxService {
  /** 1 unit of <code> in KES. */
  private static readonly RATES_TO_KES: Record<string, number> = {
    KES: 1,
    USD: 130,
    EUR: 140,
    GBP: 165,
    TZS: 0.05,
    UGX: 0.035,
    ZAR: 7,
    NGN: 0.085,
  };

  static isSupported(code: string): boolean {
    return code in FxService.RATES_TO_KES;
  }

  private rate(code: string): number {
    return FxService.RATES_TO_KES[code] ?? 1;
  }

  /** Convert `amount` from one currency to another, rounded to 2dp. */
  convert(amount: number, from: string, to: string): number {
    if (from === to) return round2(amount);
    const inKes = amount * this.rate(from);
    return round2(inKes / this.rate(to));
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
