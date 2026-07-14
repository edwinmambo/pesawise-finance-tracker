import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from './budget.entity';
import { BudgetItem } from './budget-item.entity';
import { Category } from '../categories/category.entity';
import { Transaction } from '../transactions/transaction.entity';
import { BudgetPlanType, CategoryKind, TransactionType } from '../common/enums';
import {
  ApplyTemplateDto,
  CreateBudgetDto,
  UpdateBudgetDto,
} from './dto/budget.dto';
import { BUDGET_TEMPLATES, findTemplate } from './budget-templates';

export interface BudgetItemWithSpend extends BudgetItem {
  spent: number;
  remaining: number;
  progress: number; // 0..1 (can exceed via `over`)
  over: boolean;
}

export interface BudgetWithProgress extends Budget {
  items: BudgetItemWithSpend[];
  totalLimit: number;
  totalSpent: number;
  totalRemaining: number;
  progress: number;
}

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgets: Repository<Budget>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
  ) {}

  /** The premade plans, for the frontend picker. */
  templates() {
    return BUDGET_TEMPLATES;
  }

  async findAll(userId: string): Promise<BudgetWithProgress[]> {
    const budgets = await this.budgets.find({
      where: { userId },
      relations: { items: true },
      order: { createdAt: 'ASC' },
    });
    const spendByCategory = await this.monthSpendByCategory(userId);
    return budgets.map((b) => this.decorate(b, spendByCategory));
  }

  async findOne(userId: string, id: string): Promise<BudgetWithProgress> {
    const budget = await this.budgets.findOne({
      where: { id, userId },
      relations: { items: true },
    });
    if (!budget) throw new NotFoundException('Budget not found');
    const spendByCategory = await this.monthSpendByCategory(userId);
    return this.decorate(budget, spendByCategory);
  }

  async create(userId: string, dto: CreateBudgetDto): Promise<BudgetWithProgress> {
    if (dto.isActive !== false) await this.deactivateAll(userId);
    const budget = this.budgets.create({
      userId,
      name: dto.name,
      planType: dto.planType ?? BudgetPlanType.CUSTOM,
      expectedIncome: dto.expectedIncome ?? 0,
      icon: dto.icon ?? '📋',
      color: dto.color ?? '#10a37f',
      currency: dto.currency ?? 'KES',
      isActive: dto.isActive ?? true,
      items: dto.items.map((i) =>
        this.budgets.manager.create(BudgetItem, {
          categoryId: i.categoryId,
          label: i.label,
          limitAmount: i.limitAmount,
          icon: i.icon ?? '💸',
          color: i.color ?? '#64748b',
        }),
      ),
    });
    const saved = await this.budgets.save(budget);
    return this.findOne(userId, saved.id);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateBudgetDto,
  ): Promise<BudgetWithProgress> {
    const budget = await this.budgets.findOne({
      where: { id, userId },
      relations: { items: true },
    });
    if (!budget) throw new NotFoundException('Budget not found');

    if (dto.isActive) await this.deactivateAll(userId);
    if (dto.name !== undefined) budget.name = dto.name;
    if (dto.expectedIncome !== undefined) budget.expectedIncome = dto.expectedIncome;
    if (dto.icon !== undefined) budget.icon = dto.icon;
    if (dto.color !== undefined) budget.color = dto.color;
    if (dto.isActive !== undefined) budget.isActive = dto.isActive;

    if (dto.items) {
      // Replace the item set wholesale (cascade + orphan cleanup).
      await this.budgets.manager.delete(BudgetItem, { budgetId: budget.id });
      budget.items = dto.items.map((i) =>
        this.budgets.manager.create(BudgetItem, {
          budgetId: budget.id,
          categoryId: i.categoryId,
          label: i.label,
          limitAmount: i.limitAmount,
          icon: i.icon ?? '💸',
          color: i.color ?? '#64748b',
        }),
      );
    }
    await this.budgets.save(budget);
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.budgets.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Budget not found');
  }

  /** Instantiate a premade plan for the user, mapping items to real categories. */
  async applyTemplate(
    userId: string,
    dto: ApplyTemplateDto,
  ): Promise<BudgetWithProgress> {
    const template = findTemplate(dto.planType);
    if (!template) throw new NotFoundException('Unknown budget plan');

    await this.deactivateAll(userId);
    const items: BudgetItem[] = [];
    for (const ti of template.items) {
      const category = await this.ensureCategory(
        userId,
        ti.category,
        ti.icon,
        ti.color,
      );
      items.push(
        this.budgets.manager.create(BudgetItem, {
          categoryId: category.id,
          label: ti.category,
          limitAmount: ti.limit,
          icon: ti.icon,
          color: ti.color,
        }),
      );
    }
    const budget = this.budgets.create({
      userId,
      name: template.name,
      planType: template.planType,
      expectedIncome: template.expectedIncome,
      icon: template.icon,
      color: template.color,
      isActive: true,
      items,
    });
    const saved = await this.budgets.save(budget);
    return this.findOne(userId, saved.id);
  }

  /** Find an existing expense category by name, or create one. */
  private async ensureCategory(
    userId: string,
    name: string,
    icon: string,
    color: string,
  ): Promise<Category> {
    const existing = await this.categories.findOne({
      where: { userId, name },
    });
    if (existing) return existing;
    return this.categories.save(
      this.categories.create({
        userId,
        name,
        kind: CategoryKind.EXPENSE,
        icon,
        color,
      }),
    );
  }

  private async deactivateAll(userId: string): Promise<void> {
    await this.budgets.update({ userId }, { isActive: false });
  }

  /** Sum of EXPENSE transactions in the current calendar month, keyed by categoryId. */
  private async monthSpendByCategory(
    userId: string,
  ): Promise<Map<string, number>> {
    const now = new Date();
    const monthStart = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
    const rows = await this.transactions
      .createQueryBuilder('t')
      .select('t.categoryId', 'categoryId')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.userId = :userId', { userId })
      .andWhere('t.type = :expense', { expense: TransactionType.EXPENSE })
      .andWhere('t.categoryId IS NOT NULL')
      .andWhere('t.date >= :monthStart', { monthStart })
      .groupBy('t.categoryId')
      .getRawMany<{ categoryId: string; total: string }>();

    const map = new Map<string, number>();
    for (const r of rows) map.set(r.categoryId, parseFloat(r.total));
    return map;
  }

  private decorate(
    budget: Budget,
    spendByCategory: Map<string, number>,
  ): BudgetWithProgress {
    const items: BudgetItemWithSpend[] = (budget.items ?? [])
      .sort((a, b) => b.limitAmount - a.limitAmount)
      .map((item) => {
        const spent = item.categoryId
          ? round2(spendByCategory.get(item.categoryId) ?? 0)
          : 0;
        const remaining = round2(item.limitAmount - spent);
        const progress =
          item.limitAmount > 0 ? spent / item.limitAmount : spent > 0 ? 1 : 0;
        return {
          ...item,
          spent,
          remaining,
          progress: Math.round(progress * 1000) / 1000,
          over: spent > item.limitAmount,
        };
      });

    const totalLimit = round2(items.reduce((s, i) => s + i.limitAmount, 0));
    const totalSpent = round2(items.reduce((s, i) => s + i.spent, 0));
    return {
      ...budget,
      items,
      totalLimit,
      totalSpent,
      totalRemaining: round2(totalLimit - totalSpent),
      progress:
        totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 1000) / 1000 : 0,
    };
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
