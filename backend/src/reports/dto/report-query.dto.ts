import { IsIn, IsOptional } from 'class-validator';
import { ReportPeriod } from '../reports.types';

export class ReportQueryDto {
  @IsOptional()
  @IsIn(['1', '3', '6', 'all'])
  period: ReportPeriod = '6';

  @IsOptional()
  @IsIn(['json', 'csv', 'pdf'])
  format: 'json' | 'csv' | 'pdf' = 'json';
}
