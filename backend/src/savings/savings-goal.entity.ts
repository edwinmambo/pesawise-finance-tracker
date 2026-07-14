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
import { numericTransformer } from '../common/numeric.transformer';
import { User } from '../users/user.entity';
import { SavingsContribution } from './savings-contribution.entity';

@Entity('savings_goals')
export class SavingsGoal {
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

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    transformer: numericTransformer,
  })
  targetAmount: number;

  @Column({ type: 'date', nullable: true })
  targetDate: string;

  @Column({ default: '🎯' })
  icon: string;

  @Column({ default: '#16a34a' })
  color: string;

  /** Display currency for this goal's amounts. */
  @Column({ default: 'KES' })
  currency: string;

  @OneToMany(() => SavingsContribution, (c) => c.goal)
  contributions: SavingsContribution[];

  @CreateDateColumn()
  createdAt: Date;
}
