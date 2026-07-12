import { toCsv } from './report-csv';
import { ReportData } from './reports.types';

const data: ReportData = {
  period: '6',
  periodLabel: 'Last 6 months',
  start: null,
  generatedAt: '2026-07-12T00:00:00.000Z',
  totals: { income: 100_000, expense: 60_000, net: 40_000, savingsRate: 40 },
  monthly: [{ month: '2026-06', income: 100_000, expense: 60_000, net: 40_000 }],
  categories: [{ name: 'Food, drinks', icon: '🍚', color: '#f00', total: 20_000, pct: 100 }],
  channels: [{ channel: 'MPESA', total: 40_000, pct: 67 }],
  insights: [],
};

describe('toCsv', () => {
  it('emits labelled sections with headers and rows', () => {
    const csv = toCsv(data);
    expect(csv).toContain('Pesawise report,Last 6 months');
    expect(csv).toContain('Month,Income,Expense,Net');
    expect(csv).toContain('2026-06,100000,60000,40000');
    expect(csv).toContain('By channel');
    expect(csv).toContain('M-Pesa,40000,67');
  });

  it('escapes fields that contain commas', () => {
    expect(toCsv(data)).toContain('"Food, drinks",20000,100');
  });

  it('uses CRLF line endings', () => {
    expect(toCsv(data)).toContain('\r\n');
  });
});
