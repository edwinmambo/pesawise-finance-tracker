import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './api-base';
import {
  Account,
  Budget,
  BudgetTemplate,
  Category,
  DashboardSummary,
  ImportBatch,
  ImportPreview,
  ImportSource,
  Loan,
  RecurringRule,
  ReportData,
  ReportPeriod,
  SavingsGoal,
  Transaction,
  UpcomingOccurrence,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = API_BASE;

  // Dashboard
  dashboard(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.base}/dashboard/summary`);
  }

  // Reports (server-side aggregation + exports)
  report(period: ReportPeriod): Observable<ReportData> {
    return this.http.get<ReportData>(`${this.base}/reports`, { params: { period } });
  }
  downloadReport(period: ReportPeriod, format: 'csv' | 'pdf'): Observable<Blob> {
    return this.http.get(`${this.base}/reports`, {
      params: { period, format },
      responseType: 'blob',
    });
  }

  // Accounts
  accounts(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.base}/accounts`);
  }
  createAccount(body: Partial<Account>): Observable<Account> {
    return this.http.post<Account>(`${this.base}/accounts`, body);
  }
  updateAccount(id: string, body: Partial<Account>): Observable<Account> {
    return this.http.patch<Account>(`${this.base}/accounts/${id}`, body);
  }
  deleteAccount(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/accounts/${id}`);
  }

  // Categories
  categories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/categories`);
  }
  createCategory(body: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(`${this.base}/categories`, body);
  }
  updateCategory(id: string, body: Partial<Category>): Observable<Category> {
    return this.http.patch<Category>(`${this.base}/categories/${id}`, body);
  }
  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/categories/${id}`);
  }

  // Transactions
  transactions(filters: Record<string, string | undefined> = {}): Observable<Transaction[]> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v) params = params.set(k, v);
    }
    return this.http.get<Transaction[]>(`${this.base}/transactions`, { params });
  }
  createTransaction(body: Partial<Transaction>): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.base}/transactions`, body);
  }
  updateTransaction(id: string, body: Partial<Transaction>): Observable<Transaction> {
    return this.http.patch<Transaction>(`${this.base}/transactions/${id}`, body);
  }
  deleteTransaction(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/transactions/${id}`);
  }

  // Loans
  loans(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.base}/loans`);
  }
  loan(id: string): Observable<Loan> {
    return this.http.get<Loan>(`${this.base}/loans/${id}`);
  }
  createLoan(body: Partial<Loan>): Observable<Loan> {
    return this.http.post<Loan>(`${this.base}/loans`, body);
  }
  updateLoan(id: string, body: Partial<Loan>): Observable<Loan> {
    return this.http.patch<Loan>(`${this.base}/loans/${id}`, body);
  }
  deleteLoan(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/loans/${id}`);
  }
  addLoanPayment(id: string, body: { amount: number; date: string; note?: string }): Observable<Loan> {
    return this.http.post<Loan>(`${this.base}/loans/${id}/payments`, body);
  }
  removeLoanPayment(id: string, paymentId: string): Observable<Loan> {
    return this.http.delete<Loan>(`${this.base}/loans/${id}/payments/${paymentId}`);
  }

  // Savings
  savingsGoals(): Observable<SavingsGoal[]> {
    return this.http.get<SavingsGoal[]>(`${this.base}/savings-goals`);
  }
  savingsGoal(id: string): Observable<SavingsGoal> {
    return this.http.get<SavingsGoal>(`${this.base}/savings-goals/${id}`);
  }
  createGoal(body: Partial<SavingsGoal>): Observable<SavingsGoal> {
    return this.http.post<SavingsGoal>(`${this.base}/savings-goals`, body);
  }
  updateGoal(id: string, body: Partial<SavingsGoal>): Observable<SavingsGoal> {
    return this.http.patch<SavingsGoal>(`${this.base}/savings-goals/${id}`, body);
  }
  deleteGoal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/savings-goals/${id}`);
  }
  addContribution(id: string, body: { amount: number; date: string; note?: string }): Observable<SavingsGoal> {
    return this.http.post<SavingsGoal>(`${this.base}/savings-goals/${id}/contributions`, body);
  }
  removeContribution(id: string, contributionId: string): Observable<SavingsGoal> {
    return this.http.delete<SavingsGoal>(`${this.base}/savings-goals/${id}/contributions/${contributionId}`);
  }

  // Budgets
  budgetTemplates(): Observable<BudgetTemplate[]> {
    return this.http.get<BudgetTemplate[]>(`${this.base}/budgets/templates`);
  }
  budgets(): Observable<Budget[]> {
    return this.http.get<Budget[]>(`${this.base}/budgets`);
  }
  createBudget(body: Partial<Budget>): Observable<Budget> {
    return this.http.post<Budget>(`${this.base}/budgets`, body);
  }
  applyTemplate(planType: string): Observable<Budget> {
    return this.http.post<Budget>(`${this.base}/budgets/apply-template`, { planType });
  }
  updateBudget(id: string, body: Partial<Budget>): Observable<Budget> {
    return this.http.patch<Budget>(`${this.base}/budgets/${id}`, body);
  }
  deleteBudget(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/budgets/${id}`);
  }

  // Imports (M-Pesa)
  previewImport(source: ImportSource, raw: string): Observable<ImportPreview> {
    return this.http.post<ImportPreview>(`${this.base}/imports`, { source, raw });
  }
  commitImport(id: string, rowIds?: string[]): Observable<ImportBatch> {
    return this.http.post<ImportBatch>(`${this.base}/imports/${id}/commit`, rowIds ? { rowIds } : {});
  }

  // Recurring
  recurring(): Observable<RecurringRule[]> {
    return this.http.get<RecurringRule[]>(`${this.base}/recurring`);
  }
  upcomingRecurring(days = 30): Observable<UpcomingOccurrence[]> {
    return this.http.get<UpcomingOccurrence[]>(`${this.base}/recurring/upcoming`, { params: { days: String(days) } });
  }
  createRecurring(body: Partial<RecurringRule> & { startDate?: string }): Observable<RecurringRule> {
    return this.http.post<RecurringRule>(`${this.base}/recurring`, body);
  }
  updateRecurring(id: string, body: Partial<RecurringRule>): Observable<RecurringRule> {
    return this.http.patch<RecurringRule>(`${this.base}/recurring/${id}`, body);
  }
  deleteRecurring(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/recurring/${id}`);
  }
  runRecurring(): Observable<{ created: number }> {
    return this.http.post<{ created: number }>(`${this.base}/recurring/run`, {});
  }
}
