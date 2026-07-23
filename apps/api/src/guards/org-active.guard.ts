import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '@prisma/client';

@Injectable()
export class OrgActiveGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User;

    // PLATFORM_ADMIN bypasses this guard
    if (user?.role === 'PLATFORM_ADMIN') return true;
    if (!user?.organizationId) return true;

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { status: true, isSuspended: true },
    });

    if (org?.status === 'DELETED') {
      throw new ForbiddenException(
        'This organization has been deleted. Contact support.',
      );
    }

    if (org?.status === 'SUSPENDED' || org?.isSuspended) {
      throw new ForbiddenException(
        'Your organization has been suspended. Please contact support.',
      );
    }
    return true;
  }
}
