import { test, expect } from '@playwright/test';

// This suite does NOT use stored auth — tests registration flow
test.use({ storageState: undefined });

test.describe('Company Registration', () => {
  test('displays registration form correctly', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveTitle(/Register|Sign Up|LearnAI/i);

    await expect(
      page.getByLabel(/company name/i).or(page.getByPlaceholder(/company/i)),
    ).toBeVisible();
    await expect(
      page.getByLabel(/your email/i).or(page.getByPlaceholder(/email/i)),
    ).toBeVisible();
    await expect(
      page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i)),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /get started|register|create account/i }),
    ).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/register');

    await page
      .getByRole('button', { name: /get started|register|create account/i })
      .click();

    // Inline errors should appear
    await expect(
      page.getByText(/company name is required|enter company name|required/i).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('shows error for invalid email format', async ({ page }) => {
    await page.goto('/register');

    const companyField = page.getByLabel(/company name/i).or(page.getByPlaceholder(/company/i));
    await companyField.fill('Acme Corp');

    const emailField = page.getByLabel(/your email/i).or(page.getByPlaceholder(/email/i));
    await emailField.fill('not-an-email');

    const pwdField = page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i));
    await pwdField.fill('Password123!');

    await page
      .getByRole('button', { name: /get started|register|create account/i })
      .click();

    await expect(
      page.getByText(/valid email|invalid email/i).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('can register a new company', async ({ page }) => {
    const uniqueEmail = `register-${Date.now()}@e2etest.com`;

    await page.goto('/register');

    const companyField = page.getByLabel(/company name/i).or(page.getByPlaceholder(/company/i));
    await companyField.fill(`E2E Test Company ${Date.now()}`);

    const emailField = page.getByLabel(/your email/i).or(page.getByPlaceholder(/email/i));
    await emailField.fill(uniqueEmail);

    const pwdField = page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i));
    await pwdField.fill('TestPassword123!');

    // If "number of employees" field exists
    const empField = page.getByLabel(/employees/i);
    if (await empField.isVisible().catch(() => false)) {
      await empField.selectOption('11-50');
    }

    await page
      .getByRole('button', { name: /get started|register|create account/i })
      .click();

    // Should redirect to manager dashboard or onboarding
    await page.waitForURL(
      (url) =>
        url.pathname.includes('/manage') ||
        url.pathname.includes('/onboarding') ||
        url.pathname.includes('/sign-in'),
      { timeout: 20_000 },
    );
    expect(page.url()).toMatch(/manage|onboarding|sign-in/);
  });
});
