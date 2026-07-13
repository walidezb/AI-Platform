import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class InviteEmployeeDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;
}
