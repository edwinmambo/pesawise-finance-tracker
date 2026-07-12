import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccountType } from '../common/enums';
import { numericTransformer } from '../common/numeric.transformer';
import { User } from '../users/user.entity';

@Entity('accounts')
export class Account {
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

  @Column({ type: 'enum', enum: AccountType })
  type: AccountType;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  openingBalance: number;

  @Column({ nullable: true })
  institution: string;

  @Column({ default: '#2563eb' })
  color: string;

  // Per-account currency. Dormant until Phase 4 (FX): every account is KES today
  // and the app still formats by the user's display currency only.
  @Column({ default: 'KES' })
  currency: string;

  @CreateDateColumn()
  createdAt: Date;
}
