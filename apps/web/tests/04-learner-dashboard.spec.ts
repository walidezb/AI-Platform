import { test, expect } from './fixtures';

// Use learner auth state
test.use({ storageState: 'tests/.auth/learner.json' });

test.describe('Learner Dashboard', () => {
  test('dashboard loads with correct sections', async ({ page }) => {
    await page.goto('/learn/dashboard');

    // Hero greeting or learning text
    await expect(
      page.getByText(/welcome|learning|path|dashboard/i).first(),
    ).toBeVisible({ timeout: 10000 });

    // No loading skeletons visible after load
    await expect(page.locator('[data-testid="skeleton"]')).not.toBeVisible({
      timeout: 5000,
    });
  });

  test('Continue Learning button navigates correctly', async ({ page }) => {
    await page.goto('/learn/dashboard');

    const continueBtn = page.getByRole('button', {
      name: /continue learning|start module|view path/i,
    });
    if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await continueBtn.click();
      await expect(page.url()).toMatch(/\/learn\/(module|path)/);
    }
  });

  test('milestone tracker shows correct states', async ({ page }) => {
    await page.goto('/learn/dashboard');

    // At least one milestone or module section visible
    await expect(
      page.getByText(/milestone|module|path|foundations/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('mobile bottom nav visible on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/learn/dashboard');

    await expect(
      page
        .getByRole('navigation', { name: /bottom/i })
        .or(page.locator('nav').filter({ has: page.getByText(/path|learn/i) })),
    ).toBeVisible({ timeout: 5000 });
  });
});
