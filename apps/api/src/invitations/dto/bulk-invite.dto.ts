import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { InviteEmployeeDto } from './invite-employee.dto';

export class BulkInviteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InviteEmployeeDto)
  employees: InviteEmployeeDto[];
}
