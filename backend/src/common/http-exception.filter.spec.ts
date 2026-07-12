import { ArgumentsHost, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function mockHost(url = '/api/test') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  beforeEach(() => {
    // Silence the intentional error log in the unknown-error case.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('shapes an HttpException into the standard envelope', () => {
    const { host, json, status } = mockHost('/api/auth/login');
    filter.catch(new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED), host);

    expect(status).toHaveBeenCalledWith(401);
    const body = json.mock.calls[0][0];
    expect(body).toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password',
      path: '/api/auth/login',
    });
    expect(typeof body.timestamp).toBe('string');
  });

  it('preserves class-validator message arrays', () => {
    const { host, json } = mockHost();
    filter.catch(new BadRequestException(['email must be an email', 'password too short']), host);

    const body = json.mock.calls[0][0];
    expect(Array.isArray(body.message)).toBe(true);
    expect(body.message).toContain('email must be an email');
  });

  it('maps unknown errors to an opaque 500 without leaking internals', () => {
    const { host, json, status } = mockHost();
    filter.catch(new Error('db exploded with secret connstring'), host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('secret connstring');
  });
});
