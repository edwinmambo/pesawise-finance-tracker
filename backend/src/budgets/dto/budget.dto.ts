import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { BudgetPlanType } from '../../common/enums';

export class BudgetItemDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsString()
  label: string;

  @IsNumber()
  @Min(0)
  limitAmount: number;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class CreateBudgetDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(BudgetPlanType)
  planType?: BudgetPlanType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedIncome?: number;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetItemDto)
  items: BudgetItemDto[];
}

export class UpdateBudgetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedIncome?: number;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetItemDto)
  items?: BudgetItemDto[];
}

export class ApplyTemplateDto {
  @IsEnum(BudgetPlanType)
  planType: BudgetPlanType;
}
