import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

describe('Refresh tokens + throttling (e2e)', () => {
  let app: INestApplication;
  const email = `refresh_${Date.now()}@pesawise.test`;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Refresh Tester', email, password: 'test1234' })
      .expect(201);
    refreshToken = reg.body.refreshToken;
  });

  afterAll(async () => app?.close());

  it('issues a refresh token alongside the access token', () => {
    expect(refreshToken).toBeDefined();
    expect(typeof refreshToken).toBe('string');
    expect(refreshToken.length).toBeGreaterThanOrEqual(32);
  });

  it('exchanges a refresh token for a new pair and rotates the old one', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.refreshToken).not.toBe(refreshToken);

    // The new access token works.
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${res.body.token}`)
      .expect(200);

    // The old refresh token is now dead (single-use rotation).
    await request(app.getHttpServer()).post('/api/auth/refresh').send({ refreshToken }).expect(401);
  });

  it('rejects a bogus refresh token', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: 'deadbeef'.repeat(8) })
      .expect(401);
  });

  it('rate-limits repeated login attempts (429 after the burst)', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 13; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'test1234' });
      codes.push(res.status);
    }
    expect(codes).toContain(429);
  });
});
