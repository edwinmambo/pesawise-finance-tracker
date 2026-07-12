import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './transaction.entity';
import {
  CreateTransactionDto,
  QueryTransactionsDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
  ) {}

  findAll(userId: string, query: QueryTransactionsDto): Promise<Transaction[]> {
    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .leftJoinAndSelect('t.account', 'account')
      .where('t.userId = :userId', { userId });

    if (query.type) qb.andWhere('t.type = :type', { type: query.type });
    if (query.channel)
      qb.andWhere('t.channel = :channel', { channel: query.channel });
    if (query.categoryId)
      qb.andWhere('t.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    if (query.accountId)
      qb.andWhere('t.accountId = :accountId', { accountId: query.accountId });
    if (query.from) qb.andWhere('t.date >= :from', { from: query.from });
    if (query.to) qb.andWhere('t.date <= :to', { to: query.to });
    if (query.search)
      qb.andWhere('(t.note ILIKE :s OR t.reference ILIKE :s)', {
        s: `%${query.search}%`,
      });

    return qb
      .orderBy('t.date', 'DESC')
      .addOrderBy('t.createdAt', 'DESC')
      .getMany();
  }

  async findOne(userId: string, id: string): Promise<Transaction> {
    const tx = await this.repo.findOne({
      where: { id, userId },
      relations: { category: true, account: true },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    return tx;
  }

  create(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const tx = this.repo.create({ ...dto, userId });
    return this.repo.save(tx);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const tx = await this.repo.findOne({ where: { id, userId } });
    if (!tx) throw new NotFoundException('Transaction not found');
    Object.assign(tx, dto);
    await this.repo.save(tx);
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    const tx = await this.repo.findOne({ where: { id, userId } });
    if (!tx) throw new NotFoundException('Transaction not found');
    // Deleting one leg of a transfer removes both, keeping balances consistent.
    if (tx.transferGroupId) {
      await this.repo.delete({ userId, transferGroupId: tx.transferGroupId });
    } else {
      await this.repo.delete({ id, userId });
    }
  }
}
