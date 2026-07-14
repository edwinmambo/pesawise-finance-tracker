import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

export const APP_VERSION = '1.4.0';

interface Feature { icon: string; title: string; desc: string; }
interface Release { version: string; date: string; title: string; items: string[] }

const FEATURES: Feature[] = [
  { icon: 'grid-1x2', title: 'Dashboard', desc: 'Net worth, income vs expense, spending and recent activity at a glance.' },
  { icon: 'arrow-left-right', title: 'Transactions', desc: 'Log income, expenses and account transfers with categories and channels.' },
  { icon: 'pie-chart', title: 'Budgets', desc: 'Ready-made Kenyan plans or your own, with live tracking and insights.' },
  { icon: 'piggy-bank', title: 'Savings goals', desc: 'Colour-themed goals with progress rings and contributions.' },
  { icon: 'bank', title: 'Loans', desc: 'Track repayment, interest and payoff coaching.' },
  { icon: 'calendar3', title: 'Calendar', desc: 'See money in and out day by day, and drill into any date.' },
  { icon: 'graph-up', title: 'Reports & export', desc: 'Trends and breakdowns, exported to CSV or PDF for any period.' },
  { icon: 'upload', title: 'M-Pesa import', desc: 'Bring in statements and messages, previewed before committing.' },
  { icon: 'arrow-repeat', title: 'Recurring', desc: 'Automate regular income and bills.' },
  { icon: 'currency-exchange', title: 'Multi-currency', desc: 'Hold accounts and budgets in KES, USD and more.' },
  { icon: 'palette', title: 'Themes', desc: 'Light/dark plus eight accent colour schemes that recolour the whole app.' },
  { icon: 'bell', title: 'Notifications', desc: 'Budget overruns, loans due and goals reached — in one place.' },
  { icon: 'wifi-off', title: 'Offline / PWA', desc: 'Installable and works without a connection.' },
  { icon: 'translate', title: 'Kiswahili', desc: 'Switch between English and Kiswahili instantly.' },
];

const RELEASES: Release[] = [
  { version: '1.4.0', date: 'Jul 2026', title: 'Refinements', items: [
    'Eight accent themes (Default, Ocean, Violet, Sunset, Rose, Amber, Teal, Indigo).',
    'Per-budget currency; edit accounts and savings goals inline.',
    'Redesigned notification flyout; clearer budget builder; this About page.',
  ] },
  { version: '1.3.0', date: 'Jul 2026', title: 'Reports, settings & notifications', items: [
    'Interactive report export (format + period).',
    'Segmented settings navigation.',
    'Notification centre with a header bell and history.',
  ] },
  { version: '1.2.0', date: 'Jul 2026', title: 'Pages polish', items: [
    'Budgets: one-click plan customisation, quick-add categories, insights.',
    'Savings themed per goal; calendar day summaries; loan insights.',
  ] },
  { version: '1.1.0', date: 'Jul 2026', title: 'Money & charts', items: [
    'Accounting-style aligned amounts and MPESA-style blur.',
    'Accent-themed, mobile-readable charts.',
  ] },
  { version: '1.0.0', date: 'Jul 2026', title: 'Foundations', items: [
    'Test harness, database migrations and a hardened API.',
    'Reports backend, M-Pesa import, recurring, transfers, FX, PWA and Kiswahili.',
  ] },
];

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-actions"><div><h2 class="section-title">About</h2><div class="muted">What Pesawise is, and what's new</div></div></div>

    <!-- Hero -->
    <div class="card card-pad hero">
      <div class="logo-lg">₭</div>
      <div>
        <h1>Pesawise <span class="ver">v{{ version }}</span></h1>
        <p class="tag">Personal finance, built for how Kenyans actually earn, save and spend.</p>
        <div class="row wrap gap-8 mt-8">
          <a routerLink="/" class="btn btn-primary btn-sm"><i class="bi bi-speedometer2"></i> Open dashboard</a>
          <a routerLink="/reports" class="btn btn-sm"><i class="bi bi-graph-up"></i> Reports</a>
        </div>
      </div>
    </div>

    <!-- Features -->
    <div class="section-title mt-24">Features</div>
    <div class="grid cols-3 mt-8">
      @for (f of features; track f.title) {
        <div class="card card-pad feat">
          <span class="feat-ic"><i class="bi" [class]="'bi-' + f.icon"></i></span>
          <div><div class="feat-t">{{ f.title }}</div><div class="feat-d">{{ f.desc }}</div></div>
        </div>
      }
    </div>

    <!-- Changelog -->
    <div class="section-title mt-24">What's new</div>
    <div class="card card-pad mt-8">
      <div class="timeline">
        @for (r of releases; track r.version) {
          <div class="rel">
            <div class="rel-dot"></div>
            <div class="rel-body">
              <div class="rel-head"><b>v{{ r.version }} · {{ r.title }}</b><span class="muted rel-date">{{ r.date }}</span></div>
              <ul class="rel-items">@for (i of r.items; track i) { <li>{{ i }}</li> }</ul>
            </div>
          </div>
        }
      </div>
    </div>

    <div class="muted foot">
      Built with Angular &amp; NestJS · PostgreSQL · © 2026 Pesawise. Amounts and demo data are for illustration.
    </div>
  `,
  styles: [`
    .hero { display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
      background: linear-gradient(120deg, color-mix(in srgb, var(--brand) 10%, var(--surface)), var(--surface)); }
    .logo-lg { width: 64px; height: 64px; border-radius: 18px; display: grid; place-items: center; font-size: 32px; color: #fff;
      background: linear-gradient(135deg, var(--brand), var(--brand-strong)); flex: none; }
    .hero h1 { font-size: 26px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .ver { font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: color-mix(in srgb, var(--brand) 16%, transparent); color: var(--brand-strong); font-family: var(--num-font); }
    .tag { color: var(--ink-2); margin: 6px 0 0; max-width: 560px; }
    .feat { display: flex; align-items: flex-start; gap: 12px; }
    .feat-ic { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; flex: none; font-size: 17px;
      background: color-mix(in srgb, var(--brand) 14%, transparent); color: var(--brand-strong); }
    .feat-t { font-weight: 680; font-size: 14px; }
    .feat-d { color: var(--ink-2); font-size: 12.5px; margin-top: 2px; }
    .timeline { display: flex; flex-direction: column; }
    .rel { display: flex; gap: 14px; position: relative; padding-bottom: 18px; }
    .rel:last-child { padding-bottom: 0; }
    .rel-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--brand); flex: none; margin-top: 4px; box-shadow: 0 0 0 4px color-mix(in srgb, var(--brand) 18%, transparent); }
    .rel:not(:last-child) .rel-dot::after { content: ''; position: absolute; left: 5px; top: 16px; bottom: 0; width: 2px; background: var(--border); }
    .rel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
    .rel-date { font-size: 12px; font-family: var(--num-font); }
    .rel-items { margin: 6px 0 0; padding-left: 18px; color: var(--ink-2); font-size: 13px; }
    .rel-items li { margin: 3px 0; }
    .foot { font-size: 12px; text-align: center; margin: 22px 0 8px; }
  `],
})
export class AboutComponent {
  version = APP_VERSION;
  features = FEATURES;
  releases = RELEASES;
}
