import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InterestType, LenderType, LoanStatus } from '../common/enums';
import { numericTransformer } from '../common/numeric.transformer';
import { User } from '../users/user.entity';
import { LoanPayment } from './loan-payment.entity';

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  lender: string;

  @Column({ type: 'enum', enum: LenderType, default: LenderType.BANK })
  lenderType: LenderType;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    transformer: numericTransformer,
  })
  principal: number;

  /** Annual interest rate as a percentage, e.g. 14.5 */
  @Column({
    type: 'decimal',
    precision: 6,
    scale: 3,
    default: 0,
    transformer: numericTransformer,
  })
  interestRate: number;

  @Column({ type: 'enum', enum: InterestType, default: InterestType.REDUCING })
  interestType: InterestType;

  /** Loan term in months. */
  @Column({ type: 'int', default: 12 })
  termMonths: number;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  dueDate: string;

  @Column({ type: 'enum', enum: LoanStatus, default: LoanStatus.ACTIVE })
  status: LoanStatus;

  @OneToMany(() => LoanPayment, (payment) => payment.loan)
  payments: LoanPayment[];

  @CreateDateColumn()
  createdAt: Date;
}
