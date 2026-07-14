import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { BudgetsModule } from '../budgets/budgets.module';
import { LoansModule } from '../loans/loans.module';
import { SavingsModule } from '../savings/savings.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification]), BudgetsModule, LoansModule, SavingsModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
