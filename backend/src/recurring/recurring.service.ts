import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { RecurringRule } from './recurring-rule.entity';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateRecurringDto, UpdateRecurringDto } from './dto/recurring.dto';
import { advanceRun, computeNextRun, ymd } from './recurring-schedule';

export interface UpcomingOccurrence {
  ruleId: string;
  name: string;
  type: string;
  amount: number;
  channel: string;
  date: string;
}

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    @InjectRepository(RecurringRule)
    private readonly rules: Repository<RecurringRule>,
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    private readonly txService: TransactionsService,
  ) {}

  findAll(userId: string): Promise<RecurringRule[]> {
    return this.rules.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  async findOne(userId: string, id: string): Promise<RecurringRule> {
    const rule = await this.rules.findOne({ where: { id, userId } });
    if (!rule) throw new NotFoundException('Recurring rule not found');
    return rule;
  }

  create(userId: string, dto: CreateRecurringDto): Promise<RecurringRule> {
    const from = dto.startDate ?? this.today();
    const rule = this.rules.create({
      userId,
      name: dto.name,
      type: dto.type,
      amount: dto.amount,
      channel: dto.channel,
      categoryId: dto.categoryId ?? null,
      accountId: dto.accountId ?? null,
      cadence: dto.cadence,
      anchorDay: dto.anchorDay,
      note: dto.note ?? null,
      active: true,
      nextRunAt: computeNextRun(dto.cadence, dto.anchorDay, from),
    });
    return this.rules.save(rule);
  }

  async update(userId: string, id: string, dto: UpdateRecurringDto): Promise<RecurringRule> {
    const rule = await this.findOne(userId, id);
    Object.assign(rule, {
      ...dto,
      categoryId: dto.categoryId === undefined ? rule.categoryId : dto.categoryId,
      accountId: dto.accountId === undefined ? rule.accountId : dto.accountId,
    });
    // Reschedule if the cadence/anchor/start changed.
    if (dto.cadence || dto.anchorDay !== undefined || dto.startDate) {
      rule.nextRunAt = computeNextRun(rule.cadence, rule.anchorDay, dto.startDate ?? this.today());
    }
    return this.rules.save(rule);
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.rules.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Recurring rule not found');
  }

  /** Projected occurrences within the next `days`, for calendar reminders. */
  async upcoming(userId: string, days = 30): Promise<UpcomingOccurrence[]> {
    const today = this.today();
    const end = ymd(addDays(new Date(), days));
    const rules = await this.rules.find({ where: { userId, active: true } });

    const out: UpcomingOccurrence[] = [];
    for (const rule of rules) {
      const startFrom = rule.nextRunAt > today ? rule.nextRunAt : today;
      let cursor = computeNextRun(rule.cadence, rule.anchorDay, startFrom);
      let guard = 0;
      while (cursor <= end && guard++ < 60) {
        out.push({
          ruleId: rule.id,
          name: rule.name,
          type: rule.type,
          amount: rule.amount,
          channel: rule.channel,
          date: cursor,
        });
        cursor = advanceRun(rule.cadence, rule.anchorDay, cursor);
      }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Daily job: materialise every rule that is due. */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async runDueCron(): Promise<void> {
    const created = await this.runDue();
    if (created > 0) this.logger.log(`Materialised ${created} recurring transaction(s).`);
  }

  /**
   * Materialise all rules due on/before `today`, catching up any missed
   * occurrences. Idempotent: each generated transaction carries a synthetic
   * reference `RULE:<id>:<date>`, so re-running never double-posts.
   * Pass `userId` to scope to one user (manual "run now").
   */
  async runDue(userId?: string, today: string = this.today()): Promise<number> {
    const due = await this.rules.find({
      where: {
        active: true,
        nextRunAt: LessThanOrEqual(today),
        ...(userId ? { userId } : {}),
      },
    });

    let created = 0;
    for (const rule of due) {
      let guard = 0;
      while (rule.nextRunAt <= today && guard++ < 60) {
        const reference = `RULE:${rule.id}:${rule.nextRunAt}`;
        const exists = await this.transactions.findOne({
          where: { userId: rule.userId, reference },
        });
        if (!exists) {
          await this.txService.create(rule.userId, {
            type: rule.type,
            amount: rule.amount,
            date: rule.nextRunAt,
            channel: rule.channel,
            categoryId: rule.categoryId ?? undefined,
            accountId: rule.accountId ?? undefined,
            reference,
            note: rule.note ?? rule.name,
          });
          created++;
        }
        rule.lastRunAt = rule.nextRunAt;
        rule.nextRunAt = advanceRun(rule.cadence, rule.anchorDay, rule.nextRunAt);
      }
      await this.rules.save(rule);
    }
    return created;
  }

  private today(): string {
    return ymd(new Date());
  }
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}
