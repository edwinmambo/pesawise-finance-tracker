import { Controller, Get, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from '../users/users.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportData } from './reports.types';
import { toCsv } from './report-csv';
import { toPdf } from './report-pdf';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly service: ReportsService,
    private readonly users: UsersService,
  ) {}

  /**
   * GET /api/reports?period=6&format=json|csv|pdf
   * JSON is the default (drives the Reports page); csv/pdf return downloads.
   */
  @Get()
  async report(
    @CurrentUser('userId') userId: string,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReportData | string | StreamableFile> {
    const data = await this.service.build(userId, query.period);

    if (query.format === 'csv') {
      res.set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="pesawise-report-${query.period}.csv"`,
      });
      return toCsv(data);
    }

    if (query.format === 'pdf') {
      const user = await this.users.findById(userId);
      const buffer = await toPdf(data, { name: user.name });
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="pesawise-report-${query.period}.pdf"`,
      });
      return new StreamableFile(buffer);
    }

    return data;
  }
}
