import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportBatch } from './import-batch.entity';
import { ImportRow } from './import-row.entity';
import { Transaction } from '../transactions/transaction.entity';
import { ImportsService } from './imports.service';
import { ImportsController } from './imports.controller';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ImportBatch, ImportRow, Transaction]),
    TransactionsModule,
  ],
  providers: [ImportsService],
  controllers: [ImportsController],
})
export class ImportsModule {}
