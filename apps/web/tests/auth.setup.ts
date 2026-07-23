import { test as setup, expect } from '@playwright/test';

const MANAGER_AUTH_FILE = 'tests/.auth/manager.json';
const LEARNER_AUTH_FILE = 'tests/.auth/learner.json';

setup('authenticate as manager', async ({ page }) => {
  // Use Clerk test credentials (set in .env.test)
  await page.goto('/sign-in');

  const emailField = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i));
  if (await emailField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailField.fill(process.env.TEST_MANAGER_EMAIL || 'test-manager@learnai.com');
    const pwdField = page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i));
    if (await pwdField.isVisible().catch(() => false)) {
      await pwdField.fill(process.env.TEST_MANAGER_PASSWORD || 'TestPassword123!');
    }
    const btn = page.getByRole('button', { name: /continue|sign in/i });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
    }
  }

  await page.context().storageState({ path: MANAGER_AUTH_FILE });
});

setup('authenticate as learner', async ({ page }) => {
  await page.goto('/sign-in');

  const emailField = page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i));
  if (await emailField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailField.fill(process.env.TEST_LEARNER_EMAIL || 'test-learner@learnai.com');
    const pwdField = page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i));
    if (await pwdField.isVisible().catch(() => false)) {
      await pwdField.fill(process.env.TEST_LEARNER_PASSWORD || 'TestPassword123!');
    }
    const btn = page.getByRole('button', { name: /continue|sign in/i });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
    }
  }

  await page.context().storageState({ path: LEARNER_AUTH_FILE });
});
