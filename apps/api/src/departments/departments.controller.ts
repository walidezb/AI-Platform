import { 
  Controller, 
  Post, 
  Get, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query 
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import * as Prisma from '@prisma/client';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  // ── Department endpoints ───────────

  @Post()
  @Roles('MANAGER', 'ORG_ADMIN')
  async create(
    @Body() dto: CreateDepartmentDto, 
    @CurrentUser() user: Prisma.User
  ) {
    return {
      success: true,
      data: await this.service.createDepartment(user.organizationId, dto)
    };
  }

  @Get()
  @Roles('MANAGER', 'ORG_ADMIN', 'LEARNER')
  async findAll(@CurrentUser() user: Prisma.User) {
    return {
      success: true,
      data: await this.service.getDepartments(user.organizationId)
    };
  }

  @Patch(':id')
  @Roles('MANAGER', 'ORG_ADMIN')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: Prisma.User
  ) {
    return {
      success: true,
      data: await this.service.updateDepartment(id, user.organizationId, dto)
    };
  }

  @Delete(':id')
  @Roles('ORG_ADMIN')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: Prisma.User
  ) {
    await this.service.deleteDepartment(id, user.organizationId);
    return { success: true, message: 'Department deleted' };
  }

  // ── Role endpoints ─────────────────

  @Post('roles')
  @Roles('MANAGER', 'ORG_ADMIN')
  async createRole(
    @Body() dto: CreateRoleDto, 
    @CurrentUser() user: Prisma.User
  ) {
    return {
      success: true,
      data: await this.service.createRole(user.organizationId, dto)
    };
  }

  @Get('roles')
  @Roles('MANAGER', 'ORG_ADMIN', 'LEARNER')
  async getRoles(
    @CurrentUser() user: Prisma.User,
    @Query('departmentId') departmentId?: string
  ) {
    return {
      success: true,
      data: await this.service.getRoles(user.organizationId, departmentId)
    };
  }

  @Patch('roles/:id')
  @Roles('MANAGER', 'ORG_ADMIN')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: Prisma.User
  ) {
    return {
      success: true,
      data: await this.service.updateRole(id, user.organizationId, dto)
    };
  }

  @Delete('roles/:id')
  @Roles('ORG_ADMIN')
  async deleteRole(
    @Param('id') id: string,
    @CurrentUser() user: Prisma.User
  ) {
    await this.service.deleteRole(id, user.organizationId);
    return { success: true, message: 'Role deleted' };
  }
}
