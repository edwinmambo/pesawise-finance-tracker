import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a number as Kenyan Shillings, e.g. 12500 -> "Ksh 12,500".
 * Pass `true` to force two decimal places (cents).
 */
@Pipe({ name: 'kes', standalone: true })
export class KesPipe implements PipeTransform {
  transform(value: number | null | undefined, decimals = false): string {
    if (value === null || value === undefined || isNaN(value)) return 'Ksh 0';
    const abs = Math.abs(value);
    const formatted = abs.toLocaleString('en-KE', {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    });
    return `${value < 0 ? '-' : ''}Ksh ${formatted}`;
  }
}

/** Compact form for axis labels, e.g. 85000 -> "85K", 1200000 -> "1.2M". */
@Pipe({ name: 'kesShort', standalone: true })
export class KesShortPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (!value) return '0';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
    return `${sign}${abs}`;
  }
}
