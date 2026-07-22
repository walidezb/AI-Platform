import { Test } from '@nestjs/testing';
import { ManagerService } from '../manager.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ManagerService', () => {
  let service: ManagerService;
  let prisma: jest.Mocked<any>;

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      userProgress: {
        findMany: jest.fn(),
      },
      milestone: {
        findUnique: jest.fn(),
      },
      resourceCompletion: {
        findMany: jest.fn(),
      },
      completion: {
        findMany: jest.fn(),
      },
      assessment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      exerciseSubmission: {
        groupBy: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        ManagerService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ManagerService>(ManagerService);
  });

  describe('getTeamOverview', () => {
    it('should aggregate team stats and return employee list correctly', async () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      prisma.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
          fullName: 'Alice Smith',
          email: 'alice@company.com',
          avatarUrl: null,
          role: 'LEARNER',
          department: { name: 'Engineering' },
          jobTitle: 'Backend Dev',
          progress: {
            status: 'IN_PROGRESS',
            overallCompletionPct: 50.0,
            timeSpentMinutes: 120,
            streakDays: 5,
            lastActivityAt: tenDaysAgo,
            currentMilestoneId: 'ms-1',
            learningPath: { id: 'path-1', title: 'Node.js Mastery', domain: 'ENGINEERING' },
          },
        },
        {
          id: 'user-2',
          fullName: 'Bob Jones',
          email: 'bob@company.com',
          avatarUrl: null,
          role: 'LEARNER',
          department: { name: 'Product' },
          jobTitle: 'PM',
          progress: null,
        },
      ]);

      prisma.userProgress.findMany.mockResolvedValue([
        {
          userId: 'user-1',
          status: 'IN_PROGRESS',
          overallCompletionPct: 50.0,
          timeSpentMinutes: 120,
          streakDays: 5,
          lastActivityAt: tenDaysAgo,
          currentMilestoneId: 'ms-1',
        },
      ]);

      prisma.milestone.findUnique.mockResolvedValue({
        title: 'Milestone 1',
        sequenceOrder: 1,
      });

      const result = await service.getTeamOverview('org-1');

      expect(result.stats.total).toBe(2);
      expect(result.stats.active).toBe(1);
      expect(result.stats.notStarted).toBe(1);
      expect(result.stats.avgCompletion).toBe(25);
      expect(result.stats.totalHoursLearned).toBe(2);

      expect(result.employees.length).toBe(2);
      const alice = result.employees.find((e) => e.id === 'user-1');
      expect(alice).toBeDefined();
      expect(alice?.isStalled).toBe(true);
      expect(alice?.currentMilestone).toBe('Milestone 1');
    });
  });

  describe('getCompletionByDept', () => {
    it('should group completion percentage by department', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'u-1',
          department: { name: 'Engineering' },
          progress: { overallCompletionPct: 80.0, status: 'COMPLETED' },
        },
        {
          id: 'u-2',
          department: { name: 'Engineering' },
          progress: { overallCompletionPct: 60.0, status: 'IN_PROGRESS' },
        },
        {
          id: 'u-3',
          department: { name: 'Product' },
          progress: { overallCompletionPct: 40.0, status: 'IN_PROGRESS' },
        },
      ]);

      const res = await service.getCompletionByDept('org-1');
      expect(res.length).toBe(2);
      expect(res[0].department).toBe('Engineering');
      expect(res[0].avgCompletion).toBe(70);
      expect(res[0].totalEmployees).toBe(2);
      expect(res[0].completed).toBe(1);
    });
  });

  describe('getTopPerformers', () => {
    it('should return top 5 performers ordered by completion pct', async () => {
      prisma.userProgress.findMany.mockResolvedValue([
        {
          userId: 'u-1',
          overallCompletionPct: 90.0,
          timeSpentMinutes: 240,
          streakDays: 7,
          user: {
            id: 'u-1',
            fullName: 'Alice Smith',
            email: 'alice@test.com',
            avatarUrl: null,
            department: { name: 'Engineering' },
            jobTitle: 'Dev',
          },
        },
      ]);

      prisma.exerciseSubmission.groupBy.mockResolvedValue([
        { userId: 'u-1', _count: { id: 5 } },
      ]);

      const res = await service.getTopPerformers('org-1');
      expect(res.length).toBe(1);
      expect(res[0].fullName).toBe('Alice Smith');
      expect(res[0].exercisesPassed).toBe(5);
      expect(res[0].timeSpentHours).toBe(4);
    });
  });

  describe('getAtRiskLearners', () => {
    it('should identify learners with low completion or long inactivity', async () => {
      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      prisma.user.findMany.mockResolvedValue([
        {
          id: 'u-atrisk',
          fullName: 'Inactive Bob',
          email: 'bob@test.com',
          avatarUrl: null,
          createdAt: twentyDaysAgo,
          department: { name: 'Product' },
          progress: {
            overallCompletionPct: 10.0,
            status: 'IN_PROGRESS',
            lastActivityAt: tenDaysAgo,
            streakDays: 0,
          },
        },
      ]);

      const res = await service.getAtRiskLearners('org-1');
      expect(res.length).toBe(1);
      expect(res[0].fullName).toBe('Inactive Bob');
      expect(res[0].riskReason).toBe('10 days inactive');
    });
  });

  describe('getSkillRadar', () => {
    it('should aggregate team strength and skill gaps from completed assessments', async () => {
      prisma.assessment.findMany.mockResolvedValue([
        {
          skillProfile: {
            strong_areas: ['React', 'TypeScript'],
            weak_areas: ['Testing'],
            recommended_domains: ['Frontend'],
          },
        },
      ]);

      const res = await service.getSkillRadar('org-1');
      expect(res.length).toBeGreaterThan(0);
      const reactPoint = res.find((r) => r.domain === 'React');
      expect(reactPoint?.teamStrength).toBe(100);
      expect(reactPoint?.teamGap).toBe(0);
    });
  });

  describe('getEmployeeDetail', () => {
    it('should return employee detail with progress, assessment, milestones and activity', async () => {
      prisma.user.findUnique.mockResolvedValue({
        organizationId: 'org-1',
      });
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        fullName: 'Alice Smith',
        email: 'alice@company.com',
        avatarUrl: null,
        role: 'LEARNER',
        department: { name: 'Engineering' },
        jobTitle: 'Developer',
        createdAt: new Date(),
        progress: {
          overallCompletionPct: 75.0,
          timeSpentMinutes: 300,
          streakDays: 4,
          lastActivityAt: new Date(),
          status: 'IN_PROGRESS',
          currentMilestoneId: 'm-1',
          learningPath: {
            id: 'lp-1',
            title: 'Node.js Mastery',
            domain: 'ENGINEERING',
            totalMilestones: 2,
            estimatedHours: 20,
            status: 'ACTIVE',
            milestones: [
              {
                id: 'm-1',
                sequenceOrder: 1,
                title: 'Core Fundamentals',
                description: 'Basics of Node.js',
                isLocked: false,
                completedAt: new Date(),
                estimatedHours: 10,
                modules: [{ isLocked: false }, { isLocked: false }],
                exercises: [
                  {
                    id: 'ex-1',
                    title: 'Async/Await Quiz',
                    exerciseType: 'MULTIPLE_CHOICE',
                    submissions: [
                      { score: 90.0, status: 'PASSED', attemptNumber: 1, createdAt: new Date() },
                    ],
                  },
                ],
              },
            ],
          },
        },
      });

      prisma.assessment.findFirst.mockResolvedValue({
        completedAt: new Date(),
        experienceLevel: 'INTERMEDIATE',
        skillProfile: {
          strong_areas: ['JavaScript'],
          weak_areas: ['Docker'],
          learning_goals: ['Master Microservices'],
        },
      });

      prisma.resourceCompletion.findMany.mockResolvedValue([]);

      const result = await service.getEmployeeDetail('user-1', 'mgr-1');

      expect(result.user.fullName).toBe('Alice Smith');
      expect(result.user.department).toBe('Engineering');
      expect(result.assessment?.experienceLevel).toBe('INTERMEDIATE');
      expect(result.assessment?.strongAreas).toContain('JavaScript');
      expect(result.progress?.completionPct).toBe(75.0);
      expect(result.milestones.length).toBe(1);
      expect(result.exerciseResults.length).toBe(1);
      expect(result.exerciseResults[0].passed).toBe(true);
    });

    it('should throw NotFoundException if employee is not found or not in manager org', async () => {
      prisma.user.findUnique.mockResolvedValue({
        organizationId: 'org-1',
      });
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.getEmployeeDetail('user-foreign', 'mgr-1')).rejects.toThrow();
    });
  });

  describe('getStatsTimeSeries', () => {
    it('should return grouped daily stats', async () => {
      const now = new Date();
      prisma.resourceCompletion.findMany.mockResolvedValue([
        {
          completedAt: now,
          userId: 'user-1',
          timeSpentSeconds: 3600,
        },
      ]);

      const result = await service.getStatsTimeSeries('org-1', 7);
      expect(result.length).toBe(7);
      const todayKey = now.toISOString().split('T')[0];
      const todayData = result.find((r) => r.date === todayKey);
      expect(todayData?.activeUsers).toBe(1);
      expect(todayData?.completions).toBe(1);
      expect(todayData?.hoursLearned).toBe(1);
    });
  });

  describe('exportTeamCsv', () => {
    it('should export team data in CSV format', async () => {
      prisma.user.findMany.mockResolvedValue([
        {
          id: 'user-1',
          fullName: 'Alice Smith',
          email: 'alice@company.com',
          avatarUrl: null,
          role: 'LEARNER',
          department: { name: 'Engineering' },
          jobTitle: 'Dev',
          progress: null,
        },
      ]);
      prisma.userProgress.findMany.mockResolvedValue([]);

      const csv = await service.exportTeamCsv('org-1');
      expect(csv).toContain('Name,Email,Department,Job Title');
      expect(csv).toContain('"Alice Smith",alice@company.com');
    });
  });
});
