import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Channel, TransactionType } from '../common/enums';
import { numericTransformer } from '../common/numeric.transformer';
import { User } from '../users/user.entity';
import { Account } from '../accounts/account.entity';
import { Category } from '../categories/category.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    transformer: numericTransformer,
  })
  amount: number;

  @Index()
  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: Channel, default: Channel.MPESA })
  channel: Channel;

  @Column({ nullable: true })
  note: string;

  /** M-Pesa / bank reference code (e.g. "SLK4TX9QAZ"). */
  @Column({ nullable: true })
  reference: string;

  // Links the two rows of a transfer (TRANSFER_OUT + TRANSFER_IN). Dormant
  // until Phase 4; null for every ordinary income/expense row.
  @Index()
  @Column('uuid', { nullable: true })
  transferGroupId: string | null;

  @Column('uuid', { nullable: true })
  accountId: string;

  @ManyToOne(() => Account, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column('uuid', { nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @CreateDateColumn()
  createdAt: Date;
}
