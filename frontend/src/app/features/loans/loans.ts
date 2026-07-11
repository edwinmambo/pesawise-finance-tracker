import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LowerCasePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { InterestType, LenderType, Loan } from '../../core/models';
import { KesPipe } from '../../core/kes.pipe';
import { MoneyComponent } from '../../shared/money';
import { fmtDate, todayIso } from '../../core/format';
import { bankColor as bankColorFor, lenderIcon as lenderIconFor } from '../../core/bank-colors';

const LENDER_TYPES: { v: LenderType; l: string }[] = [
  { v: 'BANK', l: 'Bank' }, { v: 'MOBILE_APP', l: 'Mobile app' }, { v: 'SACCO', l: 'SACCO' }, { v: 'INDIVIDUAL', l: 'Individual' },
];

interface LoanForm {
  lender: string; lenderType: LenderType; principal: number | null;
  interestRate: number | null; interestType: InterestType; termMonths: number | null;
  startDate: string; dueDate: string;
}

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [FormsModule, LowerCasePipe, KesPipe, MoneyComponent],
  template: `
    <div class="page-actions">
      <div><h2 class="section-title">Loans</h2><div class="muted">Outstanding <app-money [value]="totalOutstanding()" /> across {{ activeCount() }} active loans</div></div>
      <button class="btn btn-primary" (click)="openNew()"><i class="bi bi-plus-lg"></i> Add loan</button>
    </div>

    @if (loading()) { <div class="spinner"></div> }
    @else if (loans().length) {
      <div class="grid cols-2">
        @for (l of loans(); track l.id) {
          <div class="card card-pad">
            <div class="between">
              <div class="row" style="gap:12px">
                <div class="txicon" [style.background]="tint(bankColor(l))" [style.color]="bankColor(l)" style="font-size:18px"><i class="bi" [class]="lenderIcon(l.lenderType)"></i></div>
                <div>
                  <div style="font-weight:700;font-size:15px">{{ l.lender }}</div>
                  <div class="muted" style="font-size:12px">{{ lenderLabel(l.lenderType) }} · {{ l.interestRate }}% {{ l.interestType | lowercase }}</div>
                </div>
              </div>
              <span class="badge" [style.color]="statusColor(l.status)" [style.background]="tint(statusColor(l.status))">{{ l.status | lowercase }}</span>
            </div>

            <div class="mt-16">
              <div class="muted" style="font-size:12px">Outstanding balance</div>
              <div style="font-size:24px;font-weight:720;letter-spacing:-.02em" class="neg"><app-money [value]="l.outstanding" /></div>
            </div>

            <div class="progress mt-8"><span [style.width.%]="l.progress * 100" [style.background]="bankColor(l)"></span></div>
            <div class="between muted" style="font-size:12px;margin-top:6px">
              <span>{{ (l.progress * 100).toFixed(0) }}% repaid ({{ l.totalPaid | kes }})</span>
              <span>of {{ l.totalRepayable | kes }}</span>
            </div>

            <div class="loan-facts mt-16">
              <div><span class="muted">Principal</span><b>{{ l.principal | kes }}</b></div>
              <div><span class="muted">Interest</span><b>{{ l.totalInterest | kes }}</b></div>
              <div><span class="muted">Monthly</span><b>{{ l.monthlyPayment | kes }}</b></div>
              <div><span class="muted">Due</span><b>{{ l.dueDate ? date(l.dueDate) : '—' }}</b></div>
            </div>

            <div class="row wrap gap-8 mt-16">
              <button class="btn btn-primary btn-sm" (click)="openPayment(l)"><i class="bi bi-plus-lg"></i> Record payment</button>
              <button class="btn btn-ghost btn-sm" (click)="toggleHistory(l.id)">{{ expanded() === l.id ? 'Hide' : 'History' }} ({{ l.payments?.length || 0 }})</button>
              <div style="flex:1;min-width:0"></div>
              <button class="btn btn-danger btn-sm" (click)="remove(l)">Delete</button>
            </div>

            @if (expanded() === l.id) {
              <div class="history mt-16">
                @for (p of l.payments || []; track p.id) {
                  <div class="between hist-row">
                    <span class="muted">{{ date(p.date) }} @if (p.note) { · {{ p.note }} }</span>
                    <span class="row gap-8"><b class="tabnum">{{ p.amount | kes }}</b>
                    <button class="btn btn-ghost btn-sm" style="padding:2px 6px" (click)="removePayment(l, p.id)"><i class="bi bi-x-lg"></i></button></span>
                  </div>
                } @empty { <div class="muted" style="font-size:12.5px">No payments recorded yet.</div> }
              </div>
            }
          </div>
        }
      </div>
    } @else {
      <div class="card"><div class="empty"><div class="big">🏦</div>No loans tracked. Add one to see repayment progress and interest.</div></div>
    }

    <!-- Add loan modal -->
    @if (showLoan()) {
      <div class="overlay" (click)="showLoan.set(false)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head"><h3>Add loan</h3><button class="btn btn-icon btn-ghost" (click)="showLoan.set(false)"><i class="bi bi-x-lg"></i></button></div>
          <div class="modal-body">
            <div class="form-row">
              <div class="field"><label>Lender</label><input class="input" [(ngModel)]="lf.lender" placeholder="e.g. Equity Bank" /></div>
              <div class="field"><label>Lender type</label><select class="input" [(ngModel)]="lf.lenderType">@for (t of lenderTypes; track t.v){<option [value]="t.v">{{ t.l }}</option>}</select></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Principal (Ksh)</label><input class="input" type="number" [(ngModel)]="lf.principal" placeholder="0" /></div>
              <div class="field"><label>Term (months)</label><input class="input" type="number" [(ngModel)]="lf.termMonths" placeholder="12" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Interest rate (% p.a.)</label><input class="input" type="number" [(ngModel)]="lf.interestRate" placeholder="13" /></div>
              <div class="field"><label>Interest type</label><select class="input" [(ngModel)]="lf.interestType"><option value="REDUCING">Reducing balance</option><option value="FLAT">Flat rate</option></select></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Start date</label><input class="input" type="date" [(ngModel)]="lf.startDate" /></div>
              <div class="field"><label>Due date (optional)</label><input class="input" type="date" [(ngModel)]="lf.dueDate" /></div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="showLoan.set(false)">Cancel</button>
            <button class="btn btn-primary" (click)="saveLoan()" [disabled]="!lf.lender || !lf.principal || saving()">{{ saving() ? 'Saving…' : 'Add loan' }}</button>
          </div>
        </div>
      </div>
    }

    <!-- Payment modal -->
    @if (payLoan(); as pl) {
      <div class="overlay" (click)="payLoan.set(null)">
        <div class="modal" style="max-width:420px;width:100%" (click)="$event.stopPropagation()">
          <div class="modal-head"><h3>Payment · {{ pl.lender }}</h3><button class="btn btn-icon btn-ghost" (click)="payLoan.set(null)"><i class="bi bi-x-lg"></i></button></div>
          <div class="modal-body">
            <div class="muted" style="font-size:12.5px;margin-bottom:14px">Outstanding {{ pl.outstanding | kes }} · suggested {{ pl.monthlyPayment | kes }}/mo</div>
            <div class="form-row">
              <div class="field"><label>Amount (Ksh)</label><input class="input" type="number" [(ngModel)]="pay.amount" [placeholder]="pl.monthlyPayment" /></div>
              <div class="field"><label>Date</label><input class="input" type="date" [(ngModel)]="pay.date" /></div>
            </div>
            <div class="field"><label>Note (optional)</label><input class="input" [(ngModel)]="pay.note" placeholder="e.g. Monthly installment" /></div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" (click)="payLoan.set(null)">Cancel</button>
            <button class="btn btn-primary" (click)="savePayment()" [disabled]="!pay.amount || saving()">Record payment</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .loan-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
    .loan-facts > div { display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
    .history { border-top: 1px solid var(--border); padding-top: 12px; display: flex; flex-direction: column; gap: 8px; }
    .hist-row { font-size: 13px; }
  `],
})
export class LoansComponent implements OnInit {
  private api = inject(ApiService);
  loans = signal<Loan[]>([]);
  loading = signal(true);
  expanded = signal<string | null>(null);
  saving = signal(false);

  lenderTypes = LENDER_TYPES;

  showLoan = signal(false);
  lf: LoanForm = this.blankLoan();

  payLoan = signal<Loan | null>(null);
  pay = { amount: null as number | null, date: todayIso(), note: '' };

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.api.loans().subscribe((l) => { this.loans.set(l); this.loading.set(false); });
  }

  activeCount(): number { return this.loans().filter((l) => l.status === 'ACTIVE').length; }
  totalOutstanding(): number { return this.loans().filter((l) => l.status === 'ACTIVE').reduce((s, l) => s + l.outstanding, 0); }
  toggleHistory(id: string): void { this.expanded.set(this.expanded() === id ? null : id); }

  blankLoan(): LoanForm {
    return { lender: '', lenderType: 'BANK', principal: null, interestRate: 13, interestType: 'REDUCING', termMonths: 12, startDate: todayIso(), dueDate: '' };
  }
  openNew(): void { this.lf = this.blankLoan(); this.showLoan.set(true); }

  saveLoan(): void {
    if (!this.lf.lender || !this.lf.principal) return;
    this.saving.set(true);
    this.api.createLoan({
      lender: this.lf.lender, lenderType: this.lf.lenderType, principal: Number(this.lf.principal),
      interestRate: Number(this.lf.interestRate ?? 0), interestType: this.lf.interestType,
      termMonths: Number(this.lf.termMonths ?? 12), startDate: this.lf.startDate,
      dueDate: this.lf.dueDate || undefined,
    }).subscribe({
      next: () => { this.saving.set(false); this.showLoan.set(false); this.reload(); },
      error: () => this.saving.set(false),
    });
  }

  remove(l: Loan): void {
    if (!confirm(`Delete loan from ${l.lender}?`)) return;
    this.api.deleteLoan(l.id).subscribe(() => this.reload());
  }

  openPayment(l: Loan): void { this.pay = { amount: null, date: todayIso(), note: '' }; this.payLoan.set(l); }
  savePayment(): void {
    const l = this.payLoan();
    if (!l || !this.pay.amount) return;
    this.saving.set(true);
    this.api.addLoanPayment(l.id, { amount: Number(this.pay.amount), date: this.pay.date, note: this.pay.note || undefined }).subscribe({
      next: () => { this.saving.set(false); this.payLoan.set(null); this.reload(); },
      error: () => this.saving.set(false),
    });
  }
  removePayment(l: Loan, paymentId: string): void {
    this.api.removeLoanPayment(l.id, paymentId).subscribe((updated) => {
      this.loans.set(this.loans().map((x) => (x.id === updated.id ? updated : x)));
    });
  }

  lenderLabel(t: LenderType): string { return LENDER_TYPES.find((x) => x.v === t)?.l ?? t; }
  bankColor(l: Loan): string { return bankColorFor(l.lender, l.lenderType); }
  lenderIcon(t: LenderType): string { return lenderIconFor(t); }
  statusColor(s: string): string { return s === 'PAID' ? 'var(--income)' : s === 'DEFAULTED' ? 'var(--expense)' : 'var(--debt)'; }
  tint(c: string): string { return `color-mix(in srgb, ${c} 16%, transparent)`; }
  date(iso: string): string { return fmtDate(iso); }
}
