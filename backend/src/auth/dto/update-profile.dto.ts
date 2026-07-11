import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// Currencies the client can display. Display-only (no FX conversion).
export const SUPPORTED_CURRENCIES = [
  'KES',
  'USD',
  'EUR',
  'GBP',
  'TZS',
  'UGX',
  'ZAR',
  'NGN',
] as const;

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  currency?: string;

  @IsOptional()
  @IsString()
  avatarColor?: string;
}
