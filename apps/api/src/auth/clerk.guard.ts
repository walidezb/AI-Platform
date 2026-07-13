import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClerkGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException('Invalid token format');
    }

    try {
      // Verify token with Clerk
      const decodedPayload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      const clerkId = decodedPayload.sub;

      if (!clerkId) {
        throw new UnauthorizedException('Invalid token payload: missing sub');
      }

      // Look up User in our DB by clerkId
      const user = await this.prisma.user.findUnique({
        where: { clerkId },
        include: {
          organization: true,
          department: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not synced');
      }

      // Checks org is not suspended
      if (user.organization?.isSuspended) {
        throw new ForbiddenException(
          user.organization.suspendedReason || 'Organization is suspended',
        );
      }

      request.user = user;
      return true;
    } catch (err: any) {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException(err.message || 'Token verification failed');
    }
  }
}
