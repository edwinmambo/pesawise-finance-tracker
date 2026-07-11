import {
  IsEnum,
  IsHexColor,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AccountType } from '../../common/enums';

export class CreateAccountDto {
  @IsString()
  @MaxLength(60)
  name: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  openingBalance?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  institution?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @IsNumber()
  openingBalance?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  institution?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
