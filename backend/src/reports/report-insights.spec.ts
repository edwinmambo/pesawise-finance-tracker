import { buildInsights } from './report-insights';
import { ReportCategory, ReportMonth, ReportTotals } from './reports.types';

const totals = (income: number, expense: number): ReportTotals => {
  const net = income - expense;
  return { income, expense, net, savingsRate: income > 0 ? Math.max(0, Math.round((net / income) * 100)) : 0 };
};
const month = (m: string, income: number, expense: number): ReportMonth => ({
  month: m,
  income,
  expense,
  net: income - expense,
});
const cat = (name: string, total: number): ReportCategory => ({ name, total, icon: '', color: '', pct: 0 });

describe('buildInsights', () => {
  it('celebrates a healthy savings rate', () => {
    const [first] = buildInsights({ totals: totals(100_000, 60_000), monthly: [], categories: [] });
    expect(first.kind).toBe('positive');
    expect(first.text).toContain('40%');
  });

  it('warns when spending exceeds income', () => {
    const [first] = buildInsights({ totals: totals(1_000, 1_500), monthly: [], categories: [] });
    expect(first.kind).toBe('warning');
  });

  it('notes when there is no income', () => {
    const [first] = buildInsights({ totals: totals(0, 500), monthly: [], categories: [] });
    expect(first).toEqual({ kind: 'neutral', text: expect.stringContaining('No income') });
  });

  it('flags rising month-over-month spending', () => {
    const out = buildInsights({
      totals: totals(0, 250),
      monthly: [month('2026-01', 0, 100), month('2026-02', 0, 150)],
      categories: [],
    });
    expect(out.some((i) => i.kind === 'warning' && i.text.includes('rose 50%'))).toBe(true);
  });

  it('flags falling month-over-month spending', () => {
    const out = buildInsights({
      totals: totals(0, 350),
      monthly: [month('2026-01', 0, 200), month('2026-02', 0, 150)],
      categories: [],
    });
    expect(out.some((i) => i.kind === 'positive' && i.text.includes('fell 25%'))).toBe(true);
  });

  it('reports top-category concentration and warns above 40%', () => {
    const out = buildInsights({
      totals: totals(1_000, 1_000),
      monthly: [],
      categories: [cat('Food', 600), cat('Rent', 400)],
    });
    const top = out.find((i) => i.text.includes('Food'));
    expect(top).toBeDefined();
    expect(top!.kind).toBe('warning');
    expect(top!.text).toContain('60%');
  });
});
