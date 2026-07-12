import { computeLoan } from './loan-math';
import { InterestType } from '../common/enums';

describe('computeLoan', () => {
  describe('FLAT interest', () => {
    it('charges interest = principal x rate x years on the full principal', () => {
      const r = computeLoan(100_000, 12, 12, InterestType.FLAT, 0);
      expect(r.totalInterest).toBe(12_000);
      expect(r.totalRepayable).toBe(112_000);
      expect(r.monthlyPayment).toBeCloseTo(112_000 / 12, 2);
      expect(r.outstanding).toBe(112_000);
      expect(r.progress).toBe(0);
    });

    it('reflects partial repayment in outstanding and progress', () => {
      const r = computeLoan(100_000, 12, 12, InterestType.FLAT, 56_000);
      expect(r.outstanding).toBe(56_000);
      expect(r.progress).toBe(0.5);
    });
  });

  describe('REDUCING interest', () => {
    it('uses the standard amortised monthly payment', () => {
      const r = computeLoan(100_000, 12, 12, InterestType.REDUCING, 0);
      expect(r.monthlyPayment).toBeCloseTo(8884.88, 1);
      expect(r.totalRepayable).toBeCloseTo(r.monthlyPayment * 12, 1);
      expect(r.totalInterest).toBeGreaterThan(0);
    });

    it('falls back to principal / term when the rate is zero', () => {
      const r = computeLoan(120_000, 0, 12, InterestType.REDUCING, 0);
      expect(r.monthlyPayment).toBe(10_000);
      expect(r.totalInterest).toBe(0);
    });
  });

  it('caps outstanding at 0 and progress at 1 on overpayment', () => {
    const r = computeLoan(1_000, 0, 10, InterestType.REDUCING, 5_000);
    expect(r.outstanding).toBe(0);
    expect(r.progress).toBe(1);
  });

  it('guards against a zero term instead of dividing by zero', () => {
    const r = computeLoan(1_000, 10, 0, InterestType.FLAT, 0);
    expect(Number.isFinite(r.monthlyPayment)).toBe(true);
    expect(r.monthlyPayment).toBeGreaterThan(0);
  });
});
