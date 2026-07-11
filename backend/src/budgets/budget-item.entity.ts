import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';
import { Budget } from './budget.entity';

@Entity('budget_items')
export class BudgetItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  budgetId: string;

  @ManyToOne(() => Budget, (b) => b.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budgetId' })
  budget: Budget;

  /** Optional link to a category so spend can be tracked against the limit. */
  @Column('uuid', { nullable: true })
  categoryId: string;

  @Column()
  label: string;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  limitAmount: number;

  @Column({ default: '💸' })
  icon: string;

  @Column({ default: '#64748b' })
  color: string;
}
