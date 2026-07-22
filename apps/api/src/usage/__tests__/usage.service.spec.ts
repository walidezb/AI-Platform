import { Test } from '@nestjs/testing';
import { UsageService } from '../usage.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsageService', () => {
  let service: UsageService;
  let prisma: jest.Mocked<any>;

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
    };

    const module = await Test.createTestingModule({
      providers: [
        UsageService,
        { provide: PrismaService, useValue: prisma },
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
});
