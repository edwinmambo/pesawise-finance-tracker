import { parseMpesaCsv } from './mpesa-csv';

const CSV = `Receipt No.,Completion Time,Details,Paid In,Withdrawn,Balance
SLK4TX9QAZ,2026-01-05 15:45:00,"Pay bill to KPLC, prepaid",,"-1,500.00",2300.00
QGH7ZZ1122,2026-01-06 09:10:00,Received from Jane,"1,000.00",,3300.00`;

describe('parseMpesaCsv', () => {
  it('maps paid-in to income and withdrawn to expense', () => {
    const { rows } = parseMpesaCsv(CSV);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      reference: 'SLK4TX9QAZ',
      type: 'EXPENSE',
      amount: 1500,
      date: '2026-01-05',
      note: 'Pay bill to KPLC, prepaid',
    });
    expect(rows[1]).toMatchObject({ reference: 'QGH7ZZ1122', type: 'INCOME', amount: 1000, date: '2026-01-06' });
  });

  it('hands back unrecognisable content as unparsed', () => {
    const { rows, unparsed } = parseMpesaCsv('name,age\nfoo,42');
    expect(rows).toHaveLength(0);
    expect(unparsed.length).toBeGreaterThan(0);
  });
});
