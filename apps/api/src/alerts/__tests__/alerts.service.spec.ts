import { Test } from '@nestjs/testing';
import { AlertsService } from '../alerts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { NotificationsService } from '../../notifications/notifications.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let prisma: jest.Mocked<any>;
  let email: jest.Mocked<any>;
  let notifs: jest.Mocked<any>;

  beforeEach(async () => {
    prisma = {
      alertSettings: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      userProgress: {
        findMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      organization: {
        findMany: jest.fn(),
      },
    };

    email = {
      sendStalledManagerAlert: jest.fn().mockResolvedValue(undefined),
      sendLearnerNudge: jest.fn().mockResolvedValue(undefined),
    };

    notifs = {
      createNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
        { provide: NotificationsService, useValue: notifs },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  describe('detectStalledLearners', () => {
    it('should identify learners inactive for 7+ days', async () => {
      prisma.alertSettings.findUnique.mockResolvedValue({
        stalledAfterDays: 7,
      });

      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      prisma.userProgress.findMany.mockResolvedValue([
        {
          overallCompletionPct: 30,
          lastActivityAt: tenDaysAgo,
          user: {
            id: 'u-1',
            fullName: 'Stalled Sam',
            email: 'sam@test.com',
            department: { name: 'Engineering' },
            jobTitle: 'Dev',
          },
          learningPath: {
            title: 'Node.js Mastery',
            domain: 'ENGINEERING',
          },
        },
      ]);

      const result = await service.detectStalledLearners('org-1');
      expect(result.length).toBe(1);
      expect(result[0].fullName).toBe('Stalled Sam');
      expect(result[0].daysSinceActive).toBe(10);
    });
  });

  describe('sendStalledManagerAlert', () => {
    it('should send email and create in-app notification for managers', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'mgr-1', fullName: 'Manager Mark', email: 'mark@test.com' },
      ]);

      const stalled = [
        {
          userId: 'u-1',
          fullName: 'Stalled Sam',
          email: 'sam@test.com',
          department: 'Engineering',
          jobTitle: 'Dev',
          pathTitle: 'Node.js Mastery',
          completionPct: 30,
          daysSinceActive: 10,
          lastActivityAt: new Date(),
        },
      ];

      await service.sendStalledManagerAlert('org-1', stalled);

      expect(notifs.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'mgr-1',
          type: 'STALLED_ALERT',
        }),
      );
      expect(email.sendStalledManagerAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'mark@test.com',
        }),
      );
    });
  });

  describe('sendLearnerNudge', () => {
    it('should send nudge email to specified employee', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        fullName: 'Stalled Sam',
        email: 'sam@test.com',
        progress: {
          overallCompletionPct: 40,
          learningPath: { id: 'path-1', title: 'Node.js Mastery' },
        },
      });

      await service.sendLearnerNudge('u-1', 'MANUAL');

      expect(email.sendLearnerNudge).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'sam@test.com',
          employeeName: 'Stalled Sam',
          triggeredBy: 'MANUAL',
        }),
      );
    });
  });
});
