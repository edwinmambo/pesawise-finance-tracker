import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

describe('Transfers + FX (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let kesId: string;
  let usdId: string;
  const email = `transfer_${Date.now()}@pesawise.test`;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Transfer Tester', email, password: 'test1234' })
      .expect(201);
    token = reg.body.token;

    const kes = await request(app.getHttpServer())
      .post('/api/accounts')
      .set(auth())
      .send({ name: 'M-Pesa', type: 'MPESA', openingBalance: 10000, currency: 'KES' })
      .expect(201);
    kesId = kes.body.id;

    const usd = await request(app.getHttpServer())
      .post('/api/accounts')
      .set(auth())
      .send({ name: 'Dollar Wallet', type: 'BANK', openingBalance: 0, currency: 'USD' })
      .expect(201);
    usdId = usd.body.id;
  });

  afterAll(async () => app?.close());

  const balances = async () => {
    const res = await request(app.getHttpServer()).get('/api/accounts').set(auth()).expect(200);
    const map: Record<string, number> = {};
    for (const a of res.body) map[a.id] = a.currentBalance;
    return map;
  };

  it('rejects a transfer to the same account', async () => {
    await request(app.getHttpServer())
      .post('/api/accounts/transfer')
      .set(auth())
      .send({ fromAccountId: kesId, toAccountId: kesId, amount: 100, date: '2026-06-01' })
      .expect(400);
  });

  it('moves money as a linked pair, converting across currencies', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/accounts/transfer')
      .set(auth())
      .send({ fromAccountId: kesId, toAccountId: usdId, amount: 1300, date: '2026-06-01' })
      .expect(201);
    expect(res.body.transferGroupId).toBeDefined();

    const b = await balances();
    expect(b[kesId]).toBe(8700); // 10000 - 1300 KES
    expect(b[usdId]).toBe(10); // 1300 KES → 10 USD
  });

  it('writes a TRANSFER_OUT/TRANSFER_IN pair sharing a group id', async () => {
    const txns = (await request(app.getHttpServer()).get('/api/transactions').set(auth()).expect(200)).body as {
      type: string;
      transferGroupId: string;
    }[];
    const legs = txns.filter((t) => t.type.startsWith('TRANSFER_'));
    expect(legs).toHaveLength(2);
    expect(new Set(legs.map((l) => l.transferGroupId)).size).toBe(1);
  });

  it('excludes transfers from report income/expense', async () => {
    const report = (await request(app.getHttpServer()).get('/api/reports?period=all').set(auth()).expect(200)).body;
    expect(report.totals.income).toBe(0);
    expect(report.totals.expense).toBe(0);
  });

  it('deletes both legs when one is removed, restoring balances', async () => {
    const txns = (await request(app.getHttpServer()).get('/api/transactions').set(auth()).expect(200)).body as {
      id: string;
      type: string;
    }[];
    const oneLeg = txns.find((t) => t.type === 'TRANSFER_OUT')!;
    await request(app.getHttpServer()).delete(`/api/transactions/${oneLeg.id}`).set(auth()).expect(200);

    const remaining = (await request(app.getHttpServer()).get('/api/transactions').set(auth()).expect(200)).body as unknown[];
    expect(remaining).toHaveLength(0);

    const b = await balances();
    expect(b[kesId]).toBe(10000);
    expect(b[usdId]).toBe(0);
  });
});
