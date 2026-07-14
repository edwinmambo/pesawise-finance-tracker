import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LowerCasePipe } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { InterestType, LenderType, Loan, Insight } from '../../core/models';
import { MoneyComponent } from '../../shared/money';
import { DatePickerComponent } from '../../shared/date-picker';
import { MoneyService } from '../../core/money.service';
import { ToastService } from '../../core/toast.service';
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
  imports: [FormsModule, LowerCasePipe, MoneyComponent, DatePickerComponent],
  template: `
    <div class="page-actions">
      <div><h2 class="section-title">Loans</h2><div class="muted">Outstanding <app-money [value]="totalOutstanding()" /> across {{ activeCount() }} active loans</div></div>
      <button class="btn btn-primary" (click)="openNew()"><i class="bi bi-plus-lg"></i> Add loan</button>
    </div>

    @if (loading()) { <div class="spinner"></div> }
    @else if (loans().length) {
      @if (insights().length) {
        <div class="card mb-16 insights-card">
          <div class="card-pad">
            <div class="section-title" style="margin-bottom:10px"><i class="bi bi-lightbulb"></i> Loan insights</div>
            @for (ins of insights(); track ins.text) {
              <div class="insight" [class.positive]="ins.kind === 'positive'" [class.warning]="ins.kind === 'warning'" [class.neutral]="ins.kind === 'neutral'">
                <span class="ic">{{ ins.kind === 'positive' ? '✅' : ins.kind === 'warning' ? '⚠️' : '💡' }}</span>
                <span>{{ ins.text }}</span>
              </div>
            }
          </div>
        </div>
      }
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
              <span>{{ (l.progress * 100).toFixed(0) }}% repaid (<app-money [value]="l.totalPaid" />)</span>
              <span>of <app-money [value]="l.totalRepayable" /></span>
            </div>

            <div class="loan-facts mt-16">
              <div><span class="muted">Principal</span><b><app-money [value]="l.principal" /></b></div>
              <div><span class="muted">Interest</span><b><app-money [value]="l.totalInterest" /></b></div>
              <div><span class="muted">Monthly</span><b><app-money [value]="l.monthlyPayment" /></b></div>
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
                    <span class="row gap-8"><b><app-money [value]="p.amount" /></b>
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
              <div class="field"><label>Principal (KES)</label><input class="input" type="number" [(ngModel)]="lf.principal" placeholder="0" /></div>
              <div class="field"><label>Term (months)</label><input class="input" type="number" [(ngModel)]="lf.termMonths" placeholder="12" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Interest rate (% p.a.)</label><input class="input" type="number" [(ngModel)]="lf.interestRate" placeholder="13" /></div>
              <div class="field"><label>Interest type</label><select class="input" [(ngModel)]="lf.interestType"><option value="REDUCING">Reducing balance</option><option value="FLAT">Flat rate</option></select></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Start date</label><app-date-picker [(value)]="lf.startDate" /></div>
              <div class="field"><label>Due date (optional)</label><app-date-picker [(value)]="lf.dueDate" placeholder="Pick a date" /></div>
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
            <div class="muted" style="font-size:12.5px;margin-bottom:14px">Outstanding <app-money [value]="pl.outstanding" /> · suggested <app-money [value]="pl.monthlyPayment" />/mo</div>
            <div class="form-row">
              <div class="field"><label>Amount (KES)</label><input class="input" type="number" [(ngModel)]="pay.amount" [placeholder]="pl.monthlyPayment" /></div>
              <div class="field"><label>Date</label><app-date-picker [(value)]="pay.date" /></div>
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
    .mb-16 { margin-bottom: 16px; }
    .insights-card .insight { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; padding: 7px 0; }
    .insights-card .insight + .insight { border-top: 1px solid var(--border); }
    .insights-card .insight .ic { flex: none; }
    .insights-card .insight.positive { color: var(--income); }
    .insights-card .insight.warning { color: var(--expense); }
    .insights-card .insight.neutral { color: var(--ink-2); }
  `],
})
export class LoansComponent implements OnInit {
  private api = inject(ApiService);
  private money = inject(MoneyService);
  private toast = inject(ToastService);
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

  /** Client-computed repayment coaching from the loan figures. */
  insights = computed<Insight[]>(() => {
    const active = this.loans().filter((l) => l.status === 'ACTIVE');
    if (!active.length) return [];
    const out: Insight[] = [];
    const totalOut = active.reduce((s, l) => s + l.outstanding, 0);
    const totalMonthly = active.reduce((s, l) => s + l.monthlyPayment, 0);

    if (active.length > 1) {
      const top = [...active].sort((a, b) => b.interestRate - a.interestRate)[0];
      out.push({ kind: 'neutral', text: `Throw any extra at ${top.lender} first — at ${top.interestRate}% p.a. it's your priciest debt (avalanche method).` });
    }
    if (totalMonthly > 0) {
      const months = Math.ceil(totalOut / totalMonthly);
      out.push({ kind: 'neutral', text: `At ~${this.money.format(totalMonthly)}/mo you'd be debt-free in about ${months} month${months === 1 ? '' : 's'}.` });
    }
    const heavy = active.find((l) => l.principal > 0 && l.totalInterest / l.principal > 0.5);
    if (heavy) {
      out.push({ kind: 'warning', text: `${heavy.lender} interest totals ${this.money.format(heavy.totalInterest)} — ${Math.round((heavy.totalInterest / heavy.principal) * 100)}% of principal. Paying early trims it.` });
    }
    const avg = Math.round((active.reduce((s, l) => s + l.progress, 0) / active.length) * 100);
    if (avg >= 50) out.push({ kind: 'positive', text: `You're ${avg}% through repaying your active loans on average — over halfway there.` });
    return out.slice(0, 4);
  });
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
      next: () => { this.saving.set(false); this.showLoan.set(false); this.toast.success('Loan added'); this.reload(); },
      error: () => { this.saving.set(false); this.toast.error('Could not add the loan'); },
    });
  }

  async remove(l: Loan): Promise<void> {
    const ok = await this.toast.confirm({ title: `Delete loan from ${l.lender}?`, confirmText: 'Delete', danger: true });
    if (!ok) return;
    this.api.deleteLoan(l.id).subscribe(() => { this.toast.success('Loan deleted'); this.reload(); });
  }

  openPayment(l: Loan): void { this.pay = { amount: null, date: todayIso(), note: '' }; this.payLoan.set(l); }
  savePayment(): void {
    const l = this.payLoan();
    if (!l || !this.pay.amount) return;
    this.saving.set(true);
    this.api.addLoanPayment(l.id, { amount: Number(this.pay.amount), date: this.pay.date, note: this.pay.note || undefined }).subscribe({
      next: () => { this.saving.set(false); this.payLoan.set(null); this.toast.success('Payment recorded'); this.reload(); },
      error: () => { this.saving.set(false); this.toast.error('Could not record the payment'); },
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
