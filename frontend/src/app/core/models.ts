export type AccountType = 'MPESA' | 'BANK' | 'CASH' | 'SACCO';
export type Channel = 'MPESA' | 'BANK' | 'CASH' | 'SACCO';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT';
export type CategoryKind = 'INCOME' | 'EXPENSE';
export type LenderType = 'BANK' | 'MOBILE_APP' | 'SACCO' | 'INDIVIDUAL';
export type InterestType = 'FLAT' | 'REDUCING';
export type LoanStatus = 'ACTIVE' | 'PAID' | 'DEFAULTED';
export type BudgetPlanType = 'COMRADE' | 'HUSTLER' | 'CORPORATE' | 'CUSTOM';

export interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
  persona?: string;
  tagline?: string;
  avatarColor?: string;
}

export interface AuthResult {
  token: string;
  refreshToken: string;
  user: User;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number;
  currency: string;
  institution?: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  isSystem: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  channel: Channel;
  note?: string;
  reference?: string;
  accountId?: string;
  categoryId?: string;
  transferGroupId?: string | null;
  account?: Account;
  category?: Category;
}

export interface LoanPayment {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Loan {
  id: string;
  lender: string;
  lenderType: LenderType;
  principal: number;
  interestRate: number;
  interestType: InterestType;
  termMonths: number;
  startDate: string;
  dueDate?: string;
  status: LoanStatus;
  payments?: LoanPayment[];
  // computed
  monthlyPayment: number;
  totalRepayable: number;
  totalInterest: number;
  totalPaid: number;
  outstanding: number;
  progress: number;
}

export interface SavingsContribution {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate?: string;
  icon: string;
  color: string;
  contributions?: SavingsContribution[];
  // computed
  savedAmount: number;
  remaining: number;
  progress: number;
}

export interface BudgetItem {
  id?: string;
  categoryId?: string;
  label: string;
  limitAmount: number;
  icon: string;
  color: string;
  // computed
  spent?: number;
  remaining?: number;
  progress?: number;
  over?: boolean;
}

export interface Budget {
  id: string;
  name: string;
  planType: BudgetPlanType;
  expectedIncome: number;
  icon: string;
  color: string;
  currency?: string;
  isActive: boolean;
  items: BudgetItem[];
  // computed
  totalLimit: number;
  totalSpent: number;
  totalRemaining: number;
  progress: number;
}

export interface TemplateItem {
  category: string;
  icon: string;
  color: string;
  limit: number;
}

export interface BudgetTemplate {
  planType: BudgetPlanType;
  name: string;
  icon: string;
  color: string;
  tagline: string;
  audience: string;
  expectedIncome: number;
  items: TemplateItem[];
}

export type ReportPeriod = '1' | '3' | '6' | 'all';
export type InsightKind = 'positive' | 'warning' | 'neutral';

export interface Insight {
  kind: InsightKind;
  text: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  icon: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface ReportData {
  period: ReportPeriod;
  periodLabel: string;
  start: string | null;
  generatedAt: string;
  totals: { income: number; expense: number; net: number; savingsRate: number };
  monthly: { month: string; income: number; expense: number; net: number }[];
  categories: { name: string; icon: string; color: string; total: number; pct: number }[];
  channels: { channel: string; total: number; pct: number }[];
  insights: Insight[];
}

export type ImportSource = 'MPESA_SMS' | 'MPESA_CSV';
export type ImportRowStatus = 'NEW' | 'DUPLICATE' | 'INVALID' | 'COMMITTED';

export interface ImportRow {
  id: string;
  reference: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  channel: Channel;
  note: string | null;
  raw: string;
  status: ImportRowStatus;
}

export interface ImportBatch {
  id: string;
  source: ImportSource;
  committed: boolean;
  parsedCount: number;
  duplicateCount: number;
  unparsedCount: number;
  committedCount: number;
  rows: ImportRow[];
  createdAt: string;
}

export interface ImportPreview {
  batch: ImportBatch;
  unparsed: string[];
}

export type Cadence = 'WEEKLY' | 'MONTHLY';

export interface RecurringRule {
  id: string;
  name: string;
  type: TransactionType;
  amount: number;
  channel: Channel;
  categoryId: string | null;
  accountId: string | null;
  cadence: Cadence;
  anchorDay: number;
  nextRunAt: string;
  lastRunAt: string | null;
  active: boolean;
  note: string | null;
}

export interface UpcomingOccurrence {
  ruleId: string;
  name: string;
  type: TransactionType;
  amount: number;
  channel: Channel;
  date: string;
}

export interface DashboardSummary {
  totals: {
    totalBalance: number;
    totalSaved: number;
    totalDebt: number;
    netWorth: number;
    monthIncome: number;
    monthExpense: number;
    monthNet: number;
  };
  monthlySeries: { month: string; income: number; expense: number }[];
  categoryBreakdown: { name: string; color: string; icon: string; total: number }[];
  accounts: Account[];
  savingsGoals: SavingsGoal[];
  loans: Loan[];
  recentTransactions: Transaction[];
}
