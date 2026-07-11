import { InterestType } from '../common/enums';

export interface LoanComputation {
  monthlyPayment: number;
  totalRepayable: number;
  totalInterest: number;
  totalPaid: number;
  outstanding: number;
  progress: number; // 0..1 of total repayable settled
}

/**
 * Computes repayment figures for a loan.
 *
 * FLAT:      interest = principal x rate x years  (charged on the full principal)
 * REDUCING:  standard amortized monthly payment on the reducing balance
 */
export function computeLoan(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  interestType: InterestType,
  totalPaid: number,
): LoanComputation {
  const n = Math.max(termMonths, 1);
  const r = annualRatePct / 100 / 12;

  let monthlyPayment: number;
  let totalRepayable: number;

  if (interestType === InterestType.FLAT) {
    const years = n / 12;
    const totalInterest = principal * (annualRatePct / 100) * years;
    totalRepayable = principal + totalInterest;
    monthlyPayment = totalRepayable / n;
  } else {
    if (r === 0) {
      monthlyPayment = principal / n;
    } else {
      monthlyPayment = (principal * r) / (1 - Math.pow(1 + r, -n));
    }
    totalRepayable = monthlyPayment * n;
  }

  const totalInterest = totalRepayable - principal;
  const outstanding = Math.max(totalRepayable - totalPaid, 0);
  const progress = totalRepayable > 0 ? Math.min(totalPaid / totalRepayable, 1) : 0;

  return {
    monthlyPayment: round2(monthlyPayment),
    totalRepayable: round2(totalRepayable),
    totalInterest: round2(totalInterest),
    totalPaid: round2(totalPaid),
    outstanding: round2(outstanding),
    progress: Math.round(progress * 1000) / 1000,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
