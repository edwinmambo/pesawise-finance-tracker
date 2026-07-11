import { Pipe, PipeTransform, inject } from '@angular/core';
import { MoneyService } from './money.service';

/**
 * Formats a number as the user's chosen display currency, e.g. "Ksh 12,500".
 * Masks the value when balances are hidden. Pass `true` for 2 decimals.
 * Impure so it reflects live currency/privacy changes (a tick() is forced on
 * those rare toggles).
 */
@Pipe({ name: 'kes', standalone: true, pure: false })
export class KesPipe implements PipeTransform {
  private money = inject(MoneyService);
  transform(value: number | null | undefined, decimals = false): string {
    return this.money.format(value, decimals);
  }
}

/** Compact form for axis labels, e.g. 85000 -> "85K". */
@Pipe({ name: 'kesShort', standalone: true, pure: false })
export class KesShortPipe implements PipeTransform {
  private money = inject(MoneyService);
  transform(value: number | null | undefined): string {
    return this.money.formatShort(value);
  }
}
