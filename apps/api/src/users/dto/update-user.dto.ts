import { IsString, IsOptional, IsEnum } from 'class-validator';
import { Language } from '@prisma/client';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @IsEnum(Language)
  @IsOptional()
  preferredLanguage?: Language;
}
