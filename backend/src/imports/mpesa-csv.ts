import { MpesaParseResult, ParsedMpesaTxn } from './mpesa-parser';

/**
 * Parses an M-Pesa statement CSV export. The official statement has columns like
 * "Receipt No.", "Completion Time", "Details", "Paid In", "Withdrawn", "Balance".
 * We map columns fuzzily (by header substring) so minor format changes still work.
 * Pure — takes the CSV text, returns the same shape as the SMS parser.
 */
export function parseMpesaCsv(text: string): MpesaParseResult {
  const rows: ParsedMpesaTxn[] = [];
  const unparsed: string[] = [];

  const lines = (text ?? '').split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows, unparsed };

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const col = (needle: string) => header.findIndex((h) => h.includes(needle));

  const iRef = col('receipt') >= 0 ? col('receipt') : col('reference');
  const iDate = col('completion time') >= 0 ? col('completion time') : col('date');
  const iDetails = col('details');
  const iPaidIn = col('paid in');
  const iWithdrawn = col('withdrawn') >= 0 ? col('withdrawn') : col('paid out');

  if (iRef < 0 || iDate < 0 || (iPaidIn < 0 && iWithdrawn < 0)) {
    // Not a recognisable statement — hand the whole thing back as unparsed.
    return { rows, unparsed: lines };
  }

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const parsed = parseRow(cells, { iRef, iDate, iDetails, iPaidIn, iWithdrawn });
    if (parsed) rows.push(parsed);
    else unparsed.push(line);
  }
  return { rows, unparsed };
}

interface ColMap {
  iRef: number;
  iDate: number;
  iDetails: number;
  iPaidIn: number;
  iWithdrawn: number;
}

function parseRow(cells: string[], c: ColMap): ParsedMpesaTxn | null {
  const reference = cells[c.iRef]?.trim();
  const date = normalizeDate(cells[c.iDate]?.trim() ?? '');
  if (!reference || !date) return null;

  const paidIn = c.iPaidIn >= 0 ? num(cells[c.iPaidIn]) : 0;
  const withdrawn = c.iWithdrawn >= 0 ? num(cells[c.iWithdrawn]) : 0;

  let type: 'INCOME' | 'EXPENSE';
  let amount: number;
  if (paidIn > 0) {
    type = 'INCOME';
    amount = paidIn;
  } else if (withdrawn !== 0) {
    type = 'EXPENSE';
    amount = Math.abs(withdrawn);
  } else {
    return null; // zero-value / balance-only line
  }

  return {
    reference,
    type,
    amount,
    date,
    channel: 'MPESA',
    note: c.iDetails >= 0 ? cells[c.iDetails]?.trim() || undefined : undefined,
    raw: cells.join(','),
  };
}

function num(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Accepts "YYYY-MM-DD ..." or "DD/MM/YYYY ...". Returns YYYY-MM-DD or ''. */
function normalizeDate(value: string): string {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10);
    const year = parseInt(dmy[3], 10) < 100 ? 2000 + parseInt(dmy[3], 10) : parseInt(dmy[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return '';
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return '';
}

/** Minimal RFC-4180 line splitter (handles quoted fields with embedded commas). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
