import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { AccountsModule } from '../accounts/accounts.module';
import { LoansModule } from '../loans/loans.module';
import { SavingsModule } from '../savings/savings.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    AccountsModule,
    LoansModule,
    SavingsModule,
    UsersModule,
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
