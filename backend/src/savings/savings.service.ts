import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavingsGoal } from './savings-goal.entity';
import { SavingsContribution } from './savings-contribution.entity';
import {
  CreateContributionDto,
  CreateSavingsGoalDto,
  UpdateSavingsGoalDto,
} from './dto/savings.dto';

export interface SavingsGoalWithProgress extends SavingsGoal {
  savedAmount: number;
  remaining: number;
  progress: number; // 0..1
}

@Injectable()
export class SavingsService {
  constructor(
    @InjectRepository(SavingsGoal)
    private readonly goals: Repository<SavingsGoal>,
    @InjectRepository(SavingsContribution)
    private readonly contributions: Repository<SavingsContribution>,
  ) {}

  async findAll(userId: string): Promise<SavingsGoalWithProgress[]> {
    const goals = await this.goals.find({
      where: { userId },
      relations: { contributions: true },
      order: { createdAt: 'ASC' },
    });
    return goals.map((g) => this.decorate(g));
  }

  async findOne(userId: string, id: string): Promise<SavingsGoalWithProgress> {
    const goal = await this.goals.findOne({
      where: { id, userId },
      relations: { contributions: true },
    });
    if (!goal) throw new NotFoundException('Savings goal not found');
    goal.contributions = (goal.contributions ?? []).sort((a, b) =>
      a.date < b.date ? 1 : -1,
    );
    return this.decorate(goal);
  }

  create(userId: string, dto: CreateSavingsGoalDto): Promise<SavingsGoal> {
    const goal = this.goals.create({ ...dto, userId });
    return this.goals.save(goal);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateSavingsGoalDto,
  ): Promise<SavingsGoalWithProgress> {
    const goal = await this.goals.findOne({ where: { id, userId } });
    if (!goal) throw new NotFoundException('Savings goal not found');
    Object.assign(goal, dto);
    await this.goals.save(goal);
    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.goals.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Savings goal not found');
  }

  async addContribution(
    userId: string,
    goalId: string,
    dto: CreateContributionDto,
  ): Promise<SavingsGoalWithProgress> {
    const goal = await this.goals.findOne({ where: { id: goalId, userId } });
    if (!goal) throw new NotFoundException('Savings goal not found');
    const contribution = this.contributions.create({ ...dto, goalId });
    await this.contributions.save(contribution);
    return this.findOne(userId, goalId);
  }

  async removeContribution(
    userId: string,
    goalId: string,
    contributionId: string,
  ): Promise<SavingsGoalWithProgress> {
    const goal = await this.goals.findOne({ where: { id: goalId, userId } });
    if (!goal) throw new NotFoundException('Savings goal not found');
    await this.contributions.delete({ id: contributionId, goalId });
    return this.findOne(userId, goalId);
  }

  private decorate(goal: SavingsGoal): SavingsGoalWithProgress {
    const savedAmount =
      Math.round(
        (goal.contributions ?? []).reduce((s, c) => s + Number(c.amount), 0) *
          100,
      ) / 100;
    const remaining = Math.max(
      Math.round((goal.targetAmount - savedAmount) * 100) / 100,
      0,
    );
    const progress =
      goal.targetAmount > 0 ? Math.min(savedAmount / goal.targetAmount, 1) : 0;
    return {
      ...goal,
      savedAmount,
      remaining,
      progress: Math.round(progress * 1000) / 1000,
    };
  }
}
