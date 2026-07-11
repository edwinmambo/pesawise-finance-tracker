import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { Account, AccountType, Category, CategoryKind } from '../../core/models';
import { KesPipe } from '../../core/kes.pipe';

const ACCOUNT_TYPES: AccountType[] = ['MPESA', 'BANK', 'CASH', 'SACCO'];
const ACCOUNT_ICON: Record<AccountType, string> = { MPESA: '📱', BANK: '🏦', CASH: '💵', SACCO: '🤝' };

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, KesPipe],
  template: `
    <div class="page-actions"><div><h2 class="section-title">Settings</h2><div class="muted">Accounts, categories &amp; profile</div></div></div>

    <div class="row gap-8" style="margin-bottom:18px">
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
                <td class="num" style="font-weight:650" [class.neg]="a.currentBalance < 0">{{ a.currentBalance | kes }}</td>
                <td style="width:60px" class="num"><button class="btn btn-ghost btn-sm btn-icon" (click)="remove(a)"><i class="bi bi-trash"></i></button></td>
              </tr>
            }
          </tbody></table></div>
        </div>
      }
      @case ('categories') {
        <div class="grid cols-2">
          <div class="card">
            <div class="card-head"><div><h3>Expense categories</h3></div></div>
            <div class="card-pad" style="display:flex;flex-direction:column;gap:8px">
              @for (c of expenseCats(); track c.id) {
                <div class="between cat-item"><span>{{ c.icon }} {{ c.name }}</span><button class="btn btn-ghost btn-sm btn-icon" (click)="removeCat(c)"><i class="bi bi-x-lg"></i></button></div>
              } @empty { <div class="muted">No expense categories.</div> }
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div><h3>Income categories</h3></div></div>
            <div class="card-pad" style="display:flex;flex-direction:column;gap:8px">
              @for (c of incomeCats(); track c.id) {
                <div class="between cat-item"><span>{{ c.icon }} {{ c.name }}</span><button class="btn btn-ghost btn-sm btn-icon" (click)="removeCat(c)"><i class="bi bi-x-lg"></i></button></div>
              } @empty { <div class="muted">No income categories.</div> }
            </div>
          </div>
        </div>
        <div class="card card-pad mt-16">
          <h3 style="font-size:14px;margin-bottom:12px">Add category</h3>
          <div class="row wrap gap-8 addcat">
            <input class="input" style="max-width:160px;min-width:0" [(ngModel)]="newCat.icon" placeholder="Icon 🍔" />
            <input class="input" style="max-width:220px;min-width:0" [(ngModel)]="newCat.name" placeholder="Name" />
            <select class="input" style="max-width:160px;min-width:0" [(ngModel)]="newCat.kind"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select>
            <button class="btn btn-primary" (click)="addCat()" [disabled]="!newCat.name">Add</button>
          </div>
        </div>
      }
      @case ('profile') {
        <div class="card card-pad" style="max-width:520px">
          <div class="row" style="gap:16px;margin-bottom:20px">
            <div class="avatar-lg">{{ initials() }}</div>
            <div><div style="font-weight:700;font-size:16px">{{ auth.user()?.name }}</div><div class="muted">{{ auth.user()?.email }}</div></div>
          </div>
          <div class="between prof-row"><span>Currency</span><b>Kenyan Shilling (KES)</b></div>
          <div class="between prof-row"><span>Appearance</span><button class="btn btn-sm" (click)="theme.toggle()">{{ theme.theme() === 'dark' ? '☀️ Switch to light' : '🌙 Switch to dark' }}</button></div>
          <div class="mt-24"><button class="btn btn-danger" (click)="auth.logout()">Log out</button></div>
        </div>
      }
    }

    <!-- Account modal -->
    @if (showAccount()) {
      <div class="overlay" (click)="showAccount.set(false)">
        <div class="modal" style="max-width:440px;width:100%" (click)="$event.stopPropagation()">
          <div class="modal-head"><h3>Add account</h3><button class="btn btn-icon btn-ghost" (click)="showAccount.set(false)"><i class="bi bi-x-lg"></i></button></div>
          <div class="modal-body">
            <div class="field"><label>Account name</label><input class="input" [(ngModel)]="af.name" placeholder="e.g. Equity Bank" /></div>
            <div class="form-row">
              <div class="field"><label>Type</label><select class="input" [(ngModel)]="af.type">@for (t of accountTypes; track t){<option [value]="t">{{ typeLabel(t) }}</option>}</select></div>
              <div class="field"><label>Opening balance</label><input class="input" type="number" [(ngModel)]="af.openingBalance" placeholder="0" /></div>
            </div>
            <div class="field"><label>Institution (optional)</label><input class="input" [(ngModel)]="af.institution" placeholder="e.g. Safaricom" /></div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="showAccount.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="saveAccount()" [disabled]="!af.name || saving()">Add account</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cat-item { padding: 8px 12px; border-radius: 10px; background: var(--surface-2); font-size: 13.5px; }
    .prof-row { padding: 14px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
    .avatar-lg { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, var(--brand), var(--brand-strong)); color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 18px; }
    @media (max-width: 560px) { .addcat .input { flex: 1 1 100%; max-width: 100% !important; } }
  `],
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  theme = inject(ThemeService);

  tab = signal<'accounts' | 'categories' | 'profile'>('accounts');
  accounts = signal<Account[]>([]);
  categories = signal<Category[]>([]);
  saving = signal(false);

  accountTypes = ACCOUNT_TYPES;
  showAccount = signal(false);
  af = this.blankAccount();

  newCat: { name: string; icon: string; kind: CategoryKind } = { name: '', icon: '🏷️', kind: 'EXPENSE' };

  expenseCats = computed(() => this.categories().filter((c) => c.kind === 'EXPENSE'));
  incomeCats = computed(() => this.categories().filter((c) => c.kind === 'INCOME'));

  ngOnInit(): void { this.reload(); }
  reload(): void {
    this.api.accounts().subscribe((a) => this.accounts.set(a));
    this.api.categories().subscribe((c) => this.categories.set(c));
  }

  blankAccount() { return { name: '', type: 'MPESA' as AccountType, openingBalance: 0 as number, institution: '' }; }
  openAccount(): void { this.af = this.blankAccount(); this.showAccount.set(true); }
  saveAccount(): void {
    if (!this.af.name) return;
    this.saving.set(true);
    this.api.createAccount({ name: this.af.name, type: this.af.type, openingBalance: Number(this.af.openingBalance) || 0, institution: this.af.institution || undefined }).subscribe({
      next: () => { this.saving.set(false); this.showAccount.set(false); this.reload(); },
      error: () => this.saving.set(false),
    });
  }
  remove(a: Account): void {
    if (!confirm(`Delete account "${a.name}"? Its transactions will be kept but unlinked.`)) return;
    this.api.deleteAccount(a.id).subscribe(() => this.reload());
  }

  addCat(): void {
    if (!this.newCat.name) return;
    this.api.createCategory({ name: this.newCat.name, icon: this.newCat.icon || '🏷️', kind: this.newCat.kind }).subscribe(() => {
      this.newCat = { name: '', icon: '🏷️', kind: this.newCat.kind };
      this.reload();
    });
  }
  removeCat(c: Category): void {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    this.api.deleteCategory(c.id).subscribe(() => this.reload());
  }

  icon(t: AccountType): string { return ACCOUNT_ICON[t]; }
  typeLabel(t: AccountType): string { return t === 'MPESA' ? 'M-Pesa' : t.charAt(0) + t.slice(1).toLowerCase(); }
  initials(): string { const n = this.auth.user()?.name ?? ''; return n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'U'; }
  tint(color?: string): string { return color ? `color-mix(in srgb, ${color} 16%, transparent)` : 'var(--surface-2)'; }
}
