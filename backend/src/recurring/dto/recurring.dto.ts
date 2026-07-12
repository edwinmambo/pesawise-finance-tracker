import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Cadence, Channel, TransactionType } from '../../common/enums';

export class CreateRecurringDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsEnum(Channel)
  channel?: Channel;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsEnum(Cadence)
  cadence: Cadence;

  /** Day-of-month (1–31) for MONTHLY, or day-of-week (0=Sun–6) for WEEKLY. */
  @IsInt()
  @Min(0)
  @Max(31)
  anchorDay: number;

  /** Optional anchor for the first run; defaults to today. */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class UpdateRecurringDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsNumber() @IsPositive() amount?: number;
  @IsOptional() @IsEnum(Channel) channel?: Channel;
  @IsOptional() @IsUUID() categoryId?: string | null;
  @IsOptional() @IsUUID() accountId?: string | null;
  @IsOptional() @IsEnum(Cadence) cadence?: Cadence;
  @IsOptional() @IsInt() @Min(0) @Max(31) anchorDay?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
}
