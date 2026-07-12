import { Insight, ReportCategory, ReportMonth, ReportTotals } from './reports.types';

export interface InsightInput {
  totals: ReportTotals;
  monthly: ReportMonth[];
  categories: ReportCategory[];
}

/**
 * Derives a short list of plain-language insights from the aggregated report.
 * Pure and deterministic (no dates, no I/O) so it is trivially unit-testable.
 */
export function buildInsights({ totals, monthly, categories }: InsightInput): Insight[] {
  const insights: Insight[] = [];

  // 1. Savings rate / net position.
  if (totals.income <= 0) {
    insights.push({ kind: 'neutral', text: 'No income was recorded in this period.' });
  } else if (totals.net < 0) {
    insights.push({
      kind: 'warning',
      text: 'You spent more than you earned in this period.',
    });
  } else if (totals.savingsRate >= 20) {
    insights.push({
      kind: 'positive',
      text: `You kept ${totals.savingsRate}% of your income — a healthy savings rate.`,
    });
  } else {
    insights.push({
      kind: 'neutral',
      text: `You kept ${totals.savingsRate}% of your income this period.`,
    });
  }

  // 2. Month-over-month spending trend (needs at least two months).
  if (monthly.length >= 2) {
    const last = monthly[monthly.length - 1];
    const prev = monthly[monthly.length - 2];
    if (prev.expense > 0) {
      const deltaPct = Math.round(((last.expense - prev.expense) / prev.expense) * 100);
      if (deltaPct >= 5) {
        insights.push({
          kind: 'warning',
          text: `Spending rose ${deltaPct}% versus the previous month.`,
        });
      } else if (deltaPct <= -5) {
        insights.push({
          kind: 'positive',
          text: `Spending fell ${Math.abs(deltaPct)}% versus the previous month.`,
        });
      }
    }
  }

  // 3. Concentration of spending in the top category.
  if (categories.length > 0 && totals.expense > 0) {
    const top = categories[0];
    const share = Math.round((top.total / totals.expense) * 100);
    insights.push({
      kind: share >= 40 ? 'warning' : 'neutral',
      text: `${top.name} was your biggest expense at ${share}% of spending.`,
    });
  }

  return insights;
}
