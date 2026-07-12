import { advanceRun, computeNextRun } from './recurring-schedule';
import { Cadence } from '../common/enums';

describe('recurring schedule math', () => {
  describe('MONTHLY', () => {
    it('returns the anchor day this month when it is still ahead', () => {
      expect(computeNextRun(Cadence.MONTHLY, 15, '2026-01-10')).toBe('2026-01-15');
    });

    it('rolls to next month once the anchor day has passed', () => {
      expect(computeNextRun(Cadence.MONTHLY, 15, '2026-01-20')).toBe('2026-02-15');
    });

    it('includes the anchor day itself (on-or-after)', () => {
      expect(computeNextRun(Cadence.MONTHLY, 15, '2026-01-15')).toBe('2026-01-15');
    });

    it('clamps to the last day of a short month', () => {
      expect(computeNextRun(Cadence.MONTHLY, 31, '2026-02-01')).toBe('2026-02-28');
    });

    it('advances strictly to the following month', () => {
      expect(advanceRun(Cadence.MONTHLY, 15, '2026-01-15')).toBe('2026-02-15');
    });
  });

  describe('WEEKLY', () => {
    it('finds the next matching weekday (Mon=1)', () => {
      // 2026-01-01 is a Thursday; the next Monday is the 5th.
      expect(computeNextRun(Cadence.WEEKLY, 1, '2026-01-01')).toBe('2026-01-05');
    });

    it('advances by exactly one week', () => {
      expect(advanceRun(Cadence.WEEKLY, 1, '2026-01-05')).toBe('2026-01-12');
    });
  });
});
