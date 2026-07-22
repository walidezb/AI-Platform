import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UsageService } from '../usage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { NotificationsService } from '../../notifications/notifications.service';

describe('UsageService', () => {
  let service: UsageService;
  let prisma: jest.Mocked<any>;
  let email: jest.Mocked<any>;
  let notifs: jest.Mocked<any>;

  beforeEach(async () => {
    prisma = {
      organization: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      aiUsageLog: {
        create: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      budgetAlert: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    email = {
      sendBudgetWarning80: jest.fn(),
      sendBudgetExceeded100: jest.fn(),
    };

    notifs = {
      create: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        UsageService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
        { provide: NotificationsService, useValue: notifs },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
      ],
    }).compile();

    service = module.get<UsageService>(UsageService);
  });

  describe('checkBudget', () => {
    it('should return isOverBudget: false when org has no budget (unlimited)', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        monthlyTokenBudgetUsd: null,
      });

      const result = await service.checkBudget('org-1');
      expect(result.isOverBudget).toBe(false);
      expect(result.isNearLimit).toBe(false);
      expect(result.percentUsed).toBe(0);
    });

    it('should return budget status when org has budget set', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        monthlyTokenBudgetUsd: 50.0,
      });
      prisma.aiUsageLog.aggregate.mockResolvedValue({
        _sum: { costUsd: 41.5 },
      });

      const result = await service.checkBudget('org-1');
      expect(result.budget).toBe(50.0);
      expect(result.used).toBe(41.5);
      expect(result.percentUsed).toBe(83);
      expect(result.isNearLimit).toBe(true);
      expect(result.isOverBudget).toBe(false);
      expect(result.remainingUsd).toBe(8.5);
    });

    it('should return isOverBudget: true when used >= budget', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        monthlyTokenBudgetUsd: 50.0,
      });
      prisma.aiUsageLog.aggregate.mockResolvedValue({
        _sum: { costUsd: 52.0 },
      });

      const result = await service.checkBudget('org-1');
      expect(result.isOverBudget).toBe(true);
      expect(result.remainingUsd).toBe(0);
    });
  });

  describe('getOrgUsageDashboard', () => {
    it('should aggregate current period usage, features, employees, and daily trends', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        aiTokensBudget: 1000000,
        stripeSubscriptionId: 'sub_123',
        subscriptionStatus: 'active',
        currentPeriodStart: new Date('2026-07-01'),
        currentPeriodEnd: new Date('2026-07-31'),
        planTier: 'growth',
      });

      prisma.aiUsageLog.findMany.mockImplementation(({ where }: any) => {
        // Daily logs query (gte thirtyDaysAgo)
        if (where.createdAt?.gte && !where.createdAt?.lte) {
          return Promise.resolve([
            {
              createdAt: new Date('2026-07-15'),
              tokensUsed: 5000,
              tokensInput: 0,
              tokensOutput: 0,
              costUsd: 0.05,
            },
          ]);
        }
        // Period logs query
        return Promise.resolve([
          {
            feature: 'assessment',
            tokensUsed: 10000,
            tokensInput: 0,
            tokensOutput: 0,
            costUsd: 0.1,
            userId: 'user-1',
            createdAt: new Date('2026-07-10'),
          },
        ]);
      });

      prisma.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
          fullName: 'Alice Tech',
          email: 'alice@acme.com',
          avatarUrl: null,
        },
      ]);

      const dash = await service.getOrgUsageDashboard('org-1');

      expect(dash.currentPeriod.tokensUsed).toBe(10000);
      expect(dash.currentPeriod.costUsd).toBe(0.1);
      expect(dash.currentPeriod.percentUsed).toBe(1);
      expect(dash.byFeature.length).toBe(1);
      expect(dash.byFeature[0].feature).toBe('assessment');
      expect(dash.byEmployee.length).toBe(1);
      expect(dash.byEmployee[0].fullName).toBe('Alice Tech');
      expect(dash.dailyUsage.length).toBe(30);
    });
  });
});
