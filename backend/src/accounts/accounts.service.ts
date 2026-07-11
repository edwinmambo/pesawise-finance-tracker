import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './account.entity';
import { Transaction } from '../transactions/transaction.entity';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';
import { TransactionType } from '../common/enums';

export interface AccountWithBalance extends Account {
  currentBalance: number;
}

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accounts: Repository<Account>,
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
  ) {}

  async findAll(userId: string): Promise<AccountWithBalance[]> {
    const accounts = await this.accounts.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    const deltas = await this.balanceDeltas(userId);
    return accounts.map((a) => ({
      ...a,
      currentBalance:
        Math.round((a.openingBalance + (deltas.get(a.id) ?? 0)) * 100) / 100,
    }));
  }

  async findOne(userId: string, id: string): Promise<AccountWithBalance> {
    const account = await this.accounts.findOne({ where: { id, userId } });
    if (!account) throw new NotFoundException('Account not found');
    const deltas = await this.balanceDeltas(userId);
    return {
      ...account,
      currentBalance:
        Math.round(
          (account.openingBalance + (deltas.get(account.id) ?? 0)) * 100,
        ) / 100,
    };
  }

  create(userId: string, dto: CreateAccountDto): Promise<Account> {
    const account = this.accounts.create({
      ...dto,
      openingBalance: dto.openingBalance ?? 0,
      userId,
    });
    return this.accounts.save(account);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAccountDto,
  ): Promise<Account> {
    const account = await this.accounts.findOne({ where: { id, userId } });
    if (!account) throw new NotFoundException('Account not found');
    Object.assign(account, dto);
    return this.accounts.save(account);
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.accounts.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Account not found');
  }

  /** Net transaction impact per account (income - expense). */
  private async balanceDeltas(userId: string): Promise<Map<string, number>> {
    const rows = await this.transactions
      .createQueryBuilder('t')
      .select('t.accountId', 'accountId')
      .addSelect(
        `SUM(CASE WHEN t.type = :income THEN t.amount ELSE -t.amount END)`,
        'delta',
      )
      .where('t.userId = :userId', { userId })
      .andWhere('t.accountId IS NOT NULL')
      .setParameter('income', TransactionType.INCOME)
      .groupBy('t.accountId')
      .getRawMany<{ accountId: string; delta: string }>();

    const map = new Map<string, number>();
    for (const row of rows) map.set(row.accountId, parseFloat(row.delta));
    return map;
  }
}
