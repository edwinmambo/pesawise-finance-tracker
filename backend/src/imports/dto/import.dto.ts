import { ArrayNotEmpty, IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ImportSource } from '../../common/enums';

export class CreateImportDto {
  @IsEnum(ImportSource)
  source: ImportSource;

  /** Pasted M-Pesa SMS text, or the contents of a statement CSV. */
  @IsString()
  @MaxLength(100_000)
  raw: string;
}

export class CommitImportDto {
  /** Optional subset of row ids to commit; omit to commit all NEW rows. */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  rowIds?: string[];
}
