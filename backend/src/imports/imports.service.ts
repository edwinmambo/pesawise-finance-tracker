import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ImportBatch } from './import-batch.entity';
import { ImportRow } from './import-row.entity';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { Channel, ImportRowStatus, ImportSource, TransactionType } from '../common/enums';
import { CreateImportDto } from './dto/import.dto';
import { parseMpesaSms, MpesaParseResult } from './mpesa-parser';
import { parseMpesaCsv } from './mpesa-csv';

export interface ImportPreview {
  batch: ImportBatch;
  unparsed: string[];
}

@Injectable()
export class ImportsService {
  constructor(
    @InjectRepository(ImportBatch)
    private readonly batches: Repository<ImportBatch>,
    @InjectRepository(ImportRow)
    private readonly rows: Repository<ImportRow>,
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    private readonly txService: TransactionsService,
  ) {}

  /** Parse + dedup + stage. Nothing is written to `transactions` yet. */
  async preview(userId: string, dto: CreateImportDto): Promise<ImportPreview> {
    const { rows: parsed, unparsed }: MpesaParseResult =
      dto.source === ImportSource.MPESA_CSV ? parseMpesaCsv(dto.raw) : parseMpesaSms(dto.raw);

    // References already in the ledger → duplicates.
    const refs = parsed.map((p) => p.reference).filter(Boolean);
    const existing = refs.length
      ? await this.transactions.find({
          where: { userId, reference: In(refs) },
          select: { id: true, reference: true },
        })
      : [];
    const seen = new Set(existing.map((t) => t.reference));

    let duplicateCount = 0;
    const rows = parsed.map((p) => {
      // Dedup within the same paste too (first wins).
      const isDup = seen.has(p.reference);
      if (isDup) duplicateCount++;
      else seen.add(p.reference);
      return this.rows.create({
        reference: p.reference,
        type: p.type as TransactionType,
        amount: p.amount,
        date: p.date,
        channel: p.channel as Channel,
        note: p.note ?? null,
        raw: p.raw,
        status: isDup ? ImportRowStatus.DUPLICATE : ImportRowStatus.NEW,
      });
    });

    const batch = await this.batches.save(
      this.batches.create({
        userId,
        source: dto.source,
        parsedCount: parsed.length,
        duplicateCount,
        unparsedCount: unparsed.length,
        rows,
      }),
    );

    return { batch: await this.findOne(userId, batch.id), unparsed };
  }

  async findOne(userId: string, id: string): Promise<ImportBatch> {
    const batch = await this.batches.findOne({
      where: { id, userId },
      relations: { rows: true },
    });
    if (!batch) throw new NotFoundException('Import not found');
    batch.rows.sort((a, b) => a.date.localeCompare(b.date));
    return batch;
  }

  list(userId: string): Promise<ImportBatch[]> {
    return this.batches.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  /** Write the NEW (optionally filtered) rows to the ledger. Idempotent per row. */
  async commit(userId: string, id: string, rowIds?: string[]): Promise<ImportBatch> {
    const batch = await this.findOne(userId, id);
    const wanted = rowIds ? new Set(rowIds) : null;

    let committedCount = batch.committedCount;
    for (const row of batch.rows) {
      if (row.status !== ImportRowStatus.NEW) continue;
      if (wanted && !wanted.has(row.id)) continue;

      await this.txService.create(userId, {
        type: row.type,
        amount: row.amount,
        date: row.date,
        channel: row.channel,
        note: row.note ?? undefined,
        reference: row.reference ?? undefined,
      });
      row.status = ImportRowStatus.COMMITTED;
      committedCount++;
      await this.rows.save(row);
    }

    batch.committed = true;
    batch.committedCount = committedCount;
    await this.batches.save(batch);
    return this.findOne(userId, id);
  }
}
