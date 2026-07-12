import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionType } from '../common/enums';
import { buildInsights } from './report-insights';
import {
  PERIOD_LABELS,
  ReportCategory,
  ReportChannel,
  ReportData,
  ReportMonth,
  ReportPeriod,
  ReportTotals,
} from './reports.types';

/**
 * Server-side reporting. Reuses the same QueryBuilder aggregation shape as
 * DashboardService but generalised to a period range, so the frontend no longer
 * pulls every transaction to compute charts client-side.
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
  ) {}

  async build(userId: string, period: ReportPeriod): Promise<ReportData> {
    const start = periodStart(period);
    const [totals, monthly, categories, channels] = await Promise.all([
      this.totals(userId, start),
      this.monthly(userId, start),
      this.categories(userId, start),
      this.channels(userId, start),
    ]);

    return {
      period,
      periodLabel: PERIOD_LABELS[period],
      start,
      generatedAt: new Date().toISOString(),
      totals,
      monthly,
      categories,
      channels,
      insights: buildInsights({ totals, monthly, categories }),
    };
  }

  private applyRange<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    userId: string,
    start: string | null,
  ): SelectQueryBuilder<T> {
    qb.andWhere('t.userId = :userId', { userId });
    if (start) qb.andWhere('t.date >= :start', { start });
    return qb;
  }

  private async totals(userId: string, start: string | null): Promise<ReportTotals> {
    const qb = this.transactions
      .createQueryBuilder('t')
      .select(`COALESCE(SUM(CASE WHEN t.type = :income THEN t.amount ELSE 0 END), 0)`, 'income')
      .addSelect(`COALESCE(SUM(CASE WHEN t.type = :expense THEN t.amount ELSE 0 END), 0)`, 'expense')
      .setParameters({ income: TransactionType.INCOME, expense: TransactionType.EXPENSE });
    this.applyRange(qb, userId, start);
    const raw = await qb.getRawOne<{ income: string; expense: string }>();

    const income = round2(parseFloat(raw?.income ?? '0'));
    const expense = round2(parseFloat(raw?.expense ?? '0'));
    const net = round2(income - expense);
    const savingsRate = income > 0 ? Math.max(0, Math.round((net / income) * 100)) : 0;
    return { income, expense, net, savingsRate };
  }

  private async monthly(userId: string, start: string | null): Promise<ReportMonth[]> {
    const qb = this.transactions
      .createQueryBuilder('t')
      .select("to_char(t.date, 'YYYY-MM')", 'month')
      .addSelect(`COALESCE(SUM(CASE WHEN t.type = :income THEN t.amount ELSE 0 END), 0)`, 'income')
      .addSelect(`COALESCE(SUM(CASE WHEN t.type = :expense THEN t.amount ELSE 0 END), 0)`, 'expense')
      .setParameters({ income: TransactionType.INCOME, expense: TransactionType.EXPENSE })
      .groupBy('month')
      .orderBy('month', 'ASC');
    this.applyRange(qb, userId, start);
    const rows = await qb.getRawMany<{ month: string; income: string; expense: string }>();

    return rows.map((r) => {
      const income = round2(parseFloat(r.income));
      const expense = round2(parseFloat(r.expense));
      return { month: r.month, income, expense, net: round2(income - expense) };
    });
  }

  private async categories(userId: string, start: string | null): Promise<ReportCategory[]> {
    const qb = this.transactions
      .createQueryBuilder('t')
      .leftJoin('t.category', 'c')
      .select('COALESCE(c.name, :uncat)', 'name')
      .addSelect('COALESCE(c.color, :gray)', 'color')
      .addSelect('COALESCE(c.icon, :icon)', 'icon')
      .addSelect('SUM(t.amount)', 'total')
      .andWhere('t.type = :expense', { expense: TransactionType.EXPENSE })
      .setParameters({ uncat: 'Uncategorized', gray: '#94a3b8', icon: '❓' })
      .groupBy('c.id')
      .addGroupBy('c.name')
      .addGroupBy('c.color')
      .addGroupBy('c.icon')
      .orderBy('total', 'DESC');
    this.applyRange(qb, userId, start);
    const rows = await qb.getRawMany<{ name: string; color: string; icon: string; total: string }>();

    const top = rows.slice(0, 8).map((r) => ({ ...r, total: round2(parseFloat(r.total)) }));
    const max = Math.max(1, ...top.map((r) => r.total));
    return top.map((r) => ({
      name: r.name,
      color: r.color,
      icon: r.icon,
      total: r.total,
      pct: Math.round((r.total / max) * 100),
    }));
  }

  private async channels(userId: string, start: string | null): Promise<ReportChannel[]> {
    const qb = this.transactions
      .createQueryBuilder('t')
      .select('t.channel', 'channel')
      .addSelect('SUM(t.amount)', 'total')
      .andWhere('t.type = :expense', { expense: TransactionType.EXPENSE })
      .groupBy('t.channel')
      .orderBy('total', 'DESC');
    this.applyRange(qb, userId, start);
    const rows = await qb.getRawMany<{ channel: string; total: string }>();

    const parsed = rows.map((r) => ({ channel: r.channel, total: round2(parseFloat(r.total)) }));
    const sum = parsed.reduce((s, r) => s + r.total, 0) || 1;
    return parsed.map((r) => ({ ...r, pct: Math.round((r.total / sum) * 100) }));
  }
}

function periodStart(period: ReportPeriod): string | null {
  if (period === 'all') return null;
  const months = parseInt(period, 10);
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth() - (months - 1), 1);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
