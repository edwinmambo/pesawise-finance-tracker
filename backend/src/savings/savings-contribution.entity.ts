import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';
import { SavingsGoal } from './savings-goal.entity';

@Entity('savings_contributions')
export class SavingsContribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  goalId: string;

  @ManyToOne(() => SavingsGoal, (goal) => goal.contributions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'goalId' })
  goal: SavingsGoal;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    transformer: numericTransformer,
  })
  amount: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;
}
