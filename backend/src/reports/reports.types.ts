export type ReportPeriod = '1' | '3' | '6' | 'all';

export interface ReportTotals {
  income: number;
  expense: number;
  net: number;
  /** Percent of income kept (0..100, never negative). */
  savingsRate: number;
}

export interface ReportMonth {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  net: number;
}

export interface ReportCategory {
  name: string;
  icon: string;
  color: string;
  total: number;
  /** Share of this category vs the largest category (0..100), for bar widths. */
  pct: number;
}

export interface ReportChannel {
  channel: string; // MPESA | BANK | CASH | SACCO
  total: number;
  /** Share of total expense (0..100). */
  pct: number;
}

export type InsightKind = 'positive' | 'warning' | 'neutral';

export interface Insight {
  kind: InsightKind;
  text: string;
}

export interface ReportData {
  period: ReportPeriod;
  periodLabel: string;
  start: string | null; // inclusive lower bound (null = all time)
  generatedAt: string; // ISO
  totals: ReportTotals;
  monthly: ReportMonth[];
  categories: ReportCategory[];
  channels: ReportChannel[];
  insights: Insight[];
}

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  '1': 'This month',
  '3': 'Last 3 months',
  '6': 'Last 6 months',
  all: 'All time',
};
