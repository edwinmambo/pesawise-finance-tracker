import * as bcrypt from 'bcryptjs';
import { AppDataSource } from './data-source';
import { User } from '../users/user.entity';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';
import { Transaction } from '../transactions/transaction.entity';
import { Loan } from '../loans/loan.entity';
import { LoanPayment } from '../loans/loan-payment.entity';
import { SavingsGoal } from '../savings/savings-goal.entity';
import { SavingsContribution } from '../savings/savings-contribution.entity';
import { Budget } from '../budgets/budget.entity';
import { BudgetItem } from '../budgets/budget-item.entity';
import { BUDGET_TEMPLATES } from '../budgets/budget-templates';
import {
  AccountType,
  BudgetPlanType,
  CategoryKind,
  Channel,
  InterestType,
  LenderType,
  LoanStatus,
  TransactionType,
} from '../common/enums';

// ---- time helpers --------------------------------------------------------
const now = new Date();

function ymd(y: number, m: number, d: number): string {
  const dt = new Date(y, m, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
    dt.getDate(),
  ).padStart(2, '0')}`;
}
const ri = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const chance = (p: number) => Math.random() < p;
function mpesaRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// ---- category catalogue (icon + colour per name) -------------------------
const INCOME_META: Record<string, { icon: string; color: string }> = {
  Salary: { icon: '💼', color: '#2563eb' },
  Freelance: { icon: '💻', color: '#4f46e5' },
  Business: { icon: '🛒', color: '#0891b2' },
  'HELB & Bursary': { icon: '🎓', color: '#3b82f6' },
  'Pocket Money': { icon: '💝', color: '#ec4899' },
  'Casual Job': { icon: '👷', color: '#a16207' },
  'Boda Income': { icon: '🏍️', color: '#0d9488' },
  Sales: { icon: '🥬', color: '#16a34a' },
  Remittance: { icon: '✈️', color: '#7c3aed' },
  Bonus: { icon: '🎉', color: '#f59e0b' },
  Tips: { icon: '🪙', color: '#eab308' },
};
const EXPENSE_META: Record<string, { icon: string; color: string }> = {
  'Food & Mess': { icon: '🍲', color: '#f97316' },
  'Food & Shopping': { icon: '🛍️', color: '#f97316' },
  'Hostel & Rent': { icon: '🏠', color: '#ef4444' },
  Rent: { icon: '🏠', color: '#ef4444' },
  'Stall Rent': { icon: '🏪', color: '#ef4444' },
  'Transport & Fare': { icon: '🚌', color: '#0ea5e9' },
  'Transport & Fuel': { icon: '⛽', color: '#0ea5e9' },
  Fuel: { icon: '⛽', color: '#0ea5e9' },
  'Airtime & Data': { icon: '📱', color: '#22c55e' },
  'Books & Printing': { icon: '📚', color: '#6366f1' },
  Entertainment: { icon: '🎬', color: '#ec4899' },
  Savings: { icon: '🐖', color: '#16a34a' },
  'Stock & Tools': { icon: '🧰', color: '#a16207' },
  'Stock & Restocking': { icon: '📦', color: '#a16207' },
  'Family Support': { icon: '👪', color: '#14b8a6' },
  'Chama & Savings': { icon: '🤝', color: '#16a34a' },
  'Emergency Fund': { icon: '🛟', color: '#0d9488' },
  'Loan Repayment': { icon: '🏦', color: '#64748b' },
  'Bike Finance': { icon: '🏍️', color: '#64748b' },
  'SACCO & Savings': { icon: '🤝', color: '#16a34a' },
  Investments: { icon: '📈', color: '#0891b2' },
  Utilities: { icon: '💡', color: '#eab308' },
  'Medical & Insurance': { icon: '💊', color: '#e11d48' },
  Medical: { icon: '💊', color: '#e11d48' },
  'Tithe & Offering': { icon: '⛪', color: '#9333ea' },
  'School Fees': { icon: '🎓', color: '#3b82f6' },
  Construction: { icon: '🧱', color: '#b45309' },
};

// ---- persona spec --------------------------------------------------------
interface AccountSpec {
  key: string;
  name: string;
  type: AccountType;
  opening: number;
  institution?: string;
  color: string;
}
interface LoanSpec {
  lender: string;
  lenderType: LenderType;
  principal: number;
  interestRate: number;
  interestType: InterestType;
  termMonths: number;
  startBack: number; // months ago it started
  status?: LoanStatus;
  monthlyPayment?: number; // if set, back-fills monthly payments
  payments?: { amount: number; back: number; note: string }[];
}
interface GoalSpec {
  name: string;
  target: number;
  icon: string;
  color: string;
  monthly: number;
  monthsAhead: number;
}

interface MonthCtx {
  y: number;
  mo: number;
  back: number;
  income: (cat: string, amount: number, day: number, acct: string, note: string) => void;
  expense: (cat: string, amount: number, day: number, acct: string, note: string) => void;
}

interface PersonaSpec {
  name: string;
  email: string;
  password: string;
  persona: string;
  tagline: string;
  avatarColor: string;
  plan: BudgetPlanType;
  accounts: AccountSpec[];
  month: (ctx: MonthCtx) => void;
  loans?: LoanSpec[];
  goals?: GoalSpec[];
}

async function buildPersona(spec: PersonaSpec) {
  const usersRepo = AppDataSource.getRepository(User);
  const accountsRepo = AppDataSource.getRepository(Account);
  const categoriesRepo = AppDataSource.getRepository(Category);
  const txRepo = AppDataSource.getRepository(Transaction);
  const loansRepo = AppDataSource.getRepository(Loan);
  const loanPayRepo = AppDataSource.getRepository(LoanPayment);
  const goalsRepo = AppDataSource.getRepository(SavingsGoal);
  const contribRepo = AppDataSource.getRepository(SavingsContribution);
  const budgetsRepo = AppDataSource.getRepository(Budget);

  // Fresh slate for this persona (cascades to all their data).
  const existing = await usersRepo.findOne({ where: { email: spec.email } });
  if (existing) await usersRepo.delete({ id: existing.id });

  const user = await usersRepo.save(
    usersRepo.create({
      name: spec.name,
      email: spec.email,
      passwordHash: await bcrypt.hash(spec.password, 10),
      currency: 'KES',
      persona: spec.persona,
      tagline: spec.tagline,
      avatarColor: spec.avatarColor,
    }),
  );
  const userId = user.id;

  // Accounts
  const accountByKey = new Map<string, Account>();
  for (const a of spec.accounts) {
    const acc = await accountsRepo.save(
      accountsRepo.create({
        userId,
        name: a.name,
        type: a.type,
        openingBalance: a.opening,
        institution: a.institution,
        color: a.color,
      }),
    );
    accountByKey.set(a.key, acc);
  }

  // Lazy category creator (memoised by name).
  const catByName = new Map<string, Category>();
  const ensureCat = (name: string, kind: CategoryKind): Category => {
    let c = catByName.get(name);
    if (c) return c;
    const meta =
      (kind === CategoryKind.INCOME ? INCOME_META : EXPENSE_META)[name] ?? {
        icon: kind === CategoryKind.INCOME ? '💰' : '🧾',
        color: '#64748b',
      };
    c = categoriesRepo.create({
      userId,
      name,
      kind,
      icon: meta.icon,
      color: meta.color,
      isSystem: true,
    });
    catByName.set(name, c);
    return c;
  };
  // Pre-register the categories this persona's budget plan needs, so every
  // category is created & saved in the single pass below (no double-save).
  const template = BUDGET_TEMPLATES.find((t) => t.planType === spec.plan)!;
  for (const ti of template.items) ensureCat(ti.category, CategoryKind.EXPENSE);

  interface TxnSpec {
    type: TransactionType;
    amount: number;
    date: string;
    channel: Channel;
    accountId: string;
    categoryName: string;
    reference?: string;
    note: string;
  }
  const txnSpecs: TxnSpec[] = [];
  const channelFor = (acc: Account): Channel => acc.type as unknown as Channel;

  for (let back = 5; back >= 0; back--) {
    const base = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const y = base.getFullYear();
    const mo = base.getMonth();
    const push = (
      type: TransactionType,
      kind: CategoryKind,
      cat: string,
      amount: number,
      day: number,
      acctKey: string,
      note: string,
    ) => {
      const date = new Date(y, mo, day);
      if (date > now) return; // never seed the future
      const acc = accountByKey.get(acctKey);
      if (!acc) return;
      ensureCat(cat, kind); // register category — saved (with id) in one pass below
      txnSpecs.push({
        type,
        amount,
        date: ymd(y, mo, day),
        channel: channelFor(acc),
        accountId: acc.id,
        categoryName: cat,
        reference: acc.type === AccountType.MPESA ? mpesaRef() : undefined,
        note,
      });
    };
    spec.month({
      y,
      mo,
      back,
      income: (cat, amount, day, acct, note) =>
        push(TransactionType.INCOME, CategoryKind.INCOME, cat, amount, day, acct, note),
      expense: (cat, amount, day, acct, note) =>
        push(TransactionType.EXPENSE, CategoryKind.EXPENSE, cat, amount, day, acct, note),
    });
  }

  // Persist categories first so every transaction gets a real categoryId.
  await categoriesRepo.save([...catByName.values()]);
  const txns = txnSpecs.map((s) =>
    txRepo.create({
      userId,
      type: s.type,
      amount: s.amount,
      date: s.date,
      channel: s.channel,
      accountId: s.accountId,
      categoryId: catByName.get(s.categoryName)!.id,
      reference: s.reference,
      note: s.note,
    }),
  );
  await txRepo.save(txns);

  // Loans
  for (const l of spec.loans ?? []) {
    const startBase = new Date(now.getFullYear(), now.getMonth() - l.startBack, 10);
    const loan = await loansRepo.save(
      loansRepo.create({
        userId,
        lender: l.lender,
        lenderType: l.lenderType,
        principal: l.principal,
        interestRate: l.interestRate,
        interestType: l.interestType,
        termMonths: l.termMonths,
        startDate: ymd(startBase.getFullYear(), startBase.getMonth(), 10),
        dueDate: ymd(
          startBase.getFullYear(),
          startBase.getMonth() + l.termMonths,
          10,
        ),
        status: l.status ?? LoanStatus.ACTIVE,
      }),
    );
    const pays: LoanPayment[] = [];
    if (l.monthlyPayment) {
      for (let b = l.startBack; b >= 1; b--) {
        const d = new Date(now.getFullYear(), now.getMonth() - b, 12);
        pays.push(
          loanPayRepo.create({
            loanId: loan.id,
            amount: l.monthlyPayment,
            date: ymd(d.getFullYear(), d.getMonth(), 12),
            note: 'Monthly installment',
          }),
        );
      }
    }
    for (const p of l.payments ?? []) {
      const d = new Date(now.getFullYear(), now.getMonth() - p.back, 12);
      pays.push(
        loanPayRepo.create({
          loanId: loan.id,
          amount: p.amount,
          date: ymd(d.getFullYear(), d.getMonth(), 12),
          note: p.note,
        }),
      );
    }
    if (pays.length) await loanPayRepo.save(pays);
  }

  // Savings goals
  for (const g of spec.goals ?? []) {
    const goal = await goalsRepo.save(
      goalsRepo.create({
        userId,
        name: g.name,
        targetAmount: g.target,
        icon: g.icon,
        color: g.color,
        targetDate: ymd(now.getFullYear(), now.getMonth() + g.monthsAhead, 28),
      }),
    );
    const contribs: SavingsContribution[] = [];
    for (let b = 5; b >= 0; b--) {
      const d = new Date(now.getFullYear(), now.getMonth() - b, 6);
      if (d > now) continue;
      contribs.push(
        contribRepo.create({
          goalId: goal.id,
          amount: g.monthly,
          date: ymd(d.getFullYear(), d.getMonth(), 6),
          note: 'Monthly saving',
        }),
      );
    }
    await contribRepo.save(contribs);
  }

  // Budget — apply the matching premade plan, tracked against real categories.
  // All categories are already saved above, so each item just references its id.
  const items: BudgetItem[] = template.items.map((ti) =>
    AppDataSource.getRepository(BudgetItem).create({
      categoryId: catByName.get(ti.category)!.id,
      label: ti.category,
      limitAmount: ti.limit,
      icon: ti.icon,
      color: ti.color,
    }),
  );
  await budgetsRepo.save(
    budgetsRepo.create({
      userId,
      name: template.name,
      planType: template.planType,
      expectedIncome: template.expectedIncome,
      icon: template.icon,
      color: template.color,
      isActive: true,
      items,
    }),
  );

  console.log(`  ✓ ${spec.name.padEnd(18)} ${spec.email}  (${txns.length} txns)`);
}

// ==========================================================================
//  PERSONAS
// ==========================================================================
const PERSONAS: PersonaSpec[] = [
  // ---- Comrade -----------------------------------------------------------
  {
    name: 'Brian Otieno',
    email: 'brian@pesawise.co.ke',
    password: 'pesa1234',
    persona: 'University student · Comrade',
    tagline: 'Second-year at UoN stretching HELB, pocket money and design gigs.',
    avatarColor: '#2563eb',
    plan: BudgetPlanType.COMRADE,
    accounts: [
      { key: 'mpesa', name: 'M-Pesa', type: AccountType.MPESA, opening: 850, institution: 'Safaricom', color: '#16a34a' },
      { key: 'cash', name: 'Cash', type: AccountType.CASH, opening: 600, color: '#f59e0b' },
    ],
    month: ({ back, income, expense }) => {
      // HELB lands once a term (~every 3rd month)
      if (back % 3 === 0) income('HELB & Bursary', 20000, 8, 'mpesa', 'HELB disbursement');
      income('Pocket Money', 6000, 3, 'mpesa', 'Upkeep from home');
      if (chance(0.6)) income('Freelance', ri(1500, 4500), ri(10, 22), 'mpesa', 'Poster / logo gig');
      expense('Hostel & Rent', 3500, 4, 'mpesa', 'Hostel rent');
      for (const day of [2, 9, 16, 23]) expense('Food & Mess', ri(250, 650), day, chance(0.5) ? 'cash' : 'mpesa', pick(['Mess lunch', 'Chapo madondo', 'Kibandaski']));
      for (let i = 0; i < 6; i++) expense('Transport & Fare', ri(50, 150), ri(1, 27), 'cash', pick(['Matatu to campus', 'Fare to town']));
      expense('Airtime & Data', 500, 5, 'mpesa', 'Data bundle');
      if (chance(0.7)) expense('Airtime & Data', 300, 18, 'mpesa', 'Airtime');
      if (chance(0.6)) expense('Books & Printing', ri(200, 900), ri(6, 20), 'mpesa', pick(['Printing notes', 'Past papers', 'Handout']));
      expense('Entertainment', ri(500, 1500), 21, chance(0.5) ? 'cash' : 'mpesa', pick(['Comrades hangout', 'Movie night', 'Football viewing']));
      expense('Savings', 1200, 6, 'mpesa', 'Laptop savings');
    },
    loans: [
      { lender: 'Tala', lenderType: LenderType.MOBILE_APP, principal: 3000, interestRate: 50, interestType: InterestType.FLAT, termMonths: 1, startBack: 0, payments: [] },
    ],
    goals: [
      { name: 'Laptop Fund', target: 60000, icon: '💻', color: '#2563eb', monthly: 1200, monthsAhead: 10 },
      { name: 'Attachment Fund', target: 20000, icon: '🧳', color: '#f59e0b', monthly: 800, monthsAhead: 6 },
    ],
  },

  // ---- Hustler (casual worker) ------------------------------------------
  {
    name: 'Kevin Mwangi',
    email: 'kevin@pesawise.co.ke',
    password: 'pesa1234',
    persona: 'Casual worker · Hustler',
    tagline: 'Takes mjengo and delivery gigs as they come — income never the same twice.',
    avatarColor: '#ea580c',
    plan: BudgetPlanType.HUSTLER,
    accounts: [
      { key: 'mpesa', name: 'M-Pesa', type: AccountType.MPESA, opening: 2100, institution: 'Safaricom', color: '#16a34a' },
      { key: 'cash', name: 'Cash', type: AccountType.CASH, opening: 3500, color: '#f59e0b' },
    ],
    month: ({ income, expense }) => {
      // Irregular gig income scattered through the month
      let gigs = ri(6, 10);
      for (let i = 0; i < gigs; i++) income('Casual Job', ri(800, 3500), ri(1, 27), chance(0.6) ? 'mpesa' : 'cash', pick(['Mjengo day', 'Loading truck', 'Delivery gig', 'Paint job', 'Fundi assist']));
      if (chance(0.4)) income('Casual Job', ri(6000, 9000), ri(10, 20), 'mpesa', 'Weekend contract');
      expense('Rent', 6000, 3, 'mpesa', 'Single room rent');
      for (const day of [5, 12, 19, 26]) expense('Food & Shopping', ri(800, 2200), day, chance(0.5) ? 'cash' : 'mpesa', pick(['Mama mboga', 'Unga & sukuma', 'Githeri stuff']));
      for (let i = 0; i < 8; i++) expense('Transport & Fuel', ri(80, 300), ri(1, 27), 'cash', pick(['Matatu', 'Boda to site']));
      if (chance(0.7)) expense('Stock & Tools', ri(500, 2500), ri(4, 22), 'mpesa', pick(['Trowel & tools', 'Work gloves', 'Gumboots']));
      expense('Family Support', 3000, 15, 'mpesa', 'Sending home to mum');
      expense('Airtime & Data', 500, 7, 'mpesa', 'Bundles');
      expense('Chama & Savings', 3000, 6, 'mpesa', 'Weekly chama');
      if (chance(0.5)) expense('Emergency Fund', 1500, 20, 'mpesa', 'M-Shwari lock');
    },
    loans: [
      { lender: 'Tala', lenderType: LenderType.MOBILE_APP, principal: 12000, interestRate: 55, interestType: InterestType.FLAT, termMonths: 2, startBack: 1, payments: [{ amount: 7000, back: 0, note: 'Part payment' }] },
    ],
    goals: [
      { name: 'Own Toolbox', target: 35000, icon: '🧰', color: '#a16207', monthly: 1500, monthsAhead: 8 },
      { name: 'Emergency Fund', target: 50000, icon: '🛟', color: '#0d9488', monthly: 1500, monthsAhead: 12 },
    ],
  },

  // ---- Corporate ---------------------------------------------------------
  {
    name: 'Faith Njeri',
    email: 'faith@pesawise.co.ke',
    password: 'pesa1234',
    persona: 'Marketing manager · Corporate',
    tagline: 'Salaried professional in Nairobi balancing a car loan, SACCO and MMF investing.',
    avatarColor: '#4f46e5',
    plan: BudgetPlanType.CORPORATE,
    accounts: [
      { key: 'bank', name: 'KCB Current', type: AccountType.BANK, opening: 85000, institution: 'KCB', color: '#16a34a' },
      { key: 'mpesa', name: 'M-Pesa', type: AccountType.MPESA, opening: 6400, institution: 'Safaricom', color: '#16a34a' },
      { key: 'sacco', name: 'Stima SACCO', type: AccountType.SACCO, opening: 240000, institution: 'Stima SACCO', color: '#7c3aed' },
    ],
    month: ({ back, income, expense }) => {
      income('Salary', 145000, 28, 'bank', 'Net salary');
      if (back === 1) income('Bonus', 60000, 20, 'bank', 'Quarterly performance bonus');
      expense('Rent', 32000, 2, 'bank', 'Apartment rent (Kilimani)');
      for (const day of [6, 14, 22, 28]) expense('Food & Shopping', ri(3000, 6000), day, chance(0.5) ? 'bank' : 'mpesa', pick(['Naivas', 'Carrefour', 'Chandarana']));
      expense('Transport & Fuel', ri(9000, 13000), 5, 'bank', 'Fuel + parking');
      expense('Loan Repayment', 15000, 12, 'bank', 'Car loan installment');
      expense('SACCO & Savings', 18000, 28, 'sacco', 'SACCO monthly deposit');
      expense('Investments', 12000, 28, 'bank', 'MMF top-up (CIC)');
      expense('Utilities', ri(4500, 6500), 8, 'mpesa', pick(['KPLC + water', 'Internet (Zuku)']));
      expense('Medical & Insurance', 5000, 10, 'bank', 'Health cover premium');
      expense('Entertainment', ri(4000, 9000), 24, chance(0.5) ? 'bank' : 'mpesa', pick(['Brunch', 'Weekend getaway', 'Concert']));
    },
    loans: [
      { lender: 'Absa Bank', lenderType: LenderType.BANK, principal: 900000, interestRate: 13, interestType: InterestType.REDUCING, termMonths: 60, startBack: 14, monthlyPayment: 20480 },
    ],
    goals: [
      { name: 'House Deposit', target: 2000000, icon: '🏡', color: '#16a34a', monthly: 20000, monthsAhead: 24 },
      { name: 'Emergency Fund', target: 500000, icon: '🛟', color: '#0d9488', monthly: 10000, monthsAhead: 12 },
      { name: 'Dubai Holiday', target: 250000, icon: '✈️', color: '#7c3aed', monthly: 8000, monthsAhead: 8 },
    ],
  },

  // ---- Boda boda rider ---------------------------------------------------
  {
    name: 'Peter Kamau',
    email: 'peter@pesawise.co.ke',
    password: 'pesa1234',
    persona: 'Boda boda rider · Hustler',
    tagline: 'Rides daily in Thika, paying off his bike on Watu asset finance.',
    avatarColor: '#0d9488',
    plan: BudgetPlanType.HUSTLER,
    accounts: [
      { key: 'mpesa', name: 'M-Pesa', type: AccountType.MPESA, opening: 1800, institution: 'Safaricom', color: '#16a34a' },
      { key: 'cash', name: 'Cash', type: AccountType.CASH, opening: 1200, color: '#f59e0b' },
    ],
    month: ({ income, expense }) => {
      // Daily-ish ride earnings — many small deposits
      for (let d = 1; d <= 27; d += 1) {
        if (chance(0.72)) income('Boda Income', ri(250, 900), d, chance(0.55) ? 'mpesa' : 'cash', 'Day rides');
      }
      // Fuel most days
      for (let d = 2; d <= 27; d += 2) {
        if (chance(0.8)) expense('Fuel', ri(200, 450), d, 'cash', 'Petrol');
      }
      expense('Rent', 5000, 3, 'mpesa', 'Single room rent');
      expense('Bike Finance', 9800, 10, 'mpesa', 'Watu weekly x4');
      for (const day of [4, 11, 18, 25]) expense('Food & Shopping', ri(400, 1200), day, chance(0.5) ? 'cash' : 'mpesa', pick(['Lunch on the road', 'Home shopping']));
      expense('Family Support', 3000, 15, 'mpesa', 'Wife & baby upkeep');
      expense('Airtime & Data', 400, 7, 'mpesa', 'Bundles');
      expense('Chama & Savings', 2500, 6, 'mpesa', 'Riders SACCO');
      if (chance(0.5)) expense('Stock & Tools', ri(600, 1800), ri(8, 22), 'mpesa', pick(['New helmet', 'Chain & service', 'Reflector jacket']));
    },
    loans: [
      { lender: 'Watu Credit', lenderType: LenderType.INDIVIDUAL, principal: 185000, interestRate: 24, interestType: InterestType.REDUCING, termMonths: 24, startBack: 8, monthlyPayment: 9800 },
    ],
    goals: [
      { name: 'Own the Bike', target: 185000, icon: '🏍️', color: '#0d9488', monthly: 4000, monthsAhead: 14 },
      { name: 'Second Bike', target: 220000, icon: '🛵', color: '#f59e0b', monthly: 2500, monthsAhead: 24 },
    ],
  },

  // ---- Mama Mboga (small vendor) ----------------------------------------
  {
    name: 'Susan Achieng',
    email: 'susan@pesawise.co.ke',
    password: 'pesa1234',
    persona: 'Mama Mboga · Small business',
    tagline: 'Runs a grocery stall at the market — daily sales, daily restocking.',
    avatarColor: '#16a34a',
    plan: BudgetPlanType.HUSTLER,
    accounts: [
      { key: 'mpesa', name: 'M-Pesa (Till)', type: AccountType.MPESA, opening: 4200, institution: 'Safaricom', color: '#16a34a' },
      { key: 'cash', name: 'Cash Box', type: AccountType.CASH, opening: 5000, color: '#f59e0b' },
    ],
    month: ({ income, expense }) => {
      // Daily sales, mix of till and cash
      for (let d = 1; d <= 27; d += 1) {
        if (chance(0.85)) income('Sales', ri(600, 2400), d, chance(0.5) ? 'mpesa' : 'cash', 'Day sales');
      }
      // Restocking at Marikiti a few times a week
      for (const day of [1, 4, 8, 11, 15, 18, 22, 25]) {
        if (chance(0.85)) expense('Stock & Restocking', ri(1500, 5000), day, chance(0.5) ? 'cash' : 'mpesa', pick(['Marikiti veggies', 'Tomatoes & onions', 'Sukuma & spinach', 'Fruits crate']));
      }
      expense('Stall Rent', 2000, 2, 'mpesa', 'Market table rent');
      for (const day of [6, 20]) expense('Food & Shopping', ri(1200, 2500), day, 'cash', 'Home shopping');
      expense('Transport & Fuel', ri(1500, 2500), 3, 'cash', 'Handcart & fare to Marikiti');
      expense('Family Support', 4000, 14, 'mpesa', 'School upkeep for kids');
      expense('Airtime & Data', 400, 7, 'mpesa', 'Bundles');
      expense('Chama & Savings', 3000, 10, 'mpesa', 'Merry-go-round');
      expense('Emergency Fund', 1500, 24, 'mpesa', 'M-Shwari lock');
    },
    loans: [
      { lender: 'KCB M-Pesa', lenderType: LenderType.MOBILE_APP, principal: 20000, interestRate: 8.85, interestType: InterestType.FLAT, termMonths: 1, startBack: 0, payments: [] },
      { lender: 'Table Banking Group', lenderType: LenderType.INDIVIDUAL, principal: 30000, interestRate: 10, interestType: InterestType.FLAT, termMonths: 6, startBack: 3, monthlyPayment: 5500 },
    ],
    goals: [
      { name: 'Bigger Stall', target: 120000, icon: '🏪', color: '#16a34a', monthly: 3000, monthsAhead: 12 },
      { name: 'School Fees', target: 80000, icon: '🎓', color: '#3b82f6', monthly: 3000, monthsAhead: 6 },
    ],
  },

  // ---- Diaspora sender ---------------------------------------------------
  {
    name: 'James Kariuki',
    email: 'james@pesawise.co.ke',
    password: 'pesa1234',
    persona: 'Diaspora · Qatar',
    tagline: 'Works in Doha, sends money home and is building a house upcountry.',
    avatarColor: '#7c3aed',
    plan: BudgetPlanType.CORPORATE,
    accounts: [
      { key: 'bank', name: 'Equity Diaspora', type: AccountType.BANK, opening: 320000, institution: 'Equity', color: '#dc2626' },
      { key: 'mpesa', name: 'M-Pesa', type: AccountType.MPESA, opening: 12000, institution: 'Safaricom', color: '#16a34a' },
      { key: 'sacco', name: 'Harambee SACCO', type: AccountType.SACCO, opening: 480000, institution: 'Harambee SACCO', color: '#7c3aed' },
    ],
    month: ({ back, income, expense }) => {
      income('Remittance', ri(165000, 195000), 4, 'bank', 'Salary remittance (QAR→KES)');
      if (chance(0.4)) income('Freelance', ri(20000, 40000), ri(12, 22), 'bank', 'Overtime remittance');
      expense('Family Support', 40000, 6, 'mpesa', 'Upkeep to mum & siblings');
      expense('Construction', ri(40000, 70000), 8, 'bank', pick(['Roofing materials', 'Mason & labour', 'Cement & ballast']));
      expense('SACCO & Savings', 25000, 5, 'sacco', 'SACCO deposit');
      expense('Investments', 20000, 10, 'bank', 'MMF / land savings');
      expense('Loan Repayment', 18000, 12, 'bank', 'Plot loan installment');
      expense('Utilities', ri(3000, 5000), 9, 'mpesa', 'Bills back home');
      expense('Medical & Insurance', 6000, 14, 'bank', 'Parents NHIF + cover');
      if (chance(0.6)) expense('Food & Shopping', ri(5000, 9000), 22, 'mpesa', 'Shopping for home');
    },
    loans: [
      { lender: 'Co-op Bank', lenderType: LenderType.BANK, principal: 1200000, interestRate: 12.5, interestType: InterestType.REDUCING, termMonths: 84, startBack: 20, monthlyPayment: 21300 },
    ],
    goals: [
      { name: 'Build the House', target: 3500000, icon: '🏡', color: '#16a34a', monthly: 60000, monthsAhead: 30 },
      { name: 'Buy Land (Plot)', target: 1500000, icon: '🌍', color: '#7c3aed', monthly: 25000, monthsAhead: 24 },
      { name: 'Business Capital', target: 800000, icon: '🏢', color: '#0891b2', monthly: 15000, monthsAhead: 18 },
    ],
  },

  // ---- Classic demo (kept for continuity) --------------------------------
  {
    name: 'Wanjiku Kamau',
    email: 'demo@pesawise.co.ke',
    password: 'demo1234',
    persona: 'Salaried professional · Nairobi',
    tagline: 'The original Pesawise demo — a balanced salaried profile with loans & goals.',
    avatarColor: '#10a37f',
    plan: BudgetPlanType.CORPORATE,
    accounts: [
      { key: 'mpesa', name: 'M-Pesa', type: AccountType.MPESA, opening: 3200, institution: 'Safaricom', color: '#16a34a' },
      { key: 'bank', name: 'Equity Bank', type: AccountType.BANK, opening: 41000, institution: 'Equity', color: '#dc2626' },
      { key: 'cash', name: 'Cash', type: AccountType.CASH, opening: 12000, color: '#f59e0b' },
      { key: 'sacco', name: 'Stima SACCO', type: AccountType.SACCO, opening: 18000, institution: 'Stima SACCO', color: '#7c3aed' },
    ],
    month: ({ back, income, expense }) => {
      income('Salary', 85000, 5, 'mpesa', 'Monthly salary');
      if (chance(0.6)) income('Freelance', ri(8000, 22000), ri(12, 24), 'mpesa', 'Freelance gig');
      if (chance(0.4)) income('Business', ri(4000, 12000), ri(8, 26), 'mpesa', 'Side business sales');
      expense('Rent', 25000, 3, 'mpesa', 'House rent (paybill)');
      expense('Tithe & Offering', 8500, 6, 'mpesa', 'Church tithe');
      expense('Utilities', ri(1800, 3200), 8, 'mpesa', 'KPLC tokens');
      expense('Loan Repayment', 7500, 12, 'mpesa', 'Equity loan repayment');
      expense('Family Support', 3000, 15, 'mpesa', 'Support for shosho');
      expense('Airtime & Data', 1000, 2, 'mpesa', 'Airtime bundle');
      for (const day of [4, 11, 19, 26]) expense('Food & Shopping', ri(1200, 4200), day, 'mpesa', pick(['Naivas groceries', 'Mama mboga', 'Quickmart']));
      for (let i = 0; i < 8; i++) expense('Transport & Fuel', ri(80, 400), ri(1, 27), chance(0.5) ? 'cash' : 'mpesa', pick(['Matatu fare', 'Boda boda']));
      expense('Entertainment', ri(800, 2600), 21, 'mpesa', pick(['Nyama choma', 'Movie night']));
      if (back % 3 === 0) expense('School Fees', 15000, 14, 'bank', 'Term school fees');
      expense('SACCO & Savings', 8000, 6, 'mpesa', 'Emergency fund');
    },
    loans: [
      { lender: 'Equity Bank', lenderType: LenderType.BANK, principal: 300000, interestRate: 13, interestType: InterestType.REDUCING, termMonths: 24, startBack: 9, monthlyPayment: 14260 },
      { lender: 'Tala', lenderType: LenderType.MOBILE_APP, principal: 15000, interestRate: 60, interestType: InterestType.FLAT, termMonths: 2, startBack: 1, payments: [{ amount: 9000, back: 0, note: 'Part payment' }] },
    ],
    goals: [
      { name: 'Emergency Fund', target: 200000, icon: '🛟', color: '#16a34a', monthly: 8000, monthsAhead: 12 },
      { name: 'School Fees (Jan)', target: 120000, icon: '🎓', color: '#3b82f6', monthly: 5000, monthsAhead: 6 },
      { name: 'Holiday / Christmas', target: 60000, icon: '🎄', color: '#dc2626', monthly: 3000, monthsAhead: 5 },
    ],
  },
];

async function seed() {
  await AppDataSource.initialize();

  // Auto-seed on container start uses this guard so it only seeds once and never
  // wipes real data on restarts. (`npm run seed` locally doesn't set it, so it
  // always refreshes the demo data as documented.)
  if (process.env.SEED_SKIP_IF_EXISTS === 'true') {
    const count = await AppDataSource.getRepository(User).count();
    if (count > 0) {
      console.log(`↩︎  ${count} users already present — skipping seed.`);
      await AppDataSource.destroy();
      return;
    }
  }

  console.log('🔌 Connected. Seeding Pesawise personas…\n');

  for (const persona of PERSONAS) {
    await buildPersona(persona);
  }

  console.log('\n✅ Seed complete! Log in with any persona (password shown):\n');
  for (const p of PERSONAS) {
    console.log(`   ${p.email.padEnd(28)} ${p.password}   — ${p.persona}`);
  }
  console.log('');

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
