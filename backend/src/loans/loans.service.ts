import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from './loan.entity';
import { LoanPayment } from './loan-payment.entity';
import {
  CreateLoanDto,
  CreateLoanPaymentDto,
  UpdateLoanDto,
} from './dto/loan.dto';
import { computeLoan, LoanComputation } from './loan-math';

export type LoanWithComputation = Loan & LoanComputation;

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loans: Repository<Loan>,
    @InjectRepository(LoanPayment)
    private readonly payments: Repository<LoanPayment>,
  ) {}

  async findAll(userId: string): Promise<LoanWithComputation[]> {
    const loans = await this.loans.find({
      where: { userId },
      relations: { payments: true },
      order: { createdAt: 'DESC' },
    });
    return loans.map((loan) => this.decorate(loan));
  }

  async findOne(userId: string, id: string): Promise<LoanWithComputation> {
    const loan = await this.loans.findOne({
      where: { id, userId },
      relations: { payments: true },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    loan.payments = (loan.payments ?? []).sort((a, b) =>
      a.date < b.date ? 1 : -1,
    );
    return this.decorate(loan);
  }

  create(userId: string, dto: CreateLoanDto): Promise<Loan> {
    const loan = this.loans.create({ ...dto, userId });
    return this.loans.save(loan);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateLoanDto,
  ): Promise<LoanWithComputation> {
    const loan = await this.loans.findOne({ where: { id, userId } });
    if (!loan) throw new NotFoundException('Loan not found');
    Object.assign(loan, dto);
    await this.loans.save(loan);
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.loans.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Loan not found');
  }

  async addPayment(
    userId: string,
    loanId: string,
    dto: CreateLoanPaymentDto,
  ): Promise<LoanWithComputation> {
    const loan = await this.loans.findOne({ where: { id: loanId, userId } });
    if (!loan) throw new NotFoundException('Loan not found');
    const payment = this.payments.create({ ...dto, loanId });
    await this.payments.save(payment);
    return this.findOne(userId, loanId);
  }

  async removePayment(
    userId: string,
    loanId: string,
    paymentId: string,
  ): Promise<LoanWithComputation> {
    const loan = await this.loans.findOne({ where: { id: loanId, userId } });
    if (!loan) throw new NotFoundException('Loan not found');
    await this.payments.delete({ id: paymentId, loanId });
    return this.findOne(userId, loanId);
  }

  private decorate(loan: Loan): LoanWithComputation {
    const totalPaid = (loan.payments ?? []).reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );
    const computation = computeLoan(
      loan.principal,
      loan.interestRate,
      loan.termMonths,
      loan.interestType,
      totalPaid,
    );
    return { ...loan, ...computation };
  }
}
