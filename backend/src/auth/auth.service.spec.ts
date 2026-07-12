import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './refresh-token.entity';

describe('AuthService', () => {
  let service: AuthService;
  let users: {
    findByEmail: jest.Mock;
    findByEmailWithPassword: jest.Mock;
    create: jest.Mock;
  };
  let jwt: { sign: jest.Mock };

  beforeEach(async () => {
    users = {
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      create: jest.fn(),
    };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    const refreshRepo = {
      create: (x: unknown) => x,
      save: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      findOne: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: () => undefined } },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshRepo },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('hashes the password and returns a token + password-free user', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.create.mockImplementation(async (input) => ({
        id: 'u1',
        currency: 'KES',
        ...input,
      }));

      const result = await service.register({
        name: 'Ada',
        email: 'ada@x.com',
        password: 'secret12',
      });

      expect(result.token).toBe('signed.jwt.token');
      expect(result.user).toMatchObject({ id: 'u1', email: 'ada@x.com', currency: 'KES' });
      expect((result.user as unknown as Record<string, unknown>).passwordHash).toBeUndefined();

      const created = users.create.mock.calls[0][0];
      expect(created.passwordHash).not.toBe('secret12');
      expect(await bcrypt.compare('secret12', created.passwordHash)).toBe(true);
    });

    it('rejects a duplicate email and never creates a user', async () => {
      users.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({ name: 'A', email: 'dupe@x.com', password: 'secret12' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns a token for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('secret12', 10);
      users.findByEmailWithPassword.mockResolvedValue({
        id: 'u1',
        email: 'ada@x.com',
        passwordHash,
        currency: 'KES',
      });

      const result = await service.login({ email: 'ada@x.com', password: 'secret12' });
      expect(result.token).toBe('signed.jwt.token');
      expect(result.user.email).toBe('ada@x.com');
    });

    it('rejects an unknown email', async () => {
      users.findByEmailWithPassword.mockResolvedValue(null);
      await expect(
        service.login({ email: 'no@x.com', password: 'whatever' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-horse', 10);
      users.findByEmailWithPassword.mockResolvedValue({
        id: 'u1',
        email: 'ada@x.com',
        passwordHash,
      });
      await expect(
        service.login({ email: 'ada@x.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
