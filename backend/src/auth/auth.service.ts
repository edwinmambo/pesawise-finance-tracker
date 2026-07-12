import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/user.entity';
import { RefreshToken } from './refresh-token.entity';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  currency: string;
  persona?: string;
  tagline?: string;
  avatarColor?: string;
}

export interface AuthResult {
  token: string;
  refreshToken: string;
  user: PublicUser;
}

/** The user shape exposed to the client (never includes the password hash). */
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    currency: user.currency,
    persona: user.persona,
    tagline: user.tagline,
    avatarColor: user.avatarColor,
  };
}

const REFRESH_TTL_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
    return this.buildResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.buildResult(user);
  }

  /** Exchange a valid refresh token for a fresh pair (rotating the old one). */
  async refresh(rawToken: string): Promise<AuthResult> {
    if (!rawToken) throw new UnauthorizedException('Missing refresh token');
    const tokenHash = hash(rawToken);
    const stored = await this.refreshTokens.findOne({ where: { tokenHash } });
    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      if (stored) await this.refreshTokens.delete({ id: stored.id });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    // Rotate: the presented token is single-use.
    await this.refreshTokens.delete({ id: stored.id });
    const user = await this.users.findById(stored.userId);
    return this.buildResult(user);
  }

  /** Revoke a refresh token on logout (best-effort). */
  async logout(rawToken?: string): Promise<void> {
    if (rawToken) await this.refreshTokens.delete({ tokenHash: hash(rawToken) });
  }

  private async buildResult(user: User): Promise<AuthResult> {
    const token = this.jwt.sign({ sub: user.id, email: user.email });
    const refreshToken = await this.issueRefreshToken(user.id);
    return { token, refreshToken, user: toPublicUser(user) };
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    await this.refreshTokens.save(
      this.refreshTokens.create({ userId, tokenHash: hash(raw), expiresAt }),
    );
    // Opportunistic cleanup of this user's expired tokens.
    await this.refreshTokens.delete({ userId, expiresAt: LessThan(new Date()) });
    return raw;
  }
}

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
