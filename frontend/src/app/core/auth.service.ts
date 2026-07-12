import { ApplicationRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthResult, User } from './models';
import { API_BASE } from './api-base';

const TOKEN_KEY = 'pesawise_token';
const REFRESH_KEY = 'pesawise_refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private appRef = inject(ApplicationRef);

  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly refreshToken = signal<string | null>(localStorage.getItem(REFRESH_KEY));
  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.token());

  /** Shared in-flight refresh so concurrent 401s trigger a single call. */
  private refreshing: Promise<string | null> | null = null;

  async register(name: string, email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthResult>(`${API_BASE}/auth/register`, { name, email, password }),
    );
    this.setSession(res);
  }

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthResult>(`${API_BASE}/auth/login`, { email, password }),
    );
    this.setSession(res);
  }

  async loadMe(): Promise<void> {
    if (!this.token()) return;
    try {
      const user = await firstValueFrom(this.http.get<User>(`${API_BASE}/auth/me`));
      this.user.set(user);
    } catch {
      this.logout();
    }
  }

  async updateProfile(patch: Partial<Pick<User, 'name' | 'currency' | 'avatarColor'>>): Promise<void> {
    const user = await firstValueFrom(
      this.http.patch<User>(`${API_BASE}/auth/me`, patch),
    );
    this.user.set(user);
    // Currency drives the (impure) money pipe — refresh every view.
    this.appRef.tick();
  }

  /**
   * Exchange the stored refresh token for a new access token. Concurrent callers
   * share one in-flight request. Returns the new access token, or null on failure.
   */
  refresh(): Promise<string | null> {
    if (this.refreshing) return this.refreshing;
    const rt = this.refreshToken();
    if (!rt) return Promise.resolve(null);
    this.refreshing = firstValueFrom(
      this.http.post<AuthResult>(`${API_BASE}/auth/refresh`, { refreshToken: rt }),
    )
      .then((res) => {
        this.setSession(res);
        return res.token;
      })
      .catch(() => null)
      .finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }

  logout(): void {
    const rt = this.refreshToken();
    if (rt) {
      // Best-effort server-side revocation.
      this.http.post(`${API_BASE}/auth/logout`, { refreshToken: rt }).subscribe({ error: () => {} });
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.token.set(null);
    this.refreshToken.set(null);
    this.user.set(null);
    this.router.navigateByUrl('/login');
  }

  private setSession(res: AuthResult): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    this.token.set(res.token);
    this.refreshToken.set(res.refreshToken);
    this.user.set(res.user);
  }
}
