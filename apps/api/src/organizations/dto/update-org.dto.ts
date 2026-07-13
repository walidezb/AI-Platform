import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { Language } from '@prisma/client';

export class UpdateOrgDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(Language)
  defaultLanguage?: Language;
}
