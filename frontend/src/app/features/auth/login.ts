import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

interface PersonaLogin {
  name: string;
  email: string;
  password: string;
  role: string;
  emoji: string;
  color: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  styleUrl: './auth.scss',
  template: `
    <div class="auth">
      <div class="auth-brand">
        <div class="logo-row"><span class="logo">₭</span> Pesawise</div>
        <div>
          <h2>Your money, wisely tracked.</h2>
          <p class="lead">Income, spending, loans, savings and budgets — one beautiful dashboard built for the Kenyan shilling.</p>
        </div>
        <div class="auth-points">
          <div class="pt"><i class="bi bi-phone"></i> M-Pesa, bank &amp; cash in one view</div>
          <div class="pt"><i class="bi bi-pie-chart"></i> Ready-made Comrade, Hustler &amp; Corporate budgets</div>
          <div class="pt"><i class="bi bi-bullseye"></i> Reach every savings goal</div>
        </div>
      </div>

      <div class="auth-form-side">
        <div class="auth-card">
          <h1>Welcome back</h1>
          <p class="sub">Log in, or tap a persona to explore instantly</p>

          @if (error()) { <div class="auth-err">{{ error() }}</div> }

          <form (ngSubmit)="submit()">
            <div class="field">
              <label>Email</label>
              <input class="input" type="email" name="email" [(ngModel)]="email" placeholder="you@example.com" required autocomplete="email" />
            </div>
            <div class="field">
              <label>Password</label>
              <input class="input" type="password" name="password" [(ngModel)]="password" placeholder="••••••••" required autocomplete="current-password" />
            </div>
            <button class="btn btn-primary btn-block btn-lg" type="submit" [disabled]="loading()">
              {{ loading() ? 'Logging in…' : 'Log in' }}
            </button>
          </form>

          <div class="persona-head"><span>Or explore a persona</span></div>
          <div class="persona-grid">
            @for (p of personas; track p.email) {
              <button class="persona-card" (click)="quickLogin(p)" [disabled]="loading()">
                <span class="pemoji" [style.background]="tint(p.color)">{{ p.emoji }}</span>
                <span class="pmeta">
                  <span class="pn">{{ p.name }}</span>
                  <span class="pr">{{ p.role }}</span>
                </span>
                <i class="bi bi-arrow-right-short"></i>
              </button>
            }
          </div>

          <p class="auth-alt">New here? <a routerLink="/register">Create an account</a></p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  personas: PersonaLogin[] = [
    { name: 'Brian Otieno', email: 'brian@pesawise.co.ke', password: 'pesa1234', role: 'Comrade · Student', emoji: '🎓', color: '#2563eb' },
    { name: 'Kevin Mwangi', email: 'kevin@pesawise.co.ke', password: 'pesa1234', role: 'Hustler · Casual jobs', emoji: '💪', color: '#ea580c' },
    { name: 'Faith Njeri', email: 'faith@pesawise.co.ke', password: 'pesa1234', role: 'Corporate · Salaried', emoji: '💼', color: '#4f46e5' },
    { name: 'Peter Kamau', email: 'peter@pesawise.co.ke', password: 'pesa1234', role: 'Boda boda rider', emoji: '🏍️', color: '#0d9488' },
    { name: 'Susan Achieng', email: 'susan@pesawise.co.ke', password: 'pesa1234', role: 'Mama Mboga · Vendor', emoji: '🥬', color: '#16a34a' },
    { name: 'James Kariuki', email: 'james@pesawise.co.ke', password: 'pesa1234', role: 'Diaspora · Qatar', emoji: '✈️', color: '#7c3aed' },
    { name: 'Wanjiku Kamau', email: 'demo@pesawise.co.ke', password: 'demo1234', role: 'Classic demo', emoji: '🌿', color: '#10a37f' },
  ];

  tint(color: string): string {
    return `color-mix(in srgb, ${color} 16%, transparent)`;
  }

  quickLogin(p: PersonaLogin): void {
    this.email = p.email;
    this.password = p.password;
    this.submit();
  }

  async submit(): Promise<void> {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.login(this.email.trim(), this.password);
      this.router.navigateByUrl('/');
    } catch (e: any) {
      this.error.set(e?.error?.message ?? 'Login failed. Check your credentials.');
    } finally {
      this.loading.set(false);
    }
  }
}
