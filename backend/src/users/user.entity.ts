import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column()
  name: string;

  @Column({ default: 'KES' })
  currency: string;

  /** Short label describing the persona, e.g. "University student · Comrade". */
  @Column({ nullable: true })
  persona: string;

  /** One-line story shown on the login persona cards. */
  @Column({ nullable: true })
  tagline: string;

  /** Avatar gradient seed colour. */
  @Column({ default: '#10a37f' })
  avatarColor: string;

  @CreateDateColumn()
  createdAt: Date;
}
