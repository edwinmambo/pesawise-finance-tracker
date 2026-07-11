import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SavingsService } from './savings.service';
import {
  CreateContributionDto,
  CreateSavingsGoalDto,
  UpdateSavingsGoalDto,
} from './dto/savings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('savings-goals')
export class SavingsController {
  constructor(private readonly service: SavingsService) {}

  @Get()
  findAll(@CurrentUser('userId') userId: string) {
    return this.service.findAll(userId);
  }

  @Get(':id')
  findOne(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(userId, id);
  }

  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSavingsGoalDto,
  ) {
    return this.service.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavingsGoalDto,
  ) {
    return this.service.update(userId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(userId, id);
  }

  @Post(':id/contributions')
  addContribution(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateContributionDto,
  ) {
    return this.service.addContribution(userId, id, dto);
  }

  @Delete(':id/contributions/:contributionId')
  removeContribution(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contributionId', ParseUUIDPipe) contributionId: string,
  ) {
    return this.service.removeContribution(userId, id, contributionId);
  }
}
