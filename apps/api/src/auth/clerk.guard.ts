import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import { PrismaService } from '../prisma/prisma.service';
import * as Prisma from '@prisma/client';

@Injectable()
export class ClerkGuard implements CanActivate {
  // Local memory cache Map to store verified tokens for 60 seconds
  private tokenCache = new Map<
    string,
    {
      user: Prisma.User & { organization: any | null; department: any | null };
      expiresAt: number;
    }
  >();

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

    // Test Mock Bypass Check
    const mockRole = request.headers['x-mock-user'];
    if (process.env.NODE_ENV === 'test' && mockRole) {
      if (mockRole === 'learner') {
        request.user = {
          id: 'learner-1',
          clerkId: 'clerk-learner',
          email: 'learner@org-a.com',
          fullName: 'Learner A',
          role: 'LEARNER',
          organizationId: 'org-a-id',
        } as any;
      } else if (mockRole === 'manager') {
        request.user = {
          id: 'manager-1',
          clerkId: 'clerk-manager',
          email: 'manager@org-a.com',
          fullName: 'Manager A',
          role: 'MANAGER',
          organizationId: 'org-a-id',
        } as any;
      } else if (mockRole === 'org_b_manager') {
        request.user = {
          id: 'manager-2',
          clerkId: 'clerk-org-b-manager',
          email: 'manager@org-b.com',
          fullName: 'Manager B',
          role: 'MANAGER',
          organizationId: 'org-b-id',
        } as any;
      } else if (mockRole === 'platform_admin') {
        request.user = {
          id: 'platform-admin-1',
          clerkId: 'clerk-platform-admin',
          email: 'admin@platform.com',
          fullName: 'Platform Admin',
          role: 'PLATFORM_ADMIN',
          organizationId: 'org-admin-id',
        } as any;
      }
      return true;
    }

    // 1. Internal Service Bypass Check
    const path = request.url || '';
    const internalSecret = request.headers['x-internal-secret'];
    const configuredSecret = process.env.INTERNAL_SERVICE_SECRET;

    if (path.includes('/internal/')) {
      if (
        internalSecret &&
        configuredSecret &&
        internalSecret === configuredSecret
      ) {
        request.user = {
          id: 'internal',
          role: 'PLATFORM_ADMIN',
          organizationId: null,
        } as any;
        return true;
      }
      throw new UnauthorizedException({
        message: 'Invalid or missing internal service credentials',
        code: 'INVALID_INTERNAL_SECRET',
      });
    }

    if (
      internalSecret &&
      configuredSecret &&
      internalSecret === configuredSecret
    ) {
      request.user = {
        id: 'internal',
        role: 'PLATFORM_ADMIN',
        organizationId: null,
      } as any;
      return true;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException({
        message: 'Authentication required',
        code: 'NO_TOKEN',
      });
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException({
        message: 'Session expired. Please sign in again',
        code: 'INVALID_TOKEN',
      });
    }

    // 2. Cache Check (60 seconds)
    const now = Date.now();
    const cached = this.tokenCache.get(token);
    if (cached && cached.expiresAt > now) {
      request.user = cached.user;
      return true;
    }

    try {
      // Verify token with Clerk
      const decodedPayload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      const clerkId = decodedPayload.sub;

      if (!clerkId) {
        throw new UnauthorizedException({
          message: 'Session expired. Please sign in again',
          code: 'INVALID_TOKEN',
        });
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
        throw new UnauthorizedException({
          message: 'Account not found. Please complete registration',
          code: 'USER_NOT_FOUND',
        });
      }

      // Check organization suspension
      if (user.organization?.isSuspended) {
        throw new ForbiddenException({
          message: 'Your organization account has been suspended',
          code: 'ORG_SUSPENDED',
        });
      }

      // Cache the result for 60 seconds
      this.tokenCache.set(token, {
        user,
        expiresAt: now + 60 * 1000,
      });

      request.user = user;
      return true;
    } catch (err: any) {
      if (isPublic) {
        return true;
      }
      // If it's already a ForbiddenException or UnauthorizedException from above, rethrow it
      if (
        err instanceof ForbiddenException ||
        err instanceof UnauthorizedException
      ) {
        throw err;
      }
      throw new UnauthorizedException({
        message: 'Session expired. Please sign in again',
        code: 'INVALID_TOKEN',
      });
    }
  }
}
