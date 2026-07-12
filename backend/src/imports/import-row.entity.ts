import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Channel, ImportRowStatus, TransactionType } from '../common/enums';
import { numericTransformer } from '../common/numeric.transformer';
import { ImportBatch } from './import-batch.entity';

/** A single staged transaction parsed from an import, awaiting commit. */
@Entity('import_rows')
export class ImportRow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  batchId: string;

  @ManyToOne(() => ImportBatch, (batch) => batch.rows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batchId' })
  batch: ImportBatch;

  @Column({ type: 'varchar', nullable: true })
  reference: string | null;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer })
  amount: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: Channel, default: Channel.MPESA })
  channel: Channel;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @Column({ type: 'text' })
  raw: string;

  @Column({ type: 'enum', enum: ImportRowStatus, default: ImportRowStatus.NEW })
  status: ImportRowStatus;
}
