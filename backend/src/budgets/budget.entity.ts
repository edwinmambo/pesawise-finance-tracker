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
import { BudgetPlanType } from '../common/enums';
import { numericTransformer } from '../common/numeric.transformer';
import { User } from '../users/user.entity';
import { BudgetItem } from './budget-item.entity';

@Entity('budgets')
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: BudgetPlanType, default: BudgetPlanType.CUSTOM })
  planType: BudgetPlanType;

  /** Planned monthly income this budget is built around. */
  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  expectedIncome: number;

  @Column({ default: '📋' })
  icon: string;

  @Column({ default: '#10a37f' })
  color: string;

  /** Only one budget is "active" (drives the dashboard widget) at a time. */
  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => BudgetItem, (i) => i.budget, { cascade: true })
  items: BudgetItem[];

  @CreateDateColumn()
  createdAt: Date;
}
