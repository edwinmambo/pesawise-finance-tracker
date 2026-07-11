import {
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CategoryKind } from '../../common/enums';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(40)
  name: string;

  @IsEnum(CategoryKind)
  kind: CategoryKind;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  icon?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsEnum(CategoryKind)
  kind?: CategoryKind;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  icon?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
