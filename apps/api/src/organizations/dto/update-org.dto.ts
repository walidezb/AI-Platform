import { IsString, IsOptional, IsEnum, MinLength, MaxLength, IsUrl, IsIn } from 'class-validator';
import { Language } from '@prisma/client';

export class UpdateOrgDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Logo URL must be a valid URL' })
  logoUrl?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'Asia/Dubai', 'Asia/Riyadh', 'Africa/Cairo', 'Asia/Kuwait', 'Asia/Bahrain',
    'Europe/London', 'Europe/Paris', 'America/New_York',
    'America/Los_Angeles', 'Asia/Tokyo', 'Australia/Sydney', 'UTC'
  ])
  timezone?: string;

  @IsOptional()
  @IsEnum(Language)
  defaultLanguage?: Language;
}
