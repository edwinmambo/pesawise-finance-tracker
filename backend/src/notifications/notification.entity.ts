import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * A persisted, per-user notification (budget overrun, loan due soon, goal
 * reached…). `dedupeKey` makes generation idempotent — the same real-world
 * event never creates two rows for a user.
 */
@Entity('notifications')
@Index(['userId', 'dedupeKey'], { unique: true })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  type: string; // 'budget' | 'loan' | 'savings' | 'system'

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ default: '🔔' })
  icon: string;

  @Column({ nullable: true })
  link: string;

  @Column()
  dedupeKey: string;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
