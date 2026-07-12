import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionType } from '../common/enums';
import { AccountsService } from '../accounts/accounts.service';
import { LoansService } from '../loans/loans.service';
import { SavingsService } from '../savings/savings.service';
import { UsersService } from '../users/users.service';
import { FxService } from '../common/fx.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    private readonly accountsService: AccountsService,
    private readonly loansService: LoansService,
    private readonly savingsService: SavingsService,
    private readonly usersService: UsersService,
    private readonly fx: FxService,
  ) {}

  async summary(userId: string) {
    const now = new Date();
    const monthStart = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
    const seriesStart = ymd(new Date(now.getFullYear(), now.getMonth() - 5, 1));

    const [user, accounts, loans, savingsGoals, monthlySeries, categoryBreakdown, recentTransactions] =
      await Promise.all([
        this.usersService.findById(userId),
        this.accountsService.findAll(userId),
        this.loansService.findAll(userId),
        this.savingsService.findAll(userId),
        this.monthlySeries(userId, seriesStart),
        this.categoryBreakdown(userId, monthStart),
        this.recent(userId),
      ]);

    // Everything is reported in the user's display currency. Account balances
    // convert from each account's native currency; the KES-denominated series,
    // savings and loans convert from KES.
    const display = user.currency || 'KES';
    const k2d = (kes: number) => this.fx.convert(kes, 'KES', display);

    const totalBalance = round2(
      accounts.reduce((s, a) => s + this.fx.convert(a.currentBalance, a.currency, display), 0),
    );
    const totalSaved = k2d(savingsGoals.reduce((s, g) => s + g.savedAmount, 0));
    const totalDebt = k2d(
      loans.filter((l) => l.status === 'ACTIVE').reduce((s, l) => s + l.outstanding, 0),
    );

    const displaySeries = monthlySeries.map((m) => ({
      month: m.month,
      income: k2d(m.income),
      expense: k2d(m.expense),
    }));
    const displayCategories = categoryBreakdown.map((c) => ({ ...c, total: k2d(c.total) }));
    const thisMonth = displaySeries[displaySeries.length - 1] ?? { income: 0, expense: 0 };

    return {
      currency: display,
      totals: {
        totalBalance,
        totalSaved,
        totalDebt,
        netWorth: round2(totalBalance + totalSaved - totalDebt),
        monthIncome: thisMonth.income,
        monthExpense: thisMonth.expense,
        monthNet: round2(thisMonth.income - thisMonth.expense),
      },
      monthlySeries: displaySeries,
      categoryBreakdown: displayCategories,
      accounts,
      savingsGoals,
      loans,
      recentTransactions,
    };
  }

  private async monthlySeries(userId: string, start: string) {
    const rows = await this.transactions
      .createQueryBuilder('t')
      .select("to_char(t.date, 'YYYY-MM')", 'month')
      .addSelect(
        `SUM(CASE WHEN t.type = :income THEN t.amount ELSE 0 END)`,
        'income',
      )
      .addSelect(
        `SUM(CASE WHEN t.type = :expense THEN t.amount ELSE 0 END)`,
        'expense',
      )
      .where('t.userId = :userId', { userId })
      .andWhere('t.date >= :start', { start })
      .setParameters({
        income: TransactionType.INCOME,
        expense: TransactionType.EXPENSE,
      })
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string; income: string; expense: string }>();

    const map = new Map(rows.map((r) => [r.month, r]));
    // Fill the last 6 months so the chart never has gaps.
    const series: { month: string; income: number; expense: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const row = map.get(key);
      series.push({
        month: key,
        income: row ? round2(parseFloat(row.income)) : 0,
        expense: row ? round2(parseFloat(row.expense)) : 0,
      });
    }
    return series;
  }

  private async categoryBreakdown(userId: string, monthStart: string) {
    const rows = await this.transactions
      .createQueryBuilder('t')
      .leftJoin('t.category', 'c')
      .select('COALESCE(c.name, :uncat)', 'name')
      .addSelect('COALESCE(c.color, :gray)', 'color')
      .addSelect('COALESCE(c.icon, :icon)', 'icon')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.userId = :userId', { userId })
      .andWhere('t.type = :expense', { expense: TransactionType.EXPENSE })
      .andWhere('t.date >= :monthStart', { monthStart })
      .setParameters({ uncat: 'Uncategorized', gray: '#94a3b8', icon: '❓' })
      .groupBy('c.id')
      .addGroupBy('c.name')
      .addGroupBy('c.color')
      .addGroupBy('c.icon')
      .orderBy('total', 'DESC')
      .getRawMany<{ name: string; color: string; icon: string; total: string }>();

    return rows.map((r) => ({
      name: r.name,
      color: r.color,
      icon: r.icon,
      total: round2(parseFloat(r.total)),
    }));
  }

  private recent(userId: string): Promise<Transaction[]> {
    return this.transactions.find({
      where: { userId },
      relations: { category: true, account: true },
      order: { date: 'DESC', createdAt: 'DESC' },
      take: 8,
    });
  }
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
