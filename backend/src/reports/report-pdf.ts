import PDFDocument from 'pdfkit';
import { ReportData } from './reports.types';

const CHANNEL_LABELS: Record<string, string> = {
  MPESA: 'M-Pesa',
  BANK: 'Bank',
  CASH: 'Cash',
  SACCO: 'SACCO',
};

const INK = '#0f172a';
const MUTED = '#64748b';
const BRAND = '#10a37f';

function money(n: number): string {
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Renders a report to a PDF buffer using pdfkit's built-in fonts (Helvetica),
 * so it needs no font files and runs on the alpine runtime image.
 */
export function toPdf(data: ReportData, meta: { name: string }): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // Header
  doc.fillColor(BRAND).fontSize(22).text('Pesawise', { continued: true });
  doc.fillColor(MUTED).fontSize(12).text('  —  Financial report');
  doc.moveDown(0.3);
  doc.fillColor(INK).fontSize(11).text(meta.name);
  doc
    .fillColor(MUTED)
    .fontSize(10)
    .text(`${data.periodLabel}  ·  generated ${data.generatedAt.slice(0, 10)}`);
  doc.moveDown(1);

  // Summary
  section(doc, 'Summary');
  summaryRow(doc, 'Total income', money(data.totals.income));
  summaryRow(doc, 'Total expenses', money(data.totals.expense));
  summaryRow(doc, 'Net', money(data.totals.net));
  summaryRow(doc, 'Savings rate', `${data.totals.savingsRate}%`);
  doc.moveDown(1);

  // Monthly
  section(doc, 'Income vs expenses (monthly)');
  table(
    doc,
    ['Month', 'Income', 'Expense', 'Net'],
    data.monthly.map((m) => [m.month, money(m.income), money(m.expense), money(m.net)]),
  );
  doc.moveDown(1);

  // Categories
  section(doc, 'Top spending categories');
  table(
    doc,
    ['Category', 'Total'],
    data.categories.map((c) => [c.name, money(c.total)]),
  );
  doc.moveDown(1);

  // Channels
  section(doc, 'Spending by channel');
  table(
    doc,
    ['Channel', 'Total'],
    data.channels.map((c) => [CHANNEL_LABELS[c.channel] ?? c.channel, money(c.total)]),
  );

  // Insights
  if (data.insights.length) {
    doc.moveDown(1);
    section(doc, 'Insights');
    for (const ins of data.insights) {
      doc.fillColor(INK).fontSize(10).text(`•  ${ins.text}`);
    }
  }

  doc.end();
  return done;
}

function section(doc: PDFKit.PDFDocument, title: string): void {
  doc.fillColor(BRAND).fontSize(13).text(title);
  doc.moveDown(0.3);
}

function summaryRow(doc: PDFKit.PDFDocument, label: string, value: string): void {
  const y = doc.y;
  doc.fillColor(MUTED).fontSize(10).text(label, 48, y);
  doc.fillColor(INK).fontSize(10).text(value, 220, y);
  doc.moveDown(0.2);
}

function table(doc: PDFKit.PDFDocument, headers: string[], rows: string[][]): void {
  const left = 48;
  const colWidth = (doc.page.width - left * 2) / headers.length;
  let y = doc.y;

  doc.fillColor(MUTED).fontSize(9);
  headers.forEach((h, i) => doc.text(h, left + i * colWidth, y, { width: colWidth }));
  y = doc.y + 2;
  doc.moveTo(left, y).lineTo(doc.page.width - left, y).strokeColor('#e2e8f0').stroke();
  doc.moveDown(0.4);

  doc.fillColor(INK).fontSize(10);
  if (rows.length === 0) {
    doc.fillColor(MUTED).text('No data for this period.', left);
    return;
  }
  for (const r of rows) {
    const rowY = doc.y;
    r.forEach((cell, i) =>
      doc.fillColor(INK).text(cell, left + i * colWidth, rowY, { width: colWidth }),
    );
    doc.moveDown(0.3);
  }
}
