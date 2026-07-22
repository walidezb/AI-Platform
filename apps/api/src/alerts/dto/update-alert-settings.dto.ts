import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateAlertSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  stalledAfterDays?: number;

  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(60)
  atRiskAfterDays?: number;

  @IsOptional()
  @IsBoolean()
  enableManagerAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  enableLearnerNudges?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  alertHour?: number;
}
