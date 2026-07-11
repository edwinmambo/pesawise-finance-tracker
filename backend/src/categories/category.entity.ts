import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CategoryKind } from '../common/enums';
import { User } from '../users/user.entity';

@Entity('categories')
export class Category {
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

  @Column({ type: 'enum', enum: CategoryKind })
  kind: CategoryKind;

  @Column({ default: '💰' })
  icon: string;

  @Column({ default: '#64748b' })
  color: string;

  @Column({ default: false })
  isSystem: boolean;
}
