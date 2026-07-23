import { test as base, APIRequestContext } from '@playwright/test';

export type TestFixtures = {
  apiContext: APIRequestContext;
  testOrg: { id: string; name: string; email: string };
  testManager: { id: string; email: string; password: string };
  testEmployee: { id: string; email: string; inviteToken: string };
  testPath: { id: string; title: string };
};

const API_URL = process.env.TEST_API_URL ?? 'http://localhost:3001';
const INTERNAL_SECRET =
  process.env.INTERNAL_SERVICE_SECRET ?? 'test-secret';

export const test = base.extend<TestFixtures>({
  /* ── Low-level API context (bypasses browser auth) ── */
  apiContext: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': INTERNAL_SECRET,
        // Test seed token — allows test setup without Clerk
        'X-Test-Mode': 'true',
        'X-Test-Secret': process.env.TEST_SEED_SECRET ?? 'test',
      },
    });
    await use(ctx);
    await ctx.dispose();
  },

  /* ── Create a test organization ── */
  testOrg: async ({ apiContext }, use) => {
    const res = await apiContext.post('/test/seed/org', {
      data: {
        name: `Test Org ${Date.now()}`,
        email: `org-${Date.now()}@test.learnai.com`,
      },
    });
    const org = (await res.json()).data;
    await use(org);
    // Cleanup after test
    await apiContext.delete(`/test/seed/org/${org.id}`);
  },

  /* ── Create a manager for the test org ── */
  testManager: async ({ apiContext, testOrg }, use) => {
    const res = await apiContext.post('/test/seed/user', {
      data: {
        organizationId: testOrg.id,
        role: 'MANAGER',
        email: `manager-${Date.now()}@test.learnai.com`,
        fullName: 'Test Manager',
      },
    });
    const manager = (await res.json()).data;
    await use(manager);
  },

  /* ── Create an employee with pending invite ── */
  testEmployee: async ({ apiContext, testOrg }, use) => {
    const res = await apiContext.post('/test/seed/invite', {
      data: {
        organizationId: testOrg.id,
        email: `employee-${Date.now()}@test.learnai.com`,
        fullName: 'Test Employee',
      },
    });
    const employee = (await res.json()).data;
    await use(employee);
    await apiContext.delete(`/test/seed/invite/${employee.id}`);
  },

  /* ── Create a completed assessment + mock path ── */
  testPath: async ({ apiContext, testOrg }, use) => {
    // Create a user with completed assessment
    const userRes = await apiContext.post('/test/seed/user', {
      data: {
        organizationId: testOrg.id,
        role: 'LEARNER',
        email: `learner-${Date.now()}@test.learnai.com`,
        fullName: 'Test Learner',
        assessmentStatus: 'completed',
      },
    });
    const user = (await userRes.json()).data;

    // Create a mock learning path for them
    const pathRes = await apiContext.post('/test/seed/path', {
      data: {
        organizationId: testOrg.id,
        assignedUserId: user.id,
        title: 'Test TypeScript Path',
        domain: 'Software Engineering',
      },
    });
    const path = (await pathRes.json()).data;
    await use(path);
  },
});

export { expect } from '@playwright/test';
