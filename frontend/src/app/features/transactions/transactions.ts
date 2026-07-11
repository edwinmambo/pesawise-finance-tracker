import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Account, Category, Channel, Transaction, TransactionType } from '../../core/models';
import { MoneyComponent } from '../../shared/money';
import { fmtDate, todayIso } from '../../core/format';

const CHANNELS: Channel[] = ['MPESA', 'BANK', 'CASH', 'SACCO'];

interface TxForm {
  type: TransactionType;
  amount: number | null;
  date: string;
  channel: Channel;
  accountId: string;
  categoryId: string;
  note: string;
  reference: string;
}

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [FormsModule, MoneyComponent],
  template: `
    <div class="page-actions">
      <div>
        <h2 class="section-title">Transactions</h2>
        <div class="muted">{{ filtered().length }} of {{ all().length }} shown</div>
      </div>
      <button class="btn btn-primary" (click)="openNew()"><i class="bi bi-plus-lg"></i> Add transaction</button>
    </div>

    <!-- Filters -->
    <div class="card card-pad filters" style="margin-bottom:18px">
      <div class="row wrap gap-8">
        <input class="input f-search" style="max-width:240px;min-width:0" placeholder="🔍 Search note or ref…" [(ngModel)]="search" (ngModelChange)="applyFilters()" />
        <div class="row wrap gap-8 f-chips">
          <button class="chip" [class.active]="typeFilter() === null" (click)="setType(null)">All</button>
          <button class="chip" [class.active]="typeFilter() === 'INCOME'" (click)="setType('INCOME')">Income</button>
          <button class="chip" [class.active]="typeFilter() === 'EXPENSE'" (click)="setType('EXPENSE')">Expenses</button>
        </div>
        <select class="input f-select" style="max-width:180px;min-width:0" [(ngModel)]="channelFilter" (ngModelChange)="applyFilters()">
          <option value="">All channels</option>
          @for (c of channels; track c) { <option [value]="c">{{ channelLabel(c) }}</option> }
        </select>
        <select class="input f-select" style="max-width:190px;min-width:0" [(ngModel)]="categoryFilter" (ngModelChange)="applyFilters()">
          <option value="">All categories</option>
          @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.icon }} {{ c.name }}</option> }
        </select>
      </div>
    </div>

    <!-- List -->
    <div class="card">
      @if (loading()) { <div class="spinner"></div> }
      @else if (filtered().length) {
        <!-- Desktop table -->
        <div class="table-wrap d-none d-md-block">
          <table class="table" style="min-width:600px">
            <thead><tr><th></th><th>Description</th><th>Category</th><th>Channel</th><th>Date</th><th class="num">Amount</th><th></th></tr></thead>
            <tbody>
              @for (t of filtered(); track t.id) {
                <tr>
                  <td style="width:44px"><div class="txicon" [style.background]="tint(t.category?.color)">{{ t.category?.icon || (t.type === 'INCOME' ? '💰' : '🧾') }}</div></td>
                  <td>
                    <div style="font-weight:600">{{ t.note || t.category?.name || 'Transaction' }}</div>
                    @if (t.reference) { <div class="muted" style="font-size:11.5px">Ref: {{ t.reference }}</div> }
                  </td>
                  <td class="muted">{{ t.category?.name || '—' }}</td>
                  <td><span class="badge">{{ channelLabel(t.channel) }}</span></td>
                  <td class="muted" style="font-size:12.5px">{{ date(t.date) }}</td>
                  <td class="num" style="font-weight:650">
                    <app-money [value]="t.amount" signed />
                  </td>
                  <td style="width:80px" class="num">
                    <button class="btn btn-ghost btn-sm btn-icon" (click)="openEdit(t)" title="Edit"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-ghost btn-sm btn-icon" (click)="remove(t)" title="Delete"><i class="bi bi-trash"></i></button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div class="tx-list d-md-none">
          @for (t of filtered(); track t.id) {
            <button type="button" class="tx-card" (click)="openEdit(t)">
              <span class="txicon" [style.background]="tint(t.category?.color)">{{ t.category?.icon || (t.type === 'INCOME' ? '💰' : '🧾') }}</span>
              <span class="tx-main">
                <span class="tx-title">{{ t.note || t.category?.name || 'Transaction' }}</span>
                <span class="tx-sub">{{ t.category?.name || channelLabel(t.channel) }} · {{ date(t.date) }}</span>
              </span>
              <app-money class="tx-amt" [value]="t.amount" signed />
            </button>
          }
        </div>
      } @else {
        <div class="empty"><div class="big">🧾</div>No transactions match. Add your first one!</div>
      }
    </div>

    <!-- Modal -->
    @if (showModal()) {
      <div class="overlay" (click)="close($event)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head"><h3>{{ editingId() ? 'Edit' : 'Add' }} transaction</h3><button class="btn btn-icon btn-ghost" (click)="showModal.set(false)"><i class="bi bi-x-lg"></i></button></div>
          <div class="modal-body">
            <div class="row gap-8" style="margin-bottom:16px">
              <button class="chip" [class.active]="form.type === 'EXPENSE'" (click)="setFormType('EXPENSE')" style="flex:1;justify-content:center">Expense</button>
              <button class="chip" [class.active]="form.type === 'INCOME'" (click)="setFormType('INCOME')" style="flex:1;justify-content:center">Income</button>
            </div>
            <div class="form-row">
              <div class="field"><label>Amount (Ksh)</label><input class="input" type="number" min="0" [(ngModel)]="form.amount" placeholder="0" /></div>
              <div class="field"><label>Date</label><input class="input" type="date" [(ngModel)]="form.date" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Channel</label>
                <select class="input" [(ngModel)]="form.channel">
                  @for (c of channels; track c) { <option [value]="c">{{ channelLabel(c) }}</option> }
                </select>
              </div>
              <div class="field"><label>Account</label>
                <select class="input" [(ngModel)]="form.accountId">
                  <option value="">— None —</option>
                  @for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.name }}</option> }
                </select>
              </div>
            </div>
            <div class="field"><label>Category</label>
              <select class="input" [(ngModel)]="form.categoryId">
                <option value="">— Uncategorized —</option>
                @for (c of formCategories(); track c.id) { <option [value]="c.id">{{ c.icon }} {{ c.name }}</option> }
              </select>
            </div>
            <div class="field"><label>Note</label><input class="input" [(ngModel)]="form.note" placeholder="e.g. Naivas groceries" /></div>
            @if (form.channel === 'MPESA') {
              <div class="field"><label>M-Pesa reference (optional)</label><input class="input" [(ngModel)]="form.reference" placeholder="e.g. SLK4TX9QAZ" /></div>
            }
          </div>
          <div class="modal-foot">
            @if (editingId()) { <button class="btn btn-danger" (click)="removeCurrent()"><i class="bi bi-trash"></i></button> }
            <div style="flex:1"></div>
            <button class="btn btn-ghost" (click)="showModal.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="!form.amount || saving()">{{ saving() ? 'Saving…' : 'Save' }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @media (max-width: 560px) {
      .filters .f-search, .filters .f-select, .filters .f-chips { flex: 1 1 100%; max-width: 100% !important; }
      .filters .f-chips .chip { flex: 1 1 auto; justify-content: center; }
    }
    .tx-list { display: flex; flex-direction: column; }
    .tx-card {
      display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;
      padding: 12px 16px; border: none; background: transparent; cursor: pointer;
      border-bottom: 1px solid var(--border); color: var(--ink);
      animation: txIn .32s ease both;
    }
    .tx-card:last-child { border-bottom: none; }
    .tx-card:active { background: var(--surface-2); }
    .tx-card .txicon { flex-shrink: 0; }
    .tx-main { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .tx-title { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tx-sub { color: var(--muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tx-amt { font-weight: 700; font-size: 14px; flex-shrink: 0; }
    @keyframes txIn { from { opacity: 0; transform: translateY(4px); } }
  `],
})
export class TransactionsComponent implements OnInit {
  private api = inject(ApiService);

  all = signal<Transaction[]>([]);
  filtered = signal<Transaction[]>([]);
  categories = signal<Category[]>([]);
  accounts = signal<Account[]>([]);
  loading = signal(true);

  channels = CHANNELS;
  search = '';
  channelFilter = '';
  categoryFilter = '';
  typeFilter = signal<TransactionType | null>(null);

  showModal = signal(false);
  saving = signal(false);
  editingId = signal<string | null>(null);
  form: TxForm = this.blank();

  formCategories = computed(() => this.categories().filter((c) => c.kind === this.form.type));

  ngOnInit(): void {
    this.api.categories().subscribe((c) => this.categories.set(c));
    this.api.accounts().subscribe((a) => this.accounts.set(a));
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.api.transactions().subscribe((t) => {
      this.all.set(t);
      this.applyFilters();
      this.loading.set(false);
    });
  }

  applyFilters(): void {
    const q = this.search.trim().toLowerCase();
    const type = this.typeFilter();
    this.filtered.set(
      this.all().filter((t) => {
        if (type && t.type !== type) return false;
        if (this.channelFilter && t.channel !== this.channelFilter) return false;
        if (this.categoryFilter && t.categoryId !== this.categoryFilter) return false;
        if (q && !(`${t.note ?? ''} ${t.reference ?? ''}`.toLowerCase().includes(q))) return false;
        return true;
      }),
    );
  }

  setType(t: TransactionType | null): void { this.typeFilter.set(t); this.applyFilters(); }

  // ---- modal ----
  blank(): TxForm {
    return { type: 'EXPENSE', amount: null, date: todayIso(), channel: 'MPESA', accountId: '', categoryId: '', note: '', reference: '' };
  }
  setFormType(t: TransactionType): void { this.form.type = t; this.form.categoryId = ''; }
  openNew(): void { this.editingId.set(null); this.form = this.blank(); this.showModal.set(true); }
  openEdit(t: Transaction): void {
    this.editingId.set(t.id);
    this.form = {
      type: t.type, amount: t.amount, date: t.date.split('T')[0], channel: t.channel,
      accountId: t.accountId ?? '', categoryId: t.categoryId ?? '', note: t.note ?? '', reference: t.reference ?? '',
    };
    this.showModal.set(true);
  }
  close(e: Event): void { this.showModal.set(false); }

  save(): void {
    if (!this.form.amount) return;
    this.saving.set(true);
    const body: Partial<Transaction> = {
      type: this.form.type,
      amount: Number(this.form.amount),
      date: this.form.date,
      channel: this.form.channel,
      accountId: this.form.accountId || undefined,
      categoryId: this.form.categoryId || undefined,
      note: this.form.note || undefined,
      reference: this.form.reference || undefined,
    };
    const id = this.editingId();
    const req = id ? this.api.updateTransaction(id, body) : this.api.createTransaction(body);
    req.subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.reload(); },
      error: () => this.saving.set(false),
    });
  }

  remove(t: Transaction): void {
    if (!confirm('Delete this transaction?')) return;
    this.api.deleteTransaction(t.id).subscribe(() => this.reload());
  }
  removeCurrent(): void {
    const id = this.editingId();
    if (!id || !confirm('Delete this transaction?')) return;
    this.api.deleteTransaction(id).subscribe(() => { this.showModal.set(false); this.reload(); });
  }

  channelLabel(ch: string): string { return ch === 'MPESA' ? 'M-Pesa' : ch.charAt(0) + ch.slice(1).toLowerCase(); }
  date(iso: string): string { return fmtDate(iso); }
  tint(color?: string): string { return color ? `color-mix(in srgb, ${color} 16%, transparent)` : 'var(--surface-2)'; }
}
