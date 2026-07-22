import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ResourceTypeEnum {
  ARTICLE = 'ARTICLE',
  VIDEO = 'VIDEO',
  DOCUMENTATION = 'DOCUMENTATION',
  PODCAST = 'PODCAST',
}

export class ResourceDto {
  @IsString()
  title: string;

  @IsUrl()
  url: string;

  @IsString()
  sourcePlatform: string;

  @IsString()
  description: string;

  @IsEnum(ResourceTypeEnum)
  resourceType: ResourceTypeEnum;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @IsNumber()
  @Min(0)
  @Max(10)
  qualityScore: number = 7.0;

  @IsEnum(['EN', 'AR'])
  language: 'EN' | 'AR' = 'EN';

  @IsNumber()
  @Min(1)
  sequenceOrder: number;
}

export class SaveModuleResourcesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceDto)
  resources: ResourceDto[];
}
