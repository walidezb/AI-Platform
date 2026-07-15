import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  // ── DEPARTMENTS ────────────────────

  async createDepartment(orgId: string, dto: CreateDepartmentDto) {
    // Check duplicate name in same org
    const existing = await this.prisma.department.findFirst({
      where: { organizationId: orgId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Department "${dto.name}" already exists`);
    }
    return this.prisma.department.create({
      data: { ...dto, organizationId: orgId },
      include: { roleDefinitions: true, _count: { select: { users: true } } },
    });
  }

  async getDepartments(orgId: string) {
    return this.prisma.department.findMany({
      where: { organizationId: orgId },
      include: {
        roleDefinitions: {
          orderBy: { title: 'asc' },
        },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getDepartmentById(id: string, orgId: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, organizationId: orgId },
      include: {
        roleDefinitions: {
          orderBy: { title: 'asc' },
        },
        _count: { select: { users: true } },
      },
    });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async updateDepartment(id: string, orgId: string, dto: UpdateDepartmentDto) {
    const dept = await this.prisma.department.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!dept) throw new NotFoundException('Department not found');

    // If name changes, check for uniqueness
    if (dto.name && dto.name !== dept.name) {
      const duplicate = await this.prisma.department.findFirst({
        where: { organizationId: orgId, name: dto.name },
      });
      if (duplicate) {
        throw new ConflictException(`Department "${dto.name}" already exists`);
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: dto,
      include: { roleDefinitions: true },
    });
  }

  async deleteDepartment(id: string, orgId: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id, organizationId: orgId },
      include: { _count: { select: { users: true } } },
    });
    if (!dept) throw new NotFoundException('Department not found');
    if (dept._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete department with ${dept._count.users} active employee(s). ` +
          `Reassign them first.`,
      );
    }
    return this.prisma.department.delete({ where: { id } });
  }

  // ── ROLE DEFINITIONS ───────────────

  async createRole(orgId: string, dto: CreateRoleDto) {
    // Validate department belongs to org if provided
    if (dto.departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, organizationId: orgId },
      });
      if (!dept) throw new NotFoundException('Department not found');
    }

    return this.prisma.roleDefinition.create({
      data: { ...dto, organizationId: orgId },
      include: { department: { select: { name: true } } },
    });
  }

  async getRoles(orgId: string, departmentId?: string) {
    return this.prisma.roleDefinition.findMany({
      where: {
        organizationId: orgId,
        ...(departmentId ? { departmentId } : {}),
      },
      include: { department: { select: { id: true, name: true } } },
      orderBy: { title: 'asc' },
    });
  }

  async updateRole(id: string, orgId: string, dto: UpdateRoleDto) {
    const role = await this.prisma.roleDefinition.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.roleDefinition.update({
      where: { id },
      data: dto,
      include: { department: { select: { name: true } } },
    });
  }

  async deleteRole(id: string, orgId: string) {
    const role = await this.prisma.roleDefinition.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!role) throw new NotFoundException('Role not found');
    return this.prisma.roleDefinition.delete({ where: { id } });
  }

  // Used by invite form to populate dropdowns
  async getDepartmentsWithRoles(orgId: string) {
    return this.getDepartments(orgId);
  }
}
