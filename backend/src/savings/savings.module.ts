import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavingsGoal } from './savings-goal.entity';
import { SavingsContribution } from './savings-contribution.entity';
import { SavingsService } from './savings.service';
import { SavingsController } from './savings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SavingsGoal, SavingsContribution])],
  providers: [SavingsService],
  controllers: [SavingsController],
  exports: [SavingsService],
})
export class SavingsModule {}
