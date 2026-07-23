import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { Sanitize } from '../../common/sanitize.decorator';

export class InviteEmployeeDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @Sanitize()
  fullName: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  departmentId?: string;

  @IsOptional()
  @IsString()
  @Sanitize()
  jobTitle?: string;
}
