import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { InterestType, LenderType, LoanStatus } from '../../common/enums';

export class CreateLoanDto {
  @IsString()
  @MaxLength(80)
  lender: string;

  @IsOptional()
  @IsEnum(LenderType)
  lenderType?: LenderType;

  @IsNumber()
  @IsPositive()
  principal: number;

  @IsNumber()
  @Min(0)
  @Max(1000)
  interestRate: number;

  @IsOptional()
  @IsEnum(InterestType)
  interestType?: InterestType;

  @IsInt()
  @Min(1)
  @Max(600)
  termMonths: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateLoanDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lender?: string;

  @IsOptional()
  @IsEnum(LenderType)
  lenderType?: LenderType;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  principal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  interestRate?: number;

  @IsOptional()
  @IsEnum(InterestType)
  interestType?: InterestType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  termMonths?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(LoanStatus)
  status?: LoanStatus;
}

export class CreateLoanPaymentDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
