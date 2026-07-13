import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ThemeService, ACCENTS } from '../../core/theme.service';
import { PrefsService } from '../../core/prefs.service';
import { CURRENCIES } from '../../core/currency';
import { Account, AccountType, Category, CategoryKind } from '../../core/models';
import { MoneyComponent } from '../../shared/money';
import { IconPickerComponent, COLOR_CHOICES } from '../../shared/icon-picker';

const ACCOUNT_TYPES: AccountType[] = ['MPESA', 'BANK', 'CASH', 'SACCO'];
const ACCOUNT_ICON: Record<AccountType, string> = { MPESA: '📱', BANK: '🏦', CASH: '💵', SACCO: '🤝' };

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, MoneyComponent, IconPickerComponent],
  template: `
    <div class="page-actions"><div><h2 class="section-title">Settings</h2><div class="muted">Accounts, categories &amp; profile</div></div></div>

    <div class="row gap-8 wrap" style="margin-bottom:18px">
      <button class="chip" [class.active]="tab() === 'accounts'" (click)="tab.set('accounts')">Accounts</button>
      <button class="chip" [class.active]="tab() === 'categories'" (click)="tab.set('categories')">Categories</button>
      <button class="chip" [class.active]="tab() === 'profile'" (click)="tab.set('profile')">Profile</button>
    </div>

    @switch (tab()) {
      @case ('accounts') {
        <div class="card">
          <div class="card-head"><div><h3>Accounts</h3><div class="sub">{{ accounts().length }} accounts</div></div><button class="btn btn-primary btn-sm" (click)="openAccount()"><i class="bi bi-plus-lg"></i> Add account</button></div>
          <div class="table-wrap"><table class="table" style="min-width:420px"><tbody>
            @for (a of accounts(); track a.id) {
              <tr>
                <td style="width:44px"><div class="txicon" [style.background]="tint(a.color)">{{ icon(a.type) }}</div></td>
                <td><div style="font-weight:600">{{ a.name }}</div><div class="muted" style="font-size:12px">{{ a.institution || typeLabel(a.type) }}</div></td>
                <td class="num" style="font-weight:650" [class.neg]="a.currentBalance < 0"><app-money [value]="a.currentBalance" /></td>
                <td style="width:60px" class="num"><button class="btn btn-ghost btn-sm btn-icon" (click)="remove(a)"><i class="bi bi-trash"></i></button></td>
              </tr>
            }
          </tbody></table></div>
        </div>
      }
      @case ('categories') {
        <div class="page-actions" style="margin-bottom:14px">
          <div class="muted" style="font-size:13px">Add your own categories, pick icons &amp; colours, or edit existing ones.</div>
          <button class="btn btn-primary btn-sm" (click)="openCat()"><i class="bi bi-plus-lg"></i> New category</button>
        </div>
        <div class="grid cols-2">
          <div class="card">
            <div class="card-head"><div><h3>Expense categories</h3><div class="sub">{{ expenseCats().length }}</div></div></div>
            <div class="card-pad" style="display:flex;flex-direction:column;gap:8px">
              @for (c of expenseCats(); track c.id) {
                <div class="between cat-item">
                  <span><span class="cat-dot" [style.background]="tint(c.color)">{{ c.icon }}</span> {{ c.name }} @if (c.isSystem) { <i class="bi bi-lock-fill sys" title="System category"></i> }</span>
                  <span class="row gap-6">
                    <button class="btn btn-ghost btn-sm btn-icon" (click)="openCat(c)"><i class="bi bi-pencil"></i></button>
                    @if (!c.isSystem) { <button class="btn btn-ghost btn-sm btn-icon" (click)="removeCat(c)"><i class="bi bi-x-lg"></i></button> }
                  </span>
                </div>
              } @empty { <div class="muted">No expense categories.</div> }
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div><h3>Income categories</h3><div class="sub">{{ incomeCats().length }}</div></div></div>
            <div class="card-pad" style="display:flex;flex-direction:column;gap:8px">
              @for (c of incomeCats(); track c.id) {
                <div class="between cat-item">
                  <span><span class="cat-dot" [style.background]="tint(c.color)">{{ c.icon }}</span> {{ c.name }} @if (c.isSystem) { <i class="bi bi-lock-fill sys" title="System category"></i> }</span>
                  <span class="row gap-6">
                    <button class="btn btn-ghost btn-sm btn-icon" (click)="openCat(c)"><i class="bi bi-pencil"></i></button>
                    @if (!c.isSystem) { <button class="btn btn-ghost btn-sm btn-icon" (click)="removeCat(c)"><i class="bi bi-x-lg"></i></button> }
                  </span>
                </div>
              } @empty { <div class="muted">No income categories.</div> }
            </div>
          </div>
        </div>
      }
      @case ('profile') {
        <div class="card card-pad" style="max-width:560px">
          <div class="row" style="gap:16px;margin-bottom:22px">
            <div class="avatar-lg" [style.background]="avatarBg()">{{ initials() }}</div>
            <div><div style="font-weight:700;font-size:16px">{{ auth.user()?.name }}</div><div class="muted">{{ auth.user()?.persona || auth.user()?.email }}</div></div>
          </div>

          <div class="field"><label>Display name</label>
            <div class="row gap-8">
              <input class="input" [(ngModel)]="nameEdit" />
              <button class="btn btn-primary" [disabled]="!nameEdit().trim() || nameEdit() === auth.user()?.name" (click)="saveName()">Save</button>
            </div>
          </div>

          <div class="field"><label>Display currency</label>
            <select class="input" [ngModel]="auth.user()?.currency" (ngModelChange)="setCurrency($event)">
              @for (c of currencies; track c.code) { <option [value]="c.code">{{ c.name }} ({{ c.code }} · {{ c.symbol }})</option> }
            </select>
            <div class="muted" style="font-size:11.5px;margin-top:5px">Changes the symbol &amp; formatting everywhere. Amounts aren't converted.</div>
          </div>

          <div class="field"><label>Appearance</label>
            <div class="row gap-8 wrap">
              <div class="segmented">
                <button [class.active]="theme.mode() === 'light'" (click)="theme.setMode('light')">☀️ Light</button>
                <button [class.active]="theme.mode() === 'dark'" (click)="theme.setMode('dark')">🌙 Dark</button>
              </div>
              <div class="row gap-6">
                @for (a of accents; track a.id) {
                  <button class="acc-swatch" [class.sel]="theme.accent() === a.id" [style.background]="a.swatch" [title]="a.name" (click)="theme.setAccent(a.id)"></button>
                }
              </div>
            </div>
          </div>

          <div class="field"><label>First day of week</label>
            <div class="segmented">
              <button [class.active]="prefs.weekStart() === 'mon'" (click)="prefs.setWeekStart('mon')">Monday</button>
              <button [class.active]="prefs.weekStart() === 'sun'" (click)="prefs.setWeekStart('sun')">Sunday</button>
            </div>
          </div>

          <div class="mt-24"><button class="btn btn-danger" (click)="auth.logout()"><i class="bi bi-box-arrow-left"></i> Log out</button></div>
        </div>
      }
    }

    <!-- Account modal -->
    @if (showAccount()) {
      <div class="overlay" (click)="showAccount.set(false)">
        <div class="modal" style="max-width:460px;width:100%" (click)="$event.stopPropagation()">
          <div class="modal-head"><h3>Add account</h3><button class="btn btn-icon btn-ghost" (click)="showAccount.set(false)"><i class="bi bi-x-lg"></i></button></div>
          <div class="modal-body">
            <div class="field"><label>Account name</label><input class="input" [(ngModel)]="af.name" placeholder="e.g. Equity Bank" /></div>
            <div class="form-row">
              <div class="field"><label>Type</label><select class="input" [(ngModel)]="af.type">@for (t of accountTypes; track t){<option [value]="t">{{ typeLabel(t) }}</option>}</select></div>
              <div class="field"><label>Opening balance</label><input class="input" type="number" [(ngModel)]="af.openingBalance" placeholder="0" /></div>
            </div>
            <div class="field"><label>Institution (optional)</label><input class="input" [(ngModel)]="af.institution" placeholder="e.g. Safaricom" /></div>
            <div class="field"><label>Colour</label>
              <div class="row gap-8 wrap">
                @for (c of swatches; track c) { <button type="button" class="acc-swatch" [class.sel]="af.color === c" [style.background]="c" (click)="af.color = c"></button> }
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="showAccount.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="saveAccount()" [disabled]="!af.name || saving()">Add account</button>
          </div>
        </div>
      </div>
    }

    <!-- Category add/edit modal -->
    @if (showCat()) {
      <div class="overlay" (click)="showCat.set(false)">
        <div class="modal" style="max-width:520px;width:100%" (click)="$event.stopPropagation()">
          <div class="modal-head"><h3>{{ editingCatId() ? 'Edit category' : 'New category' }}</h3><button class="btn btn-icon btn-ghost" (click)="showCat.set(false)"><i class="bi bi-x-lg"></i></button></div>
          <div class="modal-body">
            <div class="form-row">
              <div class="field"><label>Name</label><input class="input" [(ngModel)]="cf.name" placeholder="e.g. Groceries" /></div>
              <div class="field"><label>Type</label><select class="input" [(ngModel)]="cf.kind" [disabled]="!!editingCatId()"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></div>
            </div>
            <div class="cat-preview"><span class="txicon" [style.background]="tint(cf.color)">{{ cf.icon }}</span> <b>{{ cf.name || 'Preview' }}</b></div>
            <app-icon-picker [(icon)]="cf.icon" [(color)]="cf.color" />
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="showCat.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="saveCat()" [disabled]="!cf.name.trim() || saving()">{{ editingCatId() ? 'Save' : 'Add category' }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cat-item { padding: 8px 12px; border-radius: 10px; background: var(--surface-2); font-size: 13.5px; }
    .cat-dot { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; margin-right: 6px; font-size: 14px; vertical-align: middle; }
    .sys { font-size: 10px; color: var(--muted); margin-left: 4px; }
    .prof-row { padding: 14px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
    .avatar-lg { width: 56px; height: 56px; border-radius: 50%; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 18px; }
    .acc-swatch { width: 30px; height: 30px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform .08s; }
    .acc-swatch:hover { transform: scale(1.1); }
    .acc-swatch.sel { border-color: var(--ink); box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px currentColor; }
    .cat-preview { display: flex; align-items: center; gap: 10px; padding: 12px; background: var(--surface-2); border-radius: 12px; margin-bottom: 16px; }
  `],
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  theme = inject(ThemeService);
  prefs = inject(PrefsService);

  tab = signal<'accounts' | 'categories' | 'profile'>('accounts');
  accounts = signal<Account[]>([]);
  categories = signal<Category[]>([]);
  saving = signal(false);

  accountTypes = ACCOUNT_TYPES;
  currencies = CURRENCIES;
  accents = ACCENTS;
  swatches = COLOR_CHOICES;
  nameEdit = signal('');

  showAccount = signal(false);
  af = this.blankAccount();

  showCat = signal(false);
  editingCatId = signal<string | null>(null);
  cf: { name: string; icon: string; color: string; kind: CategoryKind } = { name: '', icon: '🏷️', color: '#64748b', kind: 'EXPENSE' };

  expenseCats = computed(() => this.categories().filter((c) => c.kind === 'EXPENSE'));
  incomeCats = computed(() => this.categories().filter((c) => c.kind === 'INCOME'));

  ngOnInit(): void {
    this.reload();
    this.nameEdit.set(this.auth.user()?.name ?? '');
  }
  reload(): void {
    this.api.accounts().subscribe((a) => this.accounts.set(a));
    this.api.categories().subscribe((c) => this.categories.set(c));
  }

  // --- Accounts ---
  blankAccount() { return { name: '', type: 'MPESA' as AccountType, openingBalance: 0 as number, institution: '', color: '#0ea5e9' }; }
  openAccount(): void { this.af = this.blankAccount(); this.showAccount.set(true); }
  saveAccount(): void {
    if (!this.af.name) return;
    this.saving.set(true);
    this.api.createAccount({ name: this.af.name, type: this.af.type, openingBalance: Number(this.af.openingBalance) || 0, institution: this.af.institution || undefined, color: this.af.color }).subscribe({
      next: () => { this.saving.set(false); this.showAccount.set(false); this.reload(); },
      error: () => this.saving.set(false),
    });
  }
  remove(a: Account): void {
    if (!confirm(`Delete account "${a.name}"? Its transactions will be kept but unlinked.`)) return;
    this.api.deleteAccount(a.id).subscribe(() => this.reload());
  }

  // --- Categories ---
  openCat(c?: Category): void {
    if (c) {
      this.editingCatId.set(c.id);
      this.cf = { name: c.name, icon: c.icon, color: c.color, kind: c.kind };
    } else {
      this.editingCatId.set(null);
      this.cf = { name: '', icon: '🏷️', color: '#64748b', kind: 'EXPENSE' };
    }
    this.showCat.set(true);
  }
  saveCat(): void {
    if (!this.cf.name.trim()) return;
    this.saving.set(true);
    const body = { name: this.cf.name.trim(), icon: this.cf.icon, color: this.cf.color, kind: this.cf.kind };
    const req = this.editingCatId()
      ? this.api.updateCategory(this.editingCatId()!, body)
      : this.api.createCategory(body);
    req.subscribe({
      next: () => { this.saving.set(false); this.showCat.set(false); this.reload(); },
      error: () => this.saving.set(false),
    });
  }
  removeCat(c: Category): void {
    if (c.isSystem) return;
    if (!confirm(`Delete category "${c.name}"?`)) return;
    this.api.deleteCategory(c.id).subscribe(() => this.reload());
  }

  // --- Profile ---
  saveName(): void {
    const name = this.nameEdit().trim();
    if (!name) return;
    this.auth.updateProfile({ name });
  }
  setCurrency(code: string): void {
    this.auth.updateProfile({ currency: code });
  }

  icon(t: AccountType): string { return ACCOUNT_ICON[t]; }
  typeLabel(t: AccountType): string { return t === 'MPESA' ? 'M-Pesa' : t.charAt(0) + t.slice(1).toLowerCase(); }
  initials(): string { const n = this.auth.user()?.name ?? ''; return n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'U'; }
  avatarBg(): string { const c = this.auth.user()?.avatarColor ?? 'var(--brand)'; return `linear-gradient(135deg, ${c}, color-mix(in srgb, ${c} 60%, #000))`; }
  tint(color?: string): string { return color ? `color-mix(in srgb, ${color} 16%, transparent)` : 'var(--surface-2)'; }
}
