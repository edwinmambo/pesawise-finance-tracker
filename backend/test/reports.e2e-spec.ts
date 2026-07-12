import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

/**
 * Proves the server-side report equals a client-side recomputation from the raw
 * transactions (the parity guarantee), and that CSV/PDF exports are well-formed.
 * Self-contained: it creates its own user + transactions, so it needs no seed.
 */
describe('Reports (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const email = `reports_${Date.now()}@pesawise.test`;

  // Two months of income + expense across channels.
  const seedTxns = [
    { type: 'INCOME', amount: 100000, date: '2026-05-05', channel: 'MPESA' },
    { type: 'EXPENSE', amount: 20000, date: '2026-05-10', channel: 'MPESA' },
    { type: 'EXPENSE', amount: 15000, date: '2026-05-20', channel: 'BANK' },
    { type: 'INCOME', amount: 100000, date: '2026-06-05', channel: 'MPESA' },
    { type: 'EXPENSE', amount: 30000, date: '2026-06-12', channel: 'CASH' },
  ];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Reports Tester', email, password: 'test1234' })
      .expect(201);
    token = reg.body.token;

    for (const t of seedTxns) {
      await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send(t)
        .expect(201);
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('totals match a client-side recomputation from /transactions', async () => {
    const report = (
      await request(app.getHttpServer()).get('/api/reports?period=all').set(auth()).expect(200)
    ).body;
    const txns = (
      await request(app.getHttpServer()).get('/api/transactions').set(auth()).expect(200)
    ).body as { type: string; amount: number }[];

    const income = txns.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = txns.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

    expect(report.totals.income).toBeCloseTo(income, 2);
    expect(report.totals.expense).toBeCloseTo(expense, 2);
    expect(report.totals.net).toBeCloseTo(income - expense, 2);
    expect(report.totals.savingsRate).toBe(Math.max(0, Math.round(((income - expense) / income) * 100)));
  });

  it('breaks the series into the two months present', async () => {
    const report = (
      await request(app.getHttpServer()).get('/api/reports?period=all').set(auth()).expect(200)
    ).body;
    expect(report.monthly.map((m: { month: string }) => m.month)).toEqual(['2026-05', '2026-06']);
    expect(report.monthly[0]).toMatchObject({ income: 100000, expense: 35000, net: 65000 });
  });

  it('produces insights', async () => {
    const report = (
      await request(app.getHttpServer()).get('/api/reports?period=all').set(auth()).expect(200)
    ).body;
    expect(Array.isArray(report.insights)).toBe(true);
    expect(report.insights.length).toBeGreaterThan(0);
  });

  it('rejects an invalid period', async () => {
    await request(app.getHttpServer()).get('/api/reports?period=99').set(auth()).expect(400);
  });

  it('exports CSV with the right content type', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/reports?period=all&format=csv')
      .set(auth())
      .expect(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.text).toContain('Pesawise report');
    expect(res.text).toContain('Month,Income,Expense,Net');
  });

  it('exports a valid PDF', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/reports?period=all&format=pdf')
      .set(auth())
      .buffer(true)
      .parse((r, cb) => {
        const data: Buffer[] = [];
        r.on('data', (c: Buffer) => data.push(c));
        r.on('end', () => cb(null, Buffer.concat(data)));
      })
      .expect(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    const body = res.body as Buffer;
    expect(body.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
