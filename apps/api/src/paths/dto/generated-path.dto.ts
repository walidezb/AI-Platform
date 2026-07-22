import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ExerciseType, ModuleType, ResourceType } from '@prisma/client';

export class GeneratedResourceDto {
  @IsString()
  title: string;

  @IsString()
  url: string;

  @IsString()
  sourcePlatform: string;

  @IsString()
  description: string;

  @IsEnum(ResourceType)
  resourceType: ResourceType;

  @IsOptional()
  @IsNumber()
  durationMinutes?: number | null;

  @IsNumber()
  qualityScore: number;

  @IsOptional()
  @IsString()
  language?: string;
}

export class GeneratedModuleDto {
  @IsNumber()
  sequenceOrder: number;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(ModuleType)
  moduleType: ModuleType;

  @IsNumber()
  estimatedMinutes: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  searchKeywords: string[] = [];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedResourceDto)
  resources: GeneratedResourceDto[] = [];
}

export class GeneratedExerciseDto {
  @IsString()
  title: string;

  @IsString()
  instructions: string;

  @IsEnum(ExerciseType)
  exerciseType: ExerciseType;

  @IsOptional()
  @IsString()
  scenarioContext?: string | null;

  @IsArray()
  rubric: any[];

  @IsNumber()
  passingScore: number;
}

export class GeneratedMilestoneDto {
  @IsNumber()
  sequenceOrder: number;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  learningObjectives: string[];

  @IsNumber()
  estimatedHours: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedModuleDto)
  modules: GeneratedModuleDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedExerciseDto)
  exercises: GeneratedExerciseDto[] = [];
}

export class GeneratedPathDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  domain: string;

  @IsNumber()
  estimatedHours: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedMilestoneDto)
  milestones: GeneratedMilestoneDto[];
}
