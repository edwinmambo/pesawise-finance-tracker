import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CommitImportDto, CreateImportDto } from './dto/import.dto';

@UseGuards(JwtAuthGuard)
@Controller('imports')
export class ImportsController {
  constructor(private readonly service: ImportsService) {}

  /** Parse + stage a paste/upload for preview (no ledger writes yet). */
  @Post()
  preview(@CurrentUser('userId') userId: string, @Body() dto: CreateImportDto) {
    return this.service.preview(userId, dto);
  }

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.service.list(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('userId') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(userId, id);
  }

  @Post(':id/commit')
  commit(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CommitImportDto,
  ) {
    return this.service.commit(userId, id, dto.rowIds);
  }
}
