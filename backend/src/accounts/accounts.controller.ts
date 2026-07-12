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
import { AccountsService } from './accounts.service';
import { CreateAccountDto, TransferDto, UpdateAccountDto } from './dto/account.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly service: AccountsService) {}

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
    @Body() dto: CreateAccountDto,
  ) {
    return this.service.create(userId, dto);
  }

  /** Move money between two of the user's accounts (atomic linked pair). */
  @Post('transfer')
  transfer(@CurrentUser('userId') userId: string, @Body() dto: TransferDto) {
    return this.service.transfer(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountDto,
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
