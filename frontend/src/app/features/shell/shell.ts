import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';

interface NavLink { path: string; label: string; icon: string; exact?: boolean; }

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <!-- Desktop sidebar -->
      <aside class="sidebar desk">
        <div class="brand"><span class="logo">₭</span> Pesawise</div>
        <nav class="side-nav">
          @for (l of links; track l.path) {
            <a [routerLink]="l.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!l.exact }">
              <i class="bi" [class]="'bi-' + l.icon"></i> {{ l.label }}
            </a>
          }
        </nav>
        <div class="spacer"></div>
        <div class="user-box">
          <div class="avatar" [style.background]="avatarBg()">{{ initials() }}</div>
          <div class="user-meta">
            <div class="nm">{{ auth.user()?.name || 'Account' }}</div>
            <div class="em">{{ auth.user()?.persona || auth.user()?.email }}</div>
          </div>
        </div>
        <button class="btn btn-ghost mt-8" style="justify-content:flex-start" (click)="auth.logout()">
          <i class="bi bi-box-arrow-left"></i> Log out
        </button>
      </aside>

      <div class="main">
        <!-- Mobile navbar -->
        <nav class="navbar d-lg-none px-3" style="border-bottom:1px solid var(--border);background:var(--surface);position:sticky;top:0;z-index:30">
          <button class="btn btn-icon menu-btn" type="button" data-bs-toggle="offcanvas" data-bs-target="#sideMenu" aria-label="Menu">
            <i class="bi bi-list" style="font-size:20px"></i>
          </button>
          <span class="brand" style="padding:0;font-size:18px"><span class="logo" style="width:30px;height:30px;font-size:16px">₭</span> Pesawise</span>
          <button class="btn btn-icon" (click)="theme.toggle()" aria-label="Toggle theme">
            <i class="bi" [class]="theme.theme() === 'dark' ? 'bi-sun' : 'bi-moon-stars'"></i>
          </button>
        </nav>

        <!-- Desktop topbar -->
        <header class="topbar d-none d-lg-flex">
          <div>
            <h1>{{ greeting() }}, {{ firstName() }} 👋</h1>
            <div class="sub">Here's your financial picture today</div>
          </div>
          <div class="flex-grow-1"></div>
          <button class="btn btn-icon" (click)="theme.toggle()" [title]="theme.theme() === 'dark' ? 'Light mode' : 'Dark mode'">
            <i class="bi" [class]="theme.theme() === 'dark' ? 'bi-sun' : 'bi-moon-stars'"></i>
          </button>
        </header>

        <div class="content">
          <router-outlet />
        </div>
      </div>
    </div>

    <!-- Mobile offcanvas menu -->
    <div class="offcanvas offcanvas-start" tabindex="-1" id="sideMenu" style="width:270px">
      <div class="offcanvas-header">
        <span class="brand" style="padding:0"><span class="logo">₭</span> Pesawise</span>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body d-flex flex-column">
        <div class="user-box mb-3">
          <div class="avatar" [style.background]="avatarBg()">{{ initials() }}</div>
          <div class="user-meta">
            <div class="nm">{{ auth.user()?.name || 'Account' }}</div>
            <div class="em">{{ auth.user()?.persona || auth.user()?.email }}</div>
          </div>
        </div>
        <nav class="side-nav">
          @for (l of links; track l.path) {
            <a [routerLink]="l.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!l.exact }" data-bs-dismiss="offcanvas">
              <i class="bi" [class]="'bi-' + l.icon"></i> {{ l.label }}
            </a>
          }
        </nav>
        <div class="spacer"></div>
        <button class="btn btn-ghost mt-8" style="justify-content:flex-start" (click)="auth.logout()" data-bs-dismiss="offcanvas">
          <i class="bi bi-box-arrow-left"></i> Log out
        </button>
      </div>
    </div>
  `,
})
export class ShellComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);

  links: NavLink[] = [
    { path: '/', label: 'Dashboard', icon: 'grid-1x2-fill', exact: true },
    { path: '/transactions', label: 'Transactions', icon: 'arrow-left-right' },
    { path: '/budgets', label: 'Budgets', icon: 'pie-chart-fill' },
    { path: '/loans', label: 'Loans', icon: 'bank2' },
    { path: '/savings', label: 'Savings', icon: 'piggy-bank-fill' },
    { path: '/reports', label: 'Reports', icon: 'graph-up-arrow' },
    { path: '/settings', label: 'Settings', icon: 'gear-fill' },
  ];

  firstName(): string {
    return this.auth.user()?.name?.split(' ')[0] ?? 'there';
  }
  initials(): string {
    const n = this.auth.user()?.name ?? '';
    return n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'U';
  }
  avatarBg(): string {
    const c = this.auth.user()?.avatarColor ?? 'var(--brand)';
    return `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 60%, #000))`;
  }
  greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }
}
