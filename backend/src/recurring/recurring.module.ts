import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecurringRule } from './recurring-rule.entity';
import { Transaction } from '../transactions/transaction.entity';
import { RecurringService } from './recurring.service';
import { RecurringController } from './recurring.controller';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecurringRule, Transaction]),
    TransactionsModule,
  ],
  providers: [RecurringService],
  controllers: [RecurringController],
})
export class RecurringModule {}
