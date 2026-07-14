import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { BudgetsService } from '../budgets/budgets.service';
import { LoansService } from '../loans/loans.service';
import { SavingsService } from '../savings/savings.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
    private readonly budgets: BudgetsService,
    private readonly loans: LoansService,
    private readonly savings: SavingsService,
  ) {}

  /** Refresh derived notifications, then return the user's list (newest first). */
  async listForUser(userId: string): Promise<Notification[]> {
    await this.generate(userId);
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 50 });
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.repo.count({ where: { userId, read: false } });
    return { count };
  }

  async markRead(userId: string, id: string): Promise<{ ok: boolean }> {
    await this.repo.update({ id, userId }, { read: true });
    return { ok: true };
  }

  async markAllRead(userId: string): Promise<{ ok: boolean }> {
    await this.repo.update({ userId, read: false }, { read: true });
    return { ok: true };
  }

  /** Insert only if this (userId, dedupeKey) hasn't been recorded before. */
  private async add(userId: string, n: Partial<Notification>): Promise<void> {
    const exists = await this.repo.findOne({ where: { userId, dedupeKey: n.dedupeKey } });
    if (exists) return;
    await this.repo.insert({ userId, read: false, icon: '🔔', ...n });
  }

  /**
   * Derive notifications from the user's current state — self-contained, so we
   * don't need event hooks across every module. Idempotent via dedupeKey.
   */
  async generate(userId: string): Promise<void> {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Budget overrun (active budget)
    const budgets = (await this.budgets.findAll(userId)) as any[];
    const active = budgets.find((b) => b.isActive) ?? budgets[0];
    if (active && active.totalLimit > 0 && active.totalSpent > active.totalLimit) {
      await this.add(userId, {
        type: 'budget', icon: '⚠️', title: 'Budget exceeded',
        body: `You've gone over your ${active.name} budget this month.`,
        link: '/budgets', dedupeKey: `budget-over:${active.id}:${month}`,
      });
    }

    // Loans due within the next two weeks
    const loans = (await this.loans.findAll(userId)) as any[];
    const now = Date.now();
    for (const l of loans) {
      if (l.status !== 'ACTIVE' || !l.dueDate) continue;
      const days = Math.ceil((new Date(l.dueDate).getTime() - now) / 86_400_000);
      if (days >= 0 && days <= 14) {
        await this.add(userId, {
          type: 'loan', icon: '🏦', title: 'Loan due soon',
          body: `Your ${l.lender} loan is due in ${days} day${days === 1 ? '' : 's'}.`,
          link: '/loans', dedupeKey: `loan-due:${l.id}:${l.dueDate}`,
        });
      }
    }

    // Savings goals reached
    const goals = (await this.savings.findAll(userId)) as any[];
    for (const g of goals) {
      const progress = g.progress ?? (g.targetAmount ? g.savedAmount / g.targetAmount : 0);
      if (progress >= 1) {
        await this.add(userId, {
          type: 'savings', icon: '🎉', title: 'Goal reached!',
          body: `You hit your ${g.name} savings goal — nicely done.`,
          link: '/savings', dedupeKey: `goal-done:${g.id}`,
        });
      }
    }
  }
}
