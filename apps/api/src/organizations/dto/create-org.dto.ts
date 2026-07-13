import { IsString, MinLength, MaxLength, Matches, IsOptional, IsEnum, IsEmail } from 'class-validator';
import { PlanTier } from '@prisma/client';

export class CreateOrgDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase letters, numbers, and hyphens only' })
  slug: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsEnum(PlanTier)
  planTier?: PlanTier;

  // The Clerk user creating this org (becomes ORG_ADMIN)
  @IsString()
  clerkId: string;

  @IsEmail()
  email: string;

  @IsString()
  fullName: string;
}
