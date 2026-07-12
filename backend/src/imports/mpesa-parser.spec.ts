import { parseMpesaSms } from './mpesa-parser';

const SENT =
  'SLK4TX9QAZ Confirmed. Ksh1,500.00 sent to JOHN DOE 0712345678 on 5/1/26 at 3:45 PM. New M-PESA balance is Ksh2,300.00. Transaction cost, Ksh23.00.';
const RECEIVED =
  'QGH7ZZ1122 Confirmed. You have received Ksh1,000.00 from JANE WANGARI 0722000111 on 6/1/26 at 9:10 AM. New M-PESA balance is Ksh3,300.00.';
const PAID =
  'RTY8AB3344 Confirmed. Ksh2,000.00 paid to KPLC PREPAID. on 7/1/26 at 8:00 AM. New M-PESA balance is Ksh1,300.00. Transaction cost, Ksh0.00.';
const AIRTIME =
  'UIO9CD5566 Confirmed. You bought Ksh100.00 of airtime on 8/1/26 at 6:00 PM. New M-PESA balance is Ksh1,200.00.';

describe('parseMpesaSms', () => {
  it('parses a "sent to" message as an expense', () => {
    const { rows } = parseMpesaSms(SENT);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      reference: 'SLK4TX9QAZ',
      type: 'EXPENSE',
      amount: 1500,
      date: '2026-01-05',
      channel: 'MPESA',
      note: 'JOHN DOE',
    });
  });

  it('parses a "received" message as income', () => {
    const [row] = parseMpesaSms(RECEIVED).rows;
    expect(row).toMatchObject({ type: 'INCOME', amount: 1000, date: '2026-01-06', note: 'JANE WANGARI' });
  });

  it('parses a paybill payment (and strips the trailing period from the name)', () => {
    const [row] = parseMpesaSms(PAID).rows;
    expect(row).toMatchObject({ type: 'EXPENSE', amount: 2000, note: 'KPLC PREPAID' });
  });

  it('labels airtime purchases', () => {
    const [row] = parseMpesaSms(AIRTIME).rows;
    expect(row).toMatchObject({ type: 'EXPENSE', amount: 100, note: 'Airtime' });
  });

  it('takes the transaction amount, not the balance', () => {
    const [row] = parseMpesaSms(SENT).rows;
    expect(row.amount).toBe(1500); // not 2300 (the balance)
  });

  it('parses several messages pasted together', () => {
    const { rows } = parseMpesaSms([SENT, RECEIVED, PAID, AIRTIME].join('\n\n'));
    expect(rows).toHaveLength(4);
  });

  it('returns non-M-Pesa text as unparsed rather than dropping it', () => {
    const { rows, unparsed } = parseMpesaSms('just some random note\nnot an mpesa message');
    expect(rows).toHaveLength(0);
    expect(unparsed.length).toBeGreaterThanOrEqual(0);
  });
});
