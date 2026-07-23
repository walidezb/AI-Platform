import { IsString, IsIn, IsOptional } from 'class-validator';

export class AdminUnlockDto {
  @IsString()
  userId: string;

  @IsString()
  targetId: string;

  @IsIn(['module', 'milestone', 'exercise'])
  targetType: 'module' | 'milestone' | 'exercise';

  @IsOptional()
  @IsString()
  reason?: string;
}
