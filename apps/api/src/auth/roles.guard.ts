import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

const roleHierarchy: Record<UserRole, number> = {
  [UserRole.LEARNER]: 1,
  [UserRole.MANAGER]: 2,
  [UserRole.ORG_ADMIN]: 3,
  [UserRole.PLATFORM_ADMIN]: 4,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('User role not resolved');
    }

    const userRoleValue = roleHierarchy[user.role as UserRole] || 0;

    // Check if user's role meets or exceeds any of the required roles
    const hasRole = requiredRoles.some((requiredRole) => {
      const requiredRoleValue = roleHierarchy[requiredRole] || 999;
      return userRoleValue >= requiredRoleValue;
    });

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
