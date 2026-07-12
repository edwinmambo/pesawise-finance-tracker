import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ImportSource } from '../common/enums';
import { ImportRow } from './import-row.entity';

/** One paste/upload of M-Pesa data, staged for preview before it is committed. */
@Entity('import_batches')
export class ImportBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: ImportSource })
  source: ImportSource;

  @Column({ default: false })
  committed: boolean;

  @Column({ type: 'int', default: 0 })
  parsedCount: number;

  @Column({ type: 'int', default: 0 })
  duplicateCount: number;

  @Column({ type: 'int', default: 0 })
  unparsedCount: number;

  @Column({ type: 'int', default: 0 })
  committedCount: number;

  @OneToMany(() => ImportRow, (row) => row.batch, { cascade: true })
  rows: ImportRow[];

  @CreateDateColumn()
  createdAt: Date;
}
