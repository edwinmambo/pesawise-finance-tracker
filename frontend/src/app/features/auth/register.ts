import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  styleUrl: './auth.scss',
  template: `
    <div class="auth">
      <div class="auth-brand">
        <div class="logo-row"><span class="logo">₭</span> Pesawise</div>
        <div>
          <h2>Take control of your finances.</h2>
          <p class="lead">Join Pesawise and start tracking every shilling — income, spending, loans and savings goals.</p>
        </div>
        <div class="auth-points">
          <div class="pt"><i class="bi bi-bar-chart-line"></i> Beautiful, clear dashboards</div>
          <div class="pt"><i class="bi bi-cash-coin"></i> Built for the Kenyan shilling</div>
          <div class="pt"><i class="bi bi-shield-lock"></i> Private &amp; secure</div>
        </div>
      </div>

      <div class="auth-form-side">
        <div class="auth-card">
          <h1>Create your account</h1>
          <p class="sub">Start tracking in under a minute</p>

          @if (error()) { <div class="auth-err">{{ error() }}</div> }

          <form (ngSubmit)="submit()">
            <div class="field">
              <label>Full name</label>
              <input class="input" name="name" [(ngModel)]="name" placeholder="Wanjiku Kamau" required />
            </div>
            <div class="field">
              <label>Email</label>
              <input class="input" type="email" name="email" [(ngModel)]="email" placeholder="you@example.com" required autocomplete="email" />
            </div>
            <div class="field">
              <label>Password</label>
              <input class="input" type="password" name="password" [(ngModel)]="password" placeholder="At least 6 characters" required autocomplete="new-password" />
            </div>
            <button class="btn btn-primary btn-block" type="submit" [disabled]="loading()">
              {{ loading() ? 'Creating account…' : 'Create account' }}
            </button>
          </form>

          <p class="auth-alt">Already have an account? <a routerLink="/login">Log in</a></p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  name = '';
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  async submit(): Promise<void> {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.register(this.name.trim(), this.email.trim(), this.password);
      this.router.navigateByUrl('/');
    } catch (e: any) {
      this.error.set(e?.error?.message ?? 'Registration failed. Try a different email.');
    } finally {
      this.loading.set(false);
    }
  }
}
