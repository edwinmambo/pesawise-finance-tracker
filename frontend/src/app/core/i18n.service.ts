import { Injectable, signal } from '@angular/core';

export type Lang = 'en' | 'sw';
const KEY = 'pesawise_lang';

/**
 * Lightweight, signal-based i18n. `t()` reads the `lang` signal, so any
 * `computed()` (or template expression) that calls it re-evaluates when the
 * language changes — no zone, no extra library. English + Kiswahili.
 *
 * Coverage starts with the app shell / navigation; more strings can be added to
 * the dictionaries incrementally.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>(this.initial());

  private static readonly DICT: Record<Lang, Record<string, string>> = {
    en: {
      'nav.dashboard': 'Dashboard',
      'nav.transactions': 'Transactions',
      'nav.budgets': 'Budgets',
      'nav.calendar': 'Calendar',
      'nav.loans': 'Loans',
      'nav.savings': 'Savings',
      'nav.reports': 'Reports',
      'nav.import': 'Import',
      'nav.recurring': 'Recurring',
      'nav.settings': 'Settings',
      'action.logout': 'Log out',
      'common.language': 'Language',
    },
    sw: {
      'nav.dashboard': 'Dashibodi',
      'nav.transactions': 'Miamala',
      'nav.budgets': 'Bajeti',
      'nav.calendar': 'Kalenda',
      'nav.loans': 'Mikopo',
      'nav.savings': 'Akiba',
      'nav.reports': 'Ripoti',
      'nav.import': 'Ingiza',
      'nav.recurring': 'Za Kawaida',
      'nav.settings': 'Mipangilio',
      'action.logout': 'Toka',
      'common.language': 'Lugha',
    },
  };

  setLang(lang: Lang): void {
    this.lang.set(lang);
    localStorage.setItem(KEY, lang);
  }

  t(key: string): string {
    const lang = this.lang();
    return I18nService.DICT[lang]?.[key] ?? I18nService.DICT.en[key] ?? key;
  }

  private initial(): Lang {
    const saved = localStorage.getItem(KEY);
    return saved === 'sw' ? 'sw' : 'en';
  }
}
