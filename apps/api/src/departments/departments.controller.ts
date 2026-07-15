import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { OrgId } from '../auth/decorators/org-id.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  // ── Department endpoints ───────────

  @Post()
  @Roles('MANAGER', 'ORG_ADMIN')
  async create(@Body() dto: CreateDepartmentDto, @OrgId() orgId: string) {
    return {
      success: true,
      data: await this.service.createDepartment(orgId, dto),
    };
  }

  @Get()
  @Roles('MANAGER', 'ORG_ADMIN', 'LEARNER')
  async findAll(@OrgId() orgId: string) {
    return {
      success: true,
      data: await this.service.getDepartments(orgId),
    };
  }

  @Get(':id')
  @Roles('MANAGER', 'ORG_ADMIN', 'LEARNER')
  async findOne(@Param('id') id: string, @OrgId() orgId: string) {
    return {
      success: true,
      data: await this.service.getDepartmentById(id, orgId),
    };
  }

  @Patch(':id')
  @Roles('MANAGER', 'ORG_ADMIN')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @OrgId() orgId: string,
  ) {
    return {
      success: true,
      data: await this.service.updateDepartment(id, orgId, dto),
    };
  }

  @Delete(':id')
  @Roles('ORG_ADMIN')
  async remove(@Param('id') id: string, @OrgId() orgId: string) {
    await this.service.deleteDepartment(id, orgId);
    return { success: true, message: 'Department deleted' };
  }

  // ── Role endpoints ─────────────────

  @Post('roles')
  @Roles('MANAGER', 'ORG_ADMIN')
  async createRole(@Body() dto: CreateRoleDto, @OrgId() orgId: string) {
    return {
      success: true,
      data: await this.service.createRole(orgId, dto),
    };
  }

  @Get('roles')
  @Roles('MANAGER', 'ORG_ADMIN', 'LEARNER')
  async getRoles(
    @OrgId() orgId: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return {
      success: true,
      data: await this.service.getRoles(orgId, departmentId),
    };
  }

  @Patch('roles/:id')
  @Roles('MANAGER', 'ORG_ADMIN')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @OrgId() orgId: string,
  ) {
    return {
      success: true,
      data: await this.service.updateRole(id, orgId, dto),
    };
  }

  @Delete('roles/:id')
  @Roles('ORG_ADMIN')
  async deleteRole(@Param('id') id: string, @OrgId() orgId: string) {
    await this.service.deleteRole(id, orgId);
    return { success: true, message: 'Role deleted' };
  }
}
