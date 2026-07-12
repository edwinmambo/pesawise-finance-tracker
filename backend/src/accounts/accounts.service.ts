import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Account } from './account.entity';
import { Transaction } from '../transactions/transaction.entity';
import { CreateAccountDto, TransferDto, UpdateAccountDto } from './dto/account.dto';
import { Channel, TransactionType } from '../common/enums';
import { FxService } from '../common/fx.service';

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
    private readonly fx: FxService,
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

  /**
   * Net transaction impact per account. Income and transfers-in add; expenses
   * and transfers-out subtract — so a transfer nets to zero across the two
   * accounts and never affects total net worth.
   */
  private async balanceDeltas(userId: string): Promise<Map<string, number>> {
    const rows = await this.transactions
      .createQueryBuilder('t')
      .select('t.accountId', 'accountId')
      .addSelect(
        `SUM(CASE WHEN t.type IN (:income, :transferIn) THEN t.amount ELSE -t.amount END)`,
        'delta',
      )
      .where('t.userId = :userId', { userId })
      .andWhere('t.accountId IS NOT NULL')
      .setParameters({
        income: TransactionType.INCOME,
        transferIn: TransactionType.TRANSFER_IN,
      })
      .groupBy('t.accountId')
      .getRawMany<{ accountId: string; delta: string }>();

    const map = new Map<string, number>();
    for (const row of rows) map.set(row.accountId, parseFloat(row.delta));
    return map;
  }

  /**
   * Move money between two of the user's accounts as an atomic linked pair
   * (TRANSFER_OUT + TRANSFER_IN sharing a transferGroupId). Cross-currency
   * transfers convert the destination leg via {@link FxService}.
   */
  async transfer(userId: string, dto: TransferDto) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Choose two different accounts');
    }
    const from = await this.accounts.findOne({ where: { id: dto.fromAccountId, userId } });
    const to = await this.accounts.findOne({ where: { id: dto.toAccountId, userId } });
    if (!from || !to) throw new NotFoundException('Account not found');

    const transferGroupId = randomUUID();
    const sourceAmount = Math.round(dto.amount * 100) / 100;
    const destAmount = this.fx.convert(sourceAmount, from.currency, to.currency);
    const channel = dto.channel ?? Channel.MPESA;
    const note = dto.note ?? `Transfer: ${from.name} → ${to.name}`;

    await this.transactions.manager.transaction(async (em) => {
      const out = em.create(Transaction, {
        userId,
        type: TransactionType.TRANSFER_OUT,
        amount: sourceAmount,
        date: dto.date,
        channel,
        accountId: from.id,
        transferGroupId,
        note,
      });
      const income = em.create(Transaction, {
        userId,
        type: TransactionType.TRANSFER_IN,
        amount: destAmount,
        date: dto.date,
        channel,
        accountId: to.id,
        transferGroupId,
        note,
      });
      await em.save([out, income]);
    });

    return {
      transferGroupId,
      from: await this.findOne(userId, from.id),
      to: await this.findOne(userId, to.id),
    };
  }
}
