import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RecurringService } from './recurring.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateRecurringDto, UpdateRecurringDto } from './dto/recurring.dto';

@UseGuards(JwtAuthGuard)
@Controller('recurring')
export class RecurringController {
  constructor(private readonly service: RecurringService) {}

  @Get()
  findAll(@CurrentUser('userId') userId: string) {
    return this.service.findAll(userId);
  }

  @Get('upcoming')
  upcoming(@CurrentUser('userId') userId: string, @Query('days') days?: string) {
    const window = days ? Math.min(Math.max(parseInt(days, 10) || 30, 1), 120) : 30;
    return this.service.upcoming(userId, window);
  }

  @Post()
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateRecurringDto) {
    return this.service.create(userId, dto);
  }

  /** Materialise this user's due rules right now (also runs daily via cron). */
  @Post('run')
  async run(@CurrentUser('userId') userId: string) {
    const created = await this.service.runDue(userId);
    return { created };
  }

  @Patch(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecurringDto,
  ) {
    return this.service.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(userId, id);
  }
}
