import { Cadence } from '../common/enums';

/**
 * Pure date math for recurring rules. Everything is YYYY-MM-DD strings computed
 * from local date parts (matching the rest of the codebase's `ymd` convention),
 * so there are no timezone surprises and it is fully unit-testable.
 */

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** First occurrence on or after `fromYmd`. */
export function computeNextRun(cadence: Cadence, anchorDay: number, fromYmd: string): string {
  return nextOccurrence(cadence, anchorDay, fromYmd, false);
}

/** First occurrence strictly after `afterYmd` (used to advance after a run). */
export function advanceRun(cadence: Cadence, anchorDay: number, afterYmd: string): string {
  return nextOccurrence(cadence, anchorDay, afterYmd, true);
}

function nextOccurrence(
  cadence: Cadence,
  anchorDay: number,
  baseYmd: string,
  strict: boolean,
): string {
  const [y, m, d] = baseYmd.split('-').map(Number);

  if (cadence === Cadence.WEEKLY) {
    const base = new Date(y, m - 1, d);
    if (strict) base.setDate(base.getDate() + 1);
    const weekday = clamp(anchorDay, 0, 6);
    const diff = (weekday - base.getDay() + 7) % 7;
    base.setDate(base.getDate() + diff);
    return ymd(base);
  }

  // MONTHLY: the anchor day-of-month, clamped to each month's length.
  let year = y;
  let month = m - 1; // 0-based
  for (let i = 0; i < 14; i++) {
    const day = Math.min(clamp(anchorDay, 1, 31), daysInMonth(year, month));
    const cand = `${year}-${pad(month + 1)}-${pad(day)}`;
    if (strict ? cand > baseYmd : cand >= baseYmd) return cand;
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }
  // Unreachable in practice.
  return baseYmd;
}

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
