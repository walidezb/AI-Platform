import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminService } from '../admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingService } from '../../billing/billing.service';

import { CacheService } from '../../cache/cache.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;
  let jwtService: any;
  let billingService: any;

  const mockCacheService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    delPattern: jest.fn().mockResolvedValue(undefined),
    getOrSet: jest.fn((key, ttl, fetcher) => fetcher()),
  };

  beforeEach(async () => {
    prisma = {
      organization: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      learningPath: {
        count: jest.fn(),
      },
      aiUsageLog: {
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      resourceCompletion: {
        findMany: jest.fn(),
      },
      adminAuditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock_scoped_jwt_token'),
    };

    billingService = {
      getInvoices: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: BillingService, useValue: billingService },
        { provide: CacheService, useValue: mockCacheService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('getPlatformStats', () => {
    it('should aggregate platform stats correctly', async () => {
      prisma.organization.count.mockResolvedValue(10);
      prisma.user.count.mockResolvedValue(50);
      prisma.learningPath.count.mockResolvedValue(25);
      prisma.aiUsageLog.aggregate.mockImplementation(({ where }: any) => {
        if (where.createdAt?.gte && !where.createdAt?.lte) {
          return Promise.resolve({ _sum: { tokensUsed: 100000 } });
        }
        return Promise.resolve({ _sum: { costUsd: 12.5 } });
      });
      prisma.resourceCompletion.findMany.mockResolvedValue([
        { userId: 'u1' },
        { userId: 'u2' },
      ]);

      const stats = await service.getPlatformStats();

      expect(stats.totalOrgs).toBe(10);
      expect(stats.totalLearners).toBe(50);
      expect(stats.totalPaths).toBe(25);
      expect(stats.dau).toBe(2);
    });
  });

  describe('getAllOrgs', () => {
    it('should return paginated and filtered list of organizations', async () => {
      prisma.organization.count.mockResolvedValue(1);
      prisma.organization.findMany.mockResolvedValue([
        {
          id: 'org-1',
          name: 'Acme Corp',
          slug: 'acme',
          logoUrl: null,
          planTier: 'growth',
          status: 'ACTIVE',
          subscriptionStatus: 'active',
          aiTokensBudget: 1000000n,
          suspendedAt: null,
          suspendedReason: null,
          createdAt: new Date(),
          users: [{ email: 'admin@acme.com' }],
          _count: { users: 5, learningPaths: 3 },
        },
      ]);
      prisma.aiUsageLog.groupBy.mockResolvedValue([
        {
          organizationId: 'org-1',
          _sum: { costUsd: 5.5, tokensUsed: 50000 },
        },
      ]);

      const res = await service.getAllOrgs({ search: 'Acme', page: 1, limit: 10 });

      expect(res.total).toBe(1);
      expect(res.orgs.length).toBe(1);
      expect(res.orgs[0].name).toBe('Acme Corp');
      expect(res.orgs[0].email).toBe('admin@acme.com');
      expect(res.orgs[0].aiCostThisMonth).toBe(5.5);
    });
  });

  describe('getOrgDetails', () => {
    it('should throw NotFoundException if organization does not exist', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.getOrgDetails('org-404')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return organization details with usage metrics', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Acme',
        slug: 'acme',
        logoUrl: null,
        planTier: 'starter',
        status: 'ACTIVE',
        subscriptionStatus: 'active',
        aiTokensBudget: 1000000n,
        suspendedAt: null,
        suspendedReason: null,
        createdAt: new Date(),
        users: [{ id: 'u1', role: 'ORG_ADMIN', email: 'admin@acme.com' }],
        learningPaths: [],
        alertSettings: null,
      });

      prisma.aiUsageLog.aggregate.mockResolvedValue({
        _sum: { costUsd: 10.0, tokensUsed: 100000 },
      });

      const details = await service.getOrgDetails('org-1');

      expect(details.id).toBe('org-1');
      expect(details.email).toBe('admin@acme.com');
      expect(details.monthlyUsage.costUsd).toBe(10.0);
    });
  });

  describe('suspendOrg & reactivateOrg', () => {
    it('should update organization status to SUSPENDED', async () => {
      prisma.organization.update.mockResolvedValue({ id: 'org-1' });
      await service.suspendOrg('org-1', 'Terms violation');

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: {
          status: 'SUSPENDED',
          isSuspended: true,
          suspendedAt: expect.any(Date),
          suspendedReason: 'Terms violation',
        },
      });
    });

    it('should update organization status to ACTIVE', async () => {
      prisma.organization.update.mockResolvedValue({ id: 'org-1' });
      await service.reactivateOrg('org-1');

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: {
          status: 'ACTIVE',
          isSuspended: false,
          suspendedAt: null,
          suspendedReason: null,
        },
      });
    });
  });

  describe('updateOrgBudget', () => {
    it('should throw BadRequestException if budget < 10000', async () => {
      await expect(service.updateOrgBudget('org-1', 5000)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update organization budget', async () => {
      prisma.organization.update.mockResolvedValue({ id: 'org-1' });
      await service.updateOrgBudget('org-1', 2000000);

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { aiTokensBudget: 2000000n },
      });
    });
  });

  describe('impersonateOrg', () => {
    it('should throw NotFoundException if organization does not exist', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(
        service.impersonateOrg('org-404', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if org has no ORG_ADMIN or MANAGER', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Acme',
        status: 'ACTIVE',
      });
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.impersonateOrg('org-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return scoped token and log audit event when target user exists', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Acme Corp',
        status: 'ACTIVE',
      });
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-2',
        email: 'manager@acme.com',
        fullName: 'Manager Bob',
        role: 'ORG_ADMIN',
      });

      const res = await service.impersonateOrg('org-1', 'admin-1');

      expect(res.token).toBe('mock_scoped_jwt_token');
      expect(res.expiresIn).toBe(3600);
      expect(res.orgName).toBe('Acme Corp');
      expect(res.targetUser.email).toBe('manager@acme.com');
      expect(res.impersonateUrl).toContain('/impersonate?token=');
      expect(prisma.adminAuditLog.create).toHaveBeenCalled();
    });
  });
});
