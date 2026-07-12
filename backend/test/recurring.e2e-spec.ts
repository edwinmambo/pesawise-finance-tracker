import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

describe('Recurring transactions (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const email = `recurring_${Date.now()}@pesawise.test`;

  // A rule that started two months ago on the 1st — so it is overdue.
  const start = new Date();
  start.setMonth(start.getMonth() - 2);
  const startDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-01`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Recurring Tester', email, password: 'test1234' })
      .expect(201);
    token = reg.body.token;
  });

  afterAll(async () => app?.close());
  const auth = () => ({ Authorization: `Bearer ${token}` });

  let ruleId: string;

  it('creates a rule and schedules its next run from the start date', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/recurring')
      .set(auth())
      .send({ name: 'Rent', type: 'EXPENSE', amount: 15000, cadence: 'MONTHLY', anchorDay: 1, startDate })
      .expect(201);
    ruleId = res.body.id;
    expect(res.body.nextRunAt.slice(0, 10)).toBe(startDate);
    expect(res.body.active).toBe(true);
  });

  it('materialises overdue occurrences when run, idempotently', async () => {
    const run1 = await request(app.getHttpServer()).post('/api/recurring/run').set(auth()).expect(201);
    expect(run1.body.created).toBeGreaterThanOrEqual(2); // two+ missed months

    const txns = (
      await request(app.getHttpServer()).get('/api/transactions').set(auth()).expect(200)
    ).body as { reference: string; amount: number; type: string }[];
    const generated = txns.filter((t) => t.reference?.startsWith(`RULE:${ruleId}:`));
    expect(generated.length).toBe(run1.body.created);
    expect(generated.every((t) => t.amount === 15000 && t.type === 'EXPENSE')).toBe(true);

    // Running again posts nothing new (dedup on the synthetic reference).
    const run2 = await request(app.getHttpServer()).post('/api/recurring/run').set(auth()).expect(201);
    expect(run2.body.created).toBe(0);
  });

  it('projects upcoming occurrences', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/recurring/upcoming?days=60')
      .set(auth())
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toMatchObject({ ruleId, name: 'Rent', amount: 15000 });
  });

  it('deletes a rule', async () => {
    await request(app.getHttpServer()).delete(`/api/recurring/${ruleId}`).set(auth()).expect(200);
    const list = (await request(app.getHttpServer()).get('/api/recurring').set(auth()).expect(200)).body;
    expect(list).toHaveLength(0);
  });
});
