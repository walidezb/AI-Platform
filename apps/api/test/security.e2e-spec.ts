import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ClerkGuard } from './../src/auth/clerk.guard';
import { PrismaService } from './../src/prisma/prisma.service';
import { getQueueToken } from '@nestjs/bull';
import { QUEUE_NAMES } from './../src/queues/queue.constants';

const mockLearnerUser = {
  id: 'learner-1',
  clerkId: 'clerk-learner',
  email: 'learner@org-a.com',
  fullName: 'Learner A',
  role: 'LEARNER',
  organizationId: 'org-a-id',
};

const mockManagerUser = {
  id: 'manager-1',
  clerkId: 'clerk-manager',
  email: 'manager@org-a.com',
  fullName: 'Manager A',
  role: 'MANAGER',
  organizationId: 'org-a-id',
};

const mockOrgBManagerUser = {
  id: 'manager-2',
  clerkId: 'clerk-org-b-manager',
  email: 'manager@org-b.com',
  fullName: 'Manager B',
  role: 'MANAGER',
  organizationId: 'org-b-id',
};

const mockPlatformAdminUser = {
  id: 'platform-admin-1',
  clerkId: 'clerk-platform-admin',
  email: 'admin@platform.com',
  fullName: 'Platform Admin',
  role: 'PLATFORM_ADMIN',
  organizationId: 'org-admin-id',
};

describe('Multi-tenant isolation (e2e)', () => {
  let app: INestApplication<App>;

  const mockPrismaService = {
    department: {
      findFirst: jest.fn().mockImplementation((args) => {
        const { id, organizationId } = args.where;
        // Simulate department A belonging to Org A
        if (id === 'dept-a-id' && organizationId === 'org-a-id') {
          return {
            id: 'dept-a-id',
            name: 'Engineering',
            organizationId: 'org-a-id',
          };
        }
        return null;
      }),
    },
    organization: {
      findUnique: jest.fn().mockImplementation((args) => {
        return { id: args.where.id, name: 'Test Org', isSuspended: false };
      }),
    },
    user: {
      count: jest.fn().mockResolvedValue(0),
    },
    userProgress: {
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({ _avg: { progress: 0 } }),
    },
    learningPath: {
      count: jest.fn().mockResolvedValue(0),
    },
  };

  const mockQueue = {
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
    client: {
      ping: () => Promise.resolve('PONG'),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      // Mock all queues to avoid Redis connection errors
      .overrideProvider(getQueueToken(QUEUE_NAMES.ASSESSMENT))
      .useValue(mockQueue)
      .overrideProvider(getQueueToken(QUEUE_NAMES.PATH_GENERATION))
      .useValue(mockQueue)
      .overrideProvider(getQueueToken(QUEUE_NAMES.RESOURCE_CURATION))
      .useValue(mockQueue)
      .overrideProvider(getQueueToken(QUEUE_NAMES.EXERCISE_GENERATION))
      .useValue(mockQueue)
      .overrideProvider(getQueueToken(QUEUE_NAMES.NOTIFICATION))
      .useValue(mockQueue)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should not allow accessing another org department (Expect: 404)', async () => {
    const response = await request(app.getHttpServer())
      .get('/departments/dept-a-id')
      .set('x-mock-user', 'org_b_manager');

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('Department not found');
  });

  it('should not allow manager accessing another org stats (Expect: 403)', async () => {
    const response = await request(app.getHttpServer())
      .get('/orgs/org-b-id/stats')
      .set('x-mock-user', 'manager');

    expect(response.status).toBe(403);
  });

  it('should not allow learner accessing manager routes (Expect: 403)', async () => {
    const response = await request(app.getHttpServer())
      .get('/manager/activity')
      .set('x-mock-user', 'learner');

    expect(response.status).toBe(403);
  });

  it('should allow PLATFORM_ADMIN to access any org (Expect: 200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/orgs/org-b-id/stats')
      .set('x-mock-user', 'platform_admin');

    expect(response.status).toBe(200);
  });
});
