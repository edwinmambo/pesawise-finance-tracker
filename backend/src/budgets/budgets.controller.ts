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
import { BudgetsService } from './budgets.service';
import {
  ApplyTemplateDto,
  CreateBudgetDto,
  UpdateBudgetDto,
} from './dto/budget.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}

  /** Premade plans (Comrade / Hustler / Corporate) — public to any logged-in user. */
  @Get('templates')
  templates() {
    return this.service.templates();
  }

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
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateBudgetDto) {
    return this.service.create(userId, dto);
  }

  @Post('apply-template')
  applyTemplate(
    @CurrentUser('userId') userId: string,
    @Body() dto: ApplyTemplateDto,
  ) {
    return this.service.applyTemplate(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
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
}
