/**
 * Parses pasted M-Pesa SMS confirmation messages into transaction rows.
 *
 * Real M-Pesa messages are fairly regular, e.g.
 *   "SLK4TX9QAZ Confirmed. Ksh1,500.00 sent to JOHN DOE 0712345678 on 5/1/26
 *    at 3:45 PM. New M-PESA balance is Ksh2,300.00. Transaction cost, Ksh23.00."
 * We split a pasted blob into individual messages, then pull out the reference,
 * amount, direction, date and counterparty. Anything we can't parse cleanly is
 * returned in `unparsed` so the UI can show it rather than silently dropping it.
 *
 * Pure and deterministic — no dates, no I/O — so it is fully unit-testable.
 */

export interface ParsedMpesaTxn {
  reference: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  date: string; // YYYY-MM-DD
  channel: 'MPESA';
  note?: string;
  raw: string;
}

export interface MpesaParseResult {
  rows: ParsedMpesaTxn[];
  unparsed: string[];
}

// Each message starts with a 10-char reference code followed by "Confirmed".
const MESSAGE_RE = /([A-Z0-9]{10}\s+Confirmed[\s\S]*?)(?=[A-Z0-9]{10}\s+Confirmed|$)/g;
const REF_RE = /^([A-Z0-9]{10})/;
const AMOUNT_RE = /Ksh\s*([\d,]+(?:\.\d{2})?)/i;
const DATE_RE = /on (\d{1,2}\/\d{1,2}\/\d{2,4})/i;

export function parseMpesaSms(text: string): MpesaParseResult {
  const rows: ParsedMpesaTxn[] = [];
  const unparsed: string[] = [];

  const matches = (text ?? '').match(MESSAGE_RE) ?? [];
  for (const rawMatch of matches) {
    const raw = rawMatch.trim();
    const parsed = parseOne(raw);
    if (parsed) rows.push(parsed);
    else unparsed.push(raw);
  }
  return { rows, unparsed };
}

function parseOne(raw: string): ParsedMpesaTxn | null {
  const ref = raw.match(REF_RE)?.[1];
  const amountStr = raw.match(AMOUNT_RE)?.[1];
  const dateStr = raw.match(DATE_RE)?.[1];
  if (!ref || !amountStr || !dateStr) return null;

  const amount = parseFloat(amountStr.replace(/,/g, ''));
  const date = normalizeDate(dateStr);
  if (!Number.isFinite(amount) || amount <= 0 || !date) return null;

  const type = direction(raw);
  if (!type) return null;

  return {
    reference: ref,
    type,
    amount,
    date,
    channel: 'MPESA',
    note: counterparty(raw, type),
    raw,
  };
}

function direction(raw: string): 'INCOME' | 'EXPENSE' | null {
  if (/received/i.test(raw)) return 'INCOME';
  if (/sent to|paid to|withdrawn|of airtime|bought/i.test(raw)) return 'EXPENSE';
  return null;
}

function counterparty(raw: string, type: 'INCOME' | 'EXPENSE'): string | undefined {
  if (/of airtime/i.test(raw)) return 'Airtime';
  const patterns =
    type === 'INCOME'
      ? [/received Ksh[\d,.]+ from (.+?)(?: \d{6,12})? on /i]
      : [
          /sent to (.+?)(?: \d{6,12})? on /i,
          /paid to (.+?)\.? on /i,
          /withdrawn from (.+?) on /i,
        ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m?.[1]) return clean(m[1]);
  }
  return undefined;
}

function clean(name: string): string {
  return name.replace(/\.$/, '').trim();
}

/** M-Pesa uses D/M/YY (or YYYY). Returns YYYY-MM-DD, or '' if implausible. */
function normalizeDate(dmy: string): string {
  const parts = dmy.split('/').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return '';
  const [day, month, rawYear] = parts;
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  return `${year}-${pad(month)}-${pad(day)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
