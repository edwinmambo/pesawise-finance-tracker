import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

const SMS = [
  'SLK4TX9QAZ Confirmed. Ksh1,500.00 sent to JOHN DOE 0712345678 on 5/1/26 at 3:45 PM. New M-PESA balance is Ksh2,300.00.',
  'QGH7ZZ1122 Confirmed. You have received Ksh1,000.00 from JANE 0722000111 on 6/1/26 at 9:10 AM. New M-PESA balance is Ksh3,300.00.',
].join('\n\n');

describe('M-Pesa import (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const email = `import_${Date.now()}@pesawise.test`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Import Tester', email, password: 'test1234' })
      .expect(201);
    token = reg.body.token;
  });

  afterAll(async () => app?.close());
  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('parses and stages a paste without touching the ledger', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/imports')
      .set(auth())
      .send({ source: 'MPESA_SMS', raw: SMS })
      .expect(201);

    expect(res.body.batch.parsedCount).toBe(2);
    expect(res.body.batch.duplicateCount).toBe(0);
    expect(res.body.batch.rows).toHaveLength(2);
    expect(res.body.batch.rows.every((r: { status: string }) => r.status === 'NEW')).toBe(true);

    // Nothing committed yet.
    const txns = (await request(app.getHttpServer()).get('/api/transactions').set(auth()).expect(200)).body;
    expect(txns).toHaveLength(0);
  });

  it('commits staged rows into transactions with their references', async () => {
    const preview = await request(app.getHttpServer())
      .post('/api/imports')
      .set(auth())
      .send({ source: 'MPESA_SMS', raw: SMS })
      .expect(201);
    // The first paste already staged these refs; this second paste sees them as
    // dups, so commit the FIRST batch instead.
    const firstBatchId = preview.body.batch.id;

    // Re-run the flow cleanly on a fresh user to avoid cross-test coupling.
    const email2 = `import2_${Date.now()}@pesawise.test`;
    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Import Tester 2', email: email2, password: 'test1234' })
      .expect(201);
    const t2 = reg.body.token;

    const staged = await request(app.getHttpServer())
      .post('/api/imports')
      .set({ Authorization: `Bearer ${t2}` })
      .send({ source: 'MPESA_SMS', raw: SMS })
      .expect(201);

    const committed = await request(app.getHttpServer())
      .post(`/api/imports/${staged.body.batch.id}/commit`)
      .set({ Authorization: `Bearer ${t2}` })
      .send({})
      .expect(201);
    expect(committed.body.committed).toBe(true);
    expect(committed.body.committedCount).toBe(2);

    const txns = (
      await request(app.getHttpServer()).get('/api/transactions').set({ Authorization: `Bearer ${t2}` }).expect(200)
    ).body as { reference: string }[];
    expect(txns.map((t) => t.reference).sort()).toEqual(['QGH7ZZ1122', 'SLK4TX9QAZ']);

    // Re-importing the same SMS now flags both as duplicates.
    const again = await request(app.getHttpServer())
      .post('/api/imports')
      .set({ Authorization: `Bearer ${t2}` })
      .send({ source: 'MPESA_SMS', raw: SMS })
      .expect(201);
    expect(again.body.batch.duplicateCount).toBe(2);
    expect(again.body.batch.rows.every((r: { status: string }) => r.status === 'DUPLICATE')).toBe(true);

    expect(firstBatchId).toBeDefined();
  });
});
