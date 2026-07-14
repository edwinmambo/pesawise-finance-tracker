import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ThemeService, ACCENTS } from '../../core/theme.service';
import { PrivacyService } from '../../core/privacy.service';
import { I18nService } from '../../core/i18n.service';
import { NotificationsService } from '../../core/notifications.service';
import { AppNotification } from '../../core/models';

interface NavLink { path: string; label: string; icon: string; exact?: boolean; }

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet],
  template: `
    <div class="app-shell">
      <!-- Desktop sidebar -->
      <aside class="sidebar desk">
        <div class="brand"><span class="logo">₭</span> Pesawise</div>
        <nav class="side-nav">
          @for (l of links(); track l.path) {
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
      </aside>

      <div class="main">
        <!-- Mobile navbar -->
        <nav class="navbar d-lg-none px-3" style="border-bottom:1px solid var(--border);background:var(--surface);position:sticky;top:0;z-index:30">
          <button class="btn btn-icon menu-btn" type="button" data-bs-toggle="offcanvas" data-bs-target="#sideMenu" aria-label="Menu">
            <i class="bi bi-list" style="font-size:20px"></i>
          </button>
          <span class="brand" style="padding:0;font-size:18px"><span class="logo" style="width:30px;height:30px;font-size:16px">₭</span> Pesawise</span>
          <div class="row gap-6">
            <button class="btn btn-icon" (click)="privacy.toggle()" [attr.aria-label]="privacy.hidden() ? 'Show balances' : 'Hide balances'">
              <i class="bi" [class]="privacy.hidden() ? 'bi-eye-slash' : 'bi-eye'"></i>
            </button>
            <ng-container [ngTemplateOutlet]="bellBtn"></ng-container>
            <ng-container [ngTemplateOutlet]="profileMenu"></ng-container>
          </div>
        </nav>

        <!-- Desktop topbar -->
        <header class="topbar d-none d-lg-flex">
          <div>
            <h1>{{ todayLong() }}</h1>
            <div class="sub">Welcome back, {{ firstName() }} 👋</div>
          </div>
          <div class="flex-grow-1"></div>
          <button class="btn btn-icon" (click)="privacy.toggle()" [title]="privacy.hidden() ? 'Show balances' : 'Hide balances'">
            <i class="bi" [class]="privacy.hidden() ? 'bi-eye-slash' : 'bi-eye'"></i>
          </button>
          <ng-container [ngTemplateOutlet]="bellBtn"></ng-container>
          <ng-container [ngTemplateOutlet]="profileMenu"></ng-container>
        </header>

        <div class="content">
          <router-outlet />
        </div>
      </div>
    </div>

    <!-- Notification bell button (opens the shared flyout panel) -->
    <ng-template #bellBtn>
      <button class="btn btn-icon bell-btn" type="button" aria-label="Notifications" (click)="toggleBell()">
        <i class="bi bi-bell"></i>
        @if (notif.unread()) { <span class="bell-badge">{{ notif.unread() > 9 ? '9+' : notif.unread() }}</span> }
      </button>
    </ng-template>

    <!-- Notification flyout — a self-controlled fixed panel so nothing clips it. -->
    @if (bellOpen()) {
      <div class="notif-backdrop" (click)="bellOpen.set(false)"></div>
      <div class="notif-panel" role="dialog" aria-label="Notifications">
        <div class="notif-head">
          <b>Notifications</b>
          <div class="row gap-8">
            @if (notif.unread()) { <button class="btn btn-sm btn-ghost" (click)="notif.markAllRead()">Mark all read</button> }
            <button class="btn btn-icon btn-ghost btn-sm" (click)="bellOpen.set(false)" aria-label="Close"><i class="bi bi-x-lg"></i></button>
          </div>
        </div>
        @if (notif.items().length) {
          <div class="notif-list">
            @for (n of notif.items(); track n.id) {
              <a class="notif-item" [class.unread]="!n.read" [routerLink]="n.link || null" (click)="onNotifClick(n)">
                <span class="notif-ic">{{ n.icon }}</span>
                <span class="notif-main">
                  <span class="notif-title">{{ n.title }}</span>
                  <span class="notif-body">{{ n.body }}</span>
                </span>
                @if (!n.read) { <span class="notif-dot"></span> }
              </a>
            }
          </div>
        } @else {
          <div class="notif-empty">You're all caught up 🎉</div>
        }
      </div>
    }

    <!-- Profile avatar dropdown (Google-style) -->
    <ng-template #profileMenu>
      <div class="dropdown">
        <button class="avatar-btn" type="button" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-expanded="false" aria-label="Profile menu">
          <span class="avatar" [style.background]="avatarBg()">{{ initials() }}</span>
        </button>
        <div class="dropdown-menu dropdown-menu-end profile-menu">
          <div class="pm-head">
            <span class="avatar" [style.background]="avatarBg()">{{ initials() }}</span>
            <div class="min0">
              <div class="nm">{{ auth.user()?.name }}</div>
              <div class="em">{{ auth.user()?.email }}</div>
            </div>
          </div>

          <div class="pm-section">
            <div class="pm-label">Appearance</div>
            <div class="segmented" style="width:100%">
              <button style="flex:1" [class.active]="theme.mode() === 'light'" (click)="theme.setMode('light')">☀️ Light</button>
              <button style="flex:1" [class.active]="theme.mode() === 'dark'" (click)="theme.setMode('dark')">🌙 Dark</button>
            </div>
            <div class="accents">
              @for (a of accents; track a.id) {
                <button class="acc-swatch" [class.sel]="theme.accent() === a.id" [style.background]="a.swatch" [title]="a.name" (click)="theme.setAccent(a.id)"></button>
              }
            </div>
          </div>

          <div class="pm-section">
            <div class="pm-label">{{ i18n.t('common.language') }}</div>
            <div class="segmented" style="width:100%">
              <button style="flex:1" [class.active]="i18n.lang() === 'en'" (click)="i18n.setLang('en')">🇬🇧 English</button>
              <button style="flex:1" [class.active]="i18n.lang() === 'sw'" (click)="i18n.setLang('sw')">🇰🇪 Kiswahili</button>
            </div>
          </div>

          <button class="pm-item" (click)="privacy.toggle()">
            <i class="bi" [class]="privacy.hidden() ? 'bi-eye' : 'bi-eye-slash'"></i>
            {{ privacy.hidden() ? 'Show balances' : 'Hide balances' }}
          </button>
          <a class="pm-item" routerLink="/settings"><i class="bi bi-gear"></i> {{ i18n.t('nav.settings') }}</a>
          <a class="pm-item" routerLink="/about"><i class="bi bi-info-circle"></i> {{ i18n.t('nav.about') }}</a>
          <button class="pm-item danger" (click)="auth.logout()"><i class="bi bi-box-arrow-left"></i> {{ i18n.t('action.logout') }}</button>
        </div>
      </div>
    </ng-template>

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
          @for (l of links(); track l.path) {
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
  styles: [`
    .bell-btn { position: relative; }
    .bell-badge { position: absolute; top: 2px; right: 2px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 999px;
      background: var(--expense); color: #fff; font-size: 10px; font-weight: 700; display: grid; place-items: center; line-height: 1;
      box-shadow: 0 0 0 2px var(--surface); }
    .notif-backdrop { position: fixed; inset: 0; z-index: 1090; }
    .notif-panel { position: fixed; top: 62px; right: 16px; z-index: 1091; width: 360px; max-width: calc(100vw - 24px);
      max-height: min(70vh, 560px); overflow: hidden; display: flex; flex-direction: column;
      background: var(--surface); border: 1px solid var(--border-2); border-radius: 16px; box-shadow: var(--shadow-lg);
      animation: pop .16s ease; }
    @media (max-width: 600px) { .notif-panel { top: 60px; left: 12px; right: 12px; width: auto; } }
    .notif-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border); flex: none; }
    .notif-list { overflow-y: auto; }
    .notif-item { display: flex; align-items: flex-start; gap: 10px; padding: 11px 14px; border-bottom: 1px solid var(--border); text-decoration: none; color: var(--ink); position: relative; }
    .notif-item:last-child { border-bottom: none; }
    .notif-item:hover { background: var(--surface-2); }
    .notif-item.unread { background: color-mix(in srgb, var(--brand) 7%, var(--surface)); }
    .notif-ic { font-size: 18px; flex: none; }
    .notif-main { display: flex; flex-direction: column; min-width: 0; }
    .notif-title { font-weight: 650; font-size: 13px; }
    .notif-body { font-size: 12px; color: var(--ink-2); }
    .notif-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--brand); flex: none; margin-top: 5px; margin-left: auto; }
    .notif-empty { padding: 26px 14px; text-align: center; color: var(--muted); font-size: 13px; }
    .avatar-btn { border: none; background: transparent; padding: 2px; border-radius: 50%; cursor: pointer; line-height: 0; transition: transform .1s, box-shadow .12s; }
    .avatar-btn:hover { transform: translateY(-1px); }
    .avatar-btn .avatar { width: 38px; height: 38px; border-radius: 50%; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 13px; box-shadow: 0 0 0 2px var(--surface), 0 4px 10px rgba(0,0,0,.15); }
    .profile-menu { min-width: 260px; padding: 8px; }
    .pm-head { display: flex; align-items: center; gap: 12px; padding: 10px 10px 12px; border-bottom: 1px solid var(--border); margin-bottom: 8px; }
    .pm-head .avatar { width: 42px; height: 42px; border-radius: 50%; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
    .pm-head .min0 { min-width: 0; }
    .pm-head .nm { font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pm-head .em { color: var(--muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pm-section { padding: 8px 8px 12px; border-bottom: 1px solid var(--border); margin-bottom: 6px; }
    .pm-label { font-size: 11px; font-weight: 650; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin-bottom: 8px; }
    .accents { display: flex; gap: 8px; margin-top: 10px; }
    .acc-swatch { width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform .08s; }
    .acc-swatch:hover { transform: scale(1.12); }
    .acc-swatch.sel { border-color: var(--ink); box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px currentColor; }
    .pm-item { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; border: none; background: transparent; color: var(--ink); font-weight: 560; font-size: 13.5px; padding: 9px 10px; border-radius: 9px; cursor: pointer; }
    .pm-item:hover { background: var(--surface-2); }
    .pm-item.danger { color: var(--critical); }
    .pm-item .bi { font-size: 15px; width: 18px; }
  `],
})
export class ShellComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  privacy = inject(PrivacyService);
  i18n = inject(I18nService);
  notif = inject(NotificationsService);
  bellOpen = signal(false);

  toggleBell(): void {
    const open = !this.bellOpen();
    this.bellOpen.set(open);
    if (open) this.notif.refresh();
  }
  onNotifClick(n: AppNotification): void {
    this.notif.markRead(n);
    this.bellOpen.set(false);
  }
  accents = ACCENTS;

  private baseLinks: (Omit<NavLink, 'label'> & { key: string })[] = [
    { path: '/', key: 'nav.dashboard', icon: 'grid-1x2-fill', exact: true },
    { path: '/transactions', key: 'nav.transactions', icon: 'arrow-left-right' },
    { path: '/budgets', key: 'nav.budgets', icon: 'pie-chart-fill' },
    { path: '/calendar', key: 'nav.calendar', icon: 'calendar3' },
    { path: '/loans', key: 'nav.loans', icon: 'bank2' },
    { path: '/savings', key: 'nav.savings', icon: 'piggy-bank-fill' },
    { path: '/reports', key: 'nav.reports', icon: 'graph-up-arrow' },
    { path: '/import', key: 'nav.import', icon: 'cloud-arrow-down-fill' },
    { path: '/recurring', key: 'nav.recurring', icon: 'arrow-repeat' },
    { path: '/settings', key: 'nav.settings', icon: 'gear-fill' },
  ];

  // Reactive to the language signal — flips EN⇄SW instantly.
  links = computed<NavLink[]>(() =>
    this.baseLinks.map((l) => ({ ...l, label: this.i18n.t(l.key) })),
  );

  firstName(): string {
    return this.auth.user()?.name?.split(' ')[0] ?? 'there';
  }
  initials(): string {
    const n = this.auth.user()?.name ?? '';
    return n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'U';
  }
  avatarBg(): string {
    // No custom photo yet, so the initials avatar follows the chosen accent —
    // the same colour the charts use — for a consistent, themed identity.
    const c = 'var(--brand)';
    return `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 60%, #000))`;
  }
  greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }
  /** Local long date, e.g. "Monday, 14 July". */
  todayLong(): string {
    return new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  }
}
