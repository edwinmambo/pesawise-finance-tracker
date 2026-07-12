import { ReportData } from './reports.types';

const CHANNEL_LABELS: Record<string, string> = {
  MPESA: 'M-Pesa',
  BANK: 'Bank',
  CASH: 'Cash',
  SACCO: 'SACCO',
};

/** RFC-4180 field escaping: quote when the value contains a comma, quote or newline. */
function cell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function row(...values: (string | number)[]): string {
  return values.map(cell).join(',');
}

/**
 * Serialises a report to a multi-section CSV (summary + monthly + categories +
 * channels). Pure string building — no external library.
 */
export function toCsv(data: ReportData): string {
  const lines: string[] = [];

  lines.push(row('Pesawise report', data.periodLabel));
  lines.push(row('Generated', data.generatedAt));
  lines.push('');

  lines.push(row('Summary'));
  lines.push(row('Income', data.totals.income));
  lines.push(row('Expense', data.totals.expense));
  lines.push(row('Net', data.totals.net));
  lines.push(row('Savings rate (%)', data.totals.savingsRate));
  lines.push('');

  lines.push(row('Monthly'));
  lines.push(row('Month', 'Income', 'Expense', 'Net'));
  for (const m of data.monthly) lines.push(row(m.month, m.income, m.expense, m.net));
  lines.push('');

  lines.push(row('Top categories'));
  lines.push(row('Category', 'Total', '% of largest'));
  for (const c of data.categories) lines.push(row(c.name, c.total, c.pct));
  lines.push('');

  lines.push(row('By channel'));
  lines.push(row('Channel', 'Total', '% of expenses'));
  for (const ch of data.channels) {
    lines.push(row(CHANNEL_LABELS[ch.channel] ?? ch.channel, ch.total, ch.pct));
  }

  return lines.join('\r\n');
}
