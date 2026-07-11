import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { PrivacyService } from './privacy.service';
import { currencyInfo } from './currency';

const MASK = '••••';

/**
 * Central money formatter — currency-aware (from the user's profile) and
 * privacy-aware (masks values when balances are hidden). The KES pipes and any
 * imperative formatting both delegate here so behaviour stays consistent.
 */
@Injectable({ providedIn: 'root' })
export class MoneyService {
  private auth = inject(AuthService);
  private privacy = inject(PrivacyService);

  readonly info = computed(() => currencyInfo(this.auth.user()?.currency));

  format(value: number | null | undefined, decimals = false): string {
    const info = this.info();
    if (this.privacy.hidden()) return `${info.symbol} ${MASK}`;
    if (value === null || value === undefined || isNaN(value)) return `${info.symbol} 0`;
    const abs = Math.abs(value);
    const formatted = abs.toLocaleString(info.locale, {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    });
    return `${value < 0 ? '-' : ''}${info.symbol} ${formatted}`;
  }

  /** Compact form for chart axes, e.g. 85000 -> "85K". */
  formatShort(value: number | null | undefined): string {
    if (this.privacy.hidden()) return '•••';
    if (!value) return '0';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
    return `${sign}${abs}`;
  }
}
