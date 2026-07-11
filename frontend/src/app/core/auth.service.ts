import { ApplicationRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthResult, User } from './models';
import { API_BASE } from './api-base';

const TOKEN_KEY = 'pesawise_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private appRef = inject(ApplicationRef);

  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  readonly user = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.token());

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

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.user.set(null);
    this.router.navigateByUrl('/login');
  }

  private setSession(res: AuthResult): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    this.token.set(res.token);
    this.user.set(res.user);
  }
}
