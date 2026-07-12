import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cadence, Channel, TransactionType } from '../common/enums';
import { numericTransformer } from '../common/numeric.transformer';

/** A rule that materialises a transaction on a schedule (bills, salary, rent…). */
@Entity('recurring_rules')
export class RecurringRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer })
  amount: number;

  @Column({ type: 'enum', enum: Channel, default: Channel.MPESA })
  channel: Channel;

  @Column('uuid', { nullable: true })
  categoryId: string | null;

  @Column('uuid', { nullable: true })
  accountId: string | null;

  @Column({ type: 'enum', enum: Cadence })
  cadence: Cadence;

  /** Day-of-month (1–31) for MONTHLY, or day-of-week (0=Sun–6) for WEEKLY. */
  @Column({ type: 'int' })
  anchorDay: number;

  @Column({ type: 'date' })
  nextRunAt: string;

  @Column({ type: 'date', nullable: true })
  lastRunAt: string | null;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
