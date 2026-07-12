import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

/**
 * Boots the real Nest app against a Postgres database and exercises the auth
 * flow end-to-end, including the {@link HttpExceptionFilter} error envelope.
 * Run `docker compose up -d db` first (CI provides a `postgres` service).
 */
describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  const email = `e2e_${Date.now()}@pesawise.test`;
  const password = 'test1234';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('registers a new user (no password hash in the response)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'E2E User', email, password })
      .expect(201);

    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate registration with the error envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'E2E User', email, password })
      .expect(409);

    expect(res.body).toMatchObject({ statusCode: 409, path: '/api/auth/register' });
    expect(res.body.timestamp).toBeDefined();
  });

  it('validates the register payload (400 with a message array)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: '123' })
      .expect(400);

    expect(Array.isArray(res.body.message)).toBe(true);
  });

  it('rejects invalid login credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'wrongpass' })
      .expect(401);

    expect(res.body.message).toBe('Invalid email or password');
  });

  it('logs in and returns the current user from /auth/me', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(201);

    const token = login.body.token as string;

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(me.body.email).toBe(email);
  });

  it('blocks /auth/me without a token', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });
});
