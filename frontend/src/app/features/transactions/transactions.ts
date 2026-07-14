import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Account, Category, Channel, Transaction, TransactionType } from '../../core/models';
import { MoneyComponent } from '../../shared/money';
import { DatePickerComponent } from '../../shared/date-picker';
import { FocusTrapDirective } from '../../shared/focus-trap.directive';
import { fmtDate, todayIso } from '../../core/format';
import { ToastService } from '../../core/toast.service';

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
  imports: [FormsModule, MoneyComponent, DatePickerComponent, FocusTrapDirective],
  template: `
    <div class="page-actions">
      <div>
        <h2 class="section-title">Transactions</h2>
        <div class="muted">{{ filtered().length }} of {{ all().length }} shown</div>
      </div>
      <div class="row gap-8">
        <button class="btn btn-ghost" (click)="openTransfer()"><i class="bi bi-arrow-left-right"></i> Transfer</button>
        <button class="btn btn-primary" (click)="openNew()"><i class="bi bi-plus-lg"></i> Add transaction</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card card-pad filters" style="margin-bottom:18px">
      <div class="row wrap gap-8">
        <input class="input f-search" style="max-width:240px;min-width:0" placeholder="🔍 Search note or ref…" [(ngModel)]="search" (ngModelChange)="applyFilters()" />
        <div class="row wrap gap-8 f-chips">
          <button class="chip" [class.active]="typeFilter() === null" (click)="setType(null)">All</button>
          <button class="chip" [class.active]="typeFilter() === 'INCOME'" (click)="setType('INCOME')">Income</button>
          <button class="chip" [class.active]="typeFilter() === 'EXPENSE'" (click)="setType('EXPENSE')">Expenses</button>
          <button class="chip" [class.active]="typeFilter() === 'TRANSFER'" (click)="setType('TRANSFER')">Transfers</button>
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
                  <td style="width:48px;padding-left:0"><div class="tx-row-accent"><div class="tx-accent" [style.background]="typeColor(t)"></div><div class="txicon" [style.background]="tint(t.category?.color)">{{ t.category?.icon || typeIcon(t) }}</div></div></td>
                  <td>
                    <div class="row gap-6" style="font-weight:600"><span>{{ t.note || t.category?.name || 'Transaction' }}</span><span class="badge sm" [class]="typeBadge(t)">{{ typeLabel(t) }}</span></div>
                    @if (t.reference) { <div class="muted" style="font-size:11.5px">Ref: {{ t.reference }}</div> }
                  </td>
                  <td class="muted">{{ t.category?.name || '—' }}</td>
                  <td><span class="badge">{{ channelLabel(t.channel) }}</span></td>
                  <td class="muted" style="font-size:12.5px">{{ date(t.date) }}</td>
                  <td class="num" style="font-weight:700">
                    <app-money [value]="t.amount" [direction]="dir(t)" column />
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
            <button type="button" class="tx-card" (click)="openEdit(t)" [style.--tx-accent]="typeColor(t)">
              <span class="txicon" [style.background]="tint(t.category?.color)">{{ t.category?.icon || typeIcon(t) }}</span>
              <span class="tx-main">
                <span class="tx-title">{{ t.note || t.category?.name || 'Transaction' }}</span>
                <span class="tx-sub">{{ t.category?.name || channelLabel(t.channel) }} · {{ date(t.date) }}</span>
              </span>
              <app-money class="tx-amt" [value]="t.amount" [direction]="dir(t)" column />
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
        <div class="modal" role="dialog" aria-modal="true" aria-label="Add or edit transaction" appFocusTrap (click)="$event.stopPropagation()">
          <div class="modal-head"><h3>{{ editingId() ? 'Edit' : 'Add' }} transaction</h3><button class="btn btn-icon btn-ghost" (click)="showModal.set(false)"><i class="bi bi-x-lg"></i></button></div>
          <div class="modal-body">
            <div class="row gap-8" style="margin-bottom:16px">
              <button class="chip" [class.active]="form.type === 'EXPENSE'" (click)="setFormType('EXPENSE')" style="flex:1;justify-content:center">Expense</button>
              <button class="chip" [class.active]="form.type === 'INCOME'" (click)="setFormType('INCOME')" style="flex:1;justify-content:center">Income</button>
            </div>
            <div class="form-row">
              <div class="field"><label>Amount (KES)</label><input class="input" type="number" min="0" [(ngModel)]="form.amount" placeholder="0" /></div>
              <div class="field"><label>Date</label><app-date-picker [(value)]="form.date" /></div>
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

    <!-- Transfer modal -->
    @if (showTransfer()) {
      <div class="overlay" (click)="showTransfer.set(false)">
        <div class="modal" role="dialog" aria-modal="true" aria-label="Transfer between accounts" appFocusTrap (click)="$event.stopPropagation()">
          <div class="modal-head"><h3>Transfer between accounts</h3><button class="btn btn-icon btn-ghost" (click)="showTransfer.set(false)"><i class="bi bi-x-lg"></i></button></div>
          <div class="modal-body">
            <div class="form-row">
              <div class="field"><label>From</label>
                <select class="input" [(ngModel)]="xfer.fromAccountId">
                  <option value="">— Select —</option>
                  @for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.name }} ({{ a.currency }})</option> }
                </select>
              </div>
              <div class="field"><label>To</label>
                <select class="input" [(ngModel)]="xfer.toAccountId">
                  <option value="">— Select —</option>
                  @for (a of accounts(); track a.id) { <option [value]="a.id">{{ a.name }} ({{ a.currency }})</option> }
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="field"><label>Amount (from account's currency)</label><input class="input" type="number" min="0" [(ngModel)]="xfer.amount" placeholder="0" /></div>
              <div class="field"><label>Date</label><app-date-picker [(value)]="xfer.date" /></div>
            </div>
            <div class="field"><label>Note (optional)</label><input class="input" [(ngModel)]="xfer.note" placeholder="e.g. Move to savings" /></div>
            @if (xferCrossCurrency()) { <div class="muted" style="font-size:12px">Cross-currency transfer — the destination amount is converted at the current rate.</div> }
          </div>
          <div class="modal-foot">
            <div style="flex:1"></div>
            <button class="btn btn-ghost" (click)="showTransfer.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="doTransfer()" [disabled]="!xferValid() || transferring()">{{ transferring() ? 'Transferring…' : 'Transfer' }}</button>
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
    .tx-row-accent { display: flex; align-items: center; gap: 8px; }
    .tx-accent { width: 3px; height: 30px; border-radius: 3px; flex-shrink: 0; }
    .badge.sm { padding: 1px 7px; font-size: 10.5px; }
    .badge.tf { color: var(--transfer); background: color-mix(in srgb, var(--transfer) 16%, transparent); border-color: transparent; }
    .tx-list { display: flex; flex-direction: column; }
    .tx-card {
      display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;
      padding: 12px 16px; border: none; background: transparent; cursor: pointer;
      border-bottom: 1px solid var(--border); color: var(--ink);
      box-shadow: inset 3px 0 0 var(--tx-accent, transparent);
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
  private toast = inject(ToastService);

  all = signal<Transaction[]>([]);
  filtered = signal<Transaction[]>([]);
  categories = signal<Category[]>([]);
  accounts = signal<Account[]>([]);
  loading = signal(true);

  channels = CHANNELS;
  search = '';
  channelFilter = '';
  categoryFilter = '';
  typeFilter = signal<TransactionType | 'TRANSFER' | null>(null);

  showModal = signal(false);
  saving = signal(false);
  editingId = signal<string | null>(null);
  form: TxForm = this.blank();

  showTransfer = signal(false);
  transferring = signal(false);
  xfer = { fromAccountId: '', toAccountId: '', amount: null as number | null, date: todayIso(), note: '' };

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
        if (type === 'TRANSFER') { if (!t.type.startsWith('TRANSFER')) return false; }
        else if (type && t.type !== type) return false;
        if (this.channelFilter && t.channel !== this.channelFilter) return false;
        if (this.categoryFilter && t.categoryId !== this.categoryFilter) return false;
        if (q && !(`${t.note ?? ''} ${t.reference ?? ''}`.toLowerCase().includes(q))) return false;
        return true;
      }),
    );
  }

  setType(t: TransactionType | 'TRANSFER' | null): void { this.typeFilter.set(t); this.applyFilters(); }

  // ---- type presentation (income vs expense vs transfer) ----
  private isTransfer(t: Transaction): boolean { return t.type.startsWith('TRANSFER'); }
  private isIncome(t: Transaction): boolean { return t.type === 'INCOME' || t.type === 'TRANSFER_IN'; }
  dir(t: Transaction): 'in' | 'out' { return this.isIncome(t) ? 'in' : 'out'; }
  typeColor(t: Transaction): string {
    if (this.isTransfer(t)) return 'var(--transfer)';
    return t.type === 'INCOME' ? 'var(--income)' : 'var(--expense)';
  }
  typeIcon(t: Transaction): string { return this.isTransfer(t) ? '🔁' : t.type === 'INCOME' ? '💰' : '🧾'; }
  typeLabel(t: Transaction): string {
    return t.type === 'INCOME' ? 'Income' : t.type === 'EXPENSE' ? 'Expense'
      : t.type === 'TRANSFER_IN' ? 'Transfer in' : 'Transfer out';
  }
  typeBadge(t: Transaction): string { return this.isTransfer(t) ? 'tf' : t.type === 'INCOME' ? 'income' : 'expense'; }

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

  async remove(t: Transaction): Promise<void> {
    const ok = await this.toast.confirm({ title: 'Delete this transaction?', confirmText: 'Delete', danger: true });
    if (!ok) return;
    this.api.deleteTransaction(t.id).subscribe(() => { this.toast.success('Transaction deleted'); this.reload(); });
  }
  async removeCurrent(): Promise<void> {
    const id = this.editingId();
    if (!id) return;
    const ok = await this.toast.confirm({ title: 'Delete this transaction?', confirmText: 'Delete', danger: true });
    if (!ok) return;
    this.api.deleteTransaction(id).subscribe(() => { this.toast.success('Transaction deleted'); this.showModal.set(false); this.reload(); });
  }

  // ---- transfer ----
  openTransfer(): void {
    this.xfer = { fromAccountId: '', toAccountId: '', amount: null, date: todayIso(), note: '' };
    this.showTransfer.set(true);
  }
  xferValid(): boolean {
    const x = this.xfer;
    return !!x.fromAccountId && !!x.toAccountId && x.fromAccountId !== x.toAccountId && !!x.amount && x.amount > 0;
  }
  xferCrossCurrency(): boolean {
    const from = this.accounts().find((a) => a.id === this.xfer.fromAccountId);
    const to = this.accounts().find((a) => a.id === this.xfer.toAccountId);
    return !!from && !!to && from.currency !== to.currency;
  }
  doTransfer(): void {
    if (!this.xferValid()) return;
    this.transferring.set(true);
    this.api
      .transfer({
        fromAccountId: this.xfer.fromAccountId,
        toAccountId: this.xfer.toAccountId,
        amount: Number(this.xfer.amount),
        date: this.xfer.date,
        note: this.xfer.note || undefined,
      })
      .subscribe({
        next: () => {
          this.transferring.set(false);
          this.showTransfer.set(false);
          this.api.accounts().subscribe((a) => this.accounts.set(a));
          this.reload();
        },
        error: () => this.transferring.set(false),
      });
  }

  channelLabel(ch: string): string { return ch === 'MPESA' ? 'M-Pesa' : ch.charAt(0) + ch.slice(1).toLowerCase(); }
  date(iso: string): string { return fmtDate(iso); }
  tint(color?: string): string { return color ? `color-mix(in srgb, ${color} 16%, transparent)` : 'var(--surface-2)'; }
}
