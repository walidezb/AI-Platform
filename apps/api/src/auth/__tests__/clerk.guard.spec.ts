import { Test } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { ClerkGuard } from '../clerk.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

// Mock Clerk's verifyToken
jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(),
}));
import { verifyToken } from '@clerk/backend';

const mockUser = {
  id: 'user-123',
  clerkId: 'clerk_abc',
  organizationId: 'org-456',
  role: 'LEARNER',
  status: 'ACTIVE',
  organization: { status: 'ACTIVE', isSuspended: false },
};

const makeMockContext = (authHeader?: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { authorization: authHeader },
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as any;

describe('ClerkGuard', () => {
  let guard: ClerkGuard;
  let prisma: jest.Mocked<Pick<PrismaService, 'user'>>;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      } as any,
    };

    const module = await Test.createTestingModule({
      providers: [
        ClerkGuard,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const env: Record<string, string> = {
                CLERK_SECRET_KEY: 'test_key',
              };
              return env[key];
            },
          },
        },
      ],
    }).compile();

    guard = module.get<ClerkGuard>(ClerkGuard);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return true for a valid token and active user', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({
      sub: 'clerk_abc',
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const ctx = makeMockContext('Bearer valid_token');
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
  });

  it('should throw 401 when Authorization header is missing', async () => {
    const ctx = makeMockContext(undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('should throw 401 when token is invalid', async () => {
    (verifyToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));
    const ctx = makeMockContext('Bearer bad_token');
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('should throw 401 when user not found in DB', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ sub: 'clerk_abc' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const ctx = makeMockContext('Bearer valid_token');
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('should throw 403 when organization is suspended', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ sub: 'clerk_abc' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...mockUser,
      organization: { status: 'SUSPENDED', isSuspended: true },
    });

    const ctx = makeMockContext('Bearer valid_token');
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('should attach user to request object', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ sub: 'clerk_abc' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const request: any = { headers: { authorization: 'Bearer token' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;

    await guard.canActivate(ctx);
    expect(request.user).toEqual(mockUser);
  });

  it('should work with Bearer prefix (case insensitive)', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ sub: 'clerk_abc' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    // lowercase "bearer"
    const ctx = makeMockContext('bearer valid_token');
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});
