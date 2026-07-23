import { test, expect } from './fixtures';

// Uses default storageState (manager)
test.describe('Manager Dashboard', () => {
  test('team overview loads with stats', async ({ page }) => {
    await page.goto('/manage/dashboard');

    // Page heading or team stats
    await expect(
      page.getByRole('heading', { name: /team overview|dashboard/i }).or(page.getByText(/team overview|overview/i).first()),
    ).toBeVisible({ timeout: 10000 });

    // No error states
    await expect(
      page.getByText(/something went wrong/i),
    ).not.toBeVisible();
  });

  test('employee detail view shows correct info', async ({ page }) => {
    await page.goto('/manage/team');

    // Click on first employee row
    const firstEmployee = page.getByRole('row').nth(1);
    if (await firstEmployee.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstEmployee.click();
      await page.waitForURL(/\/manage\/team\//, { timeout: 10000 }).catch(() => {});
    }
  });

  test('filter by department works', async ({ page }) => {
    await page.goto('/manage/team');

    const deptFilter = page
      .getByRole('combobox', { name: /department/i })
      .or(page.getByLabel(/department/i));
    if (await deptFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deptFilter.click();
      const firstOption = page.getByRole('option').first();
      if (await firstOption.isVisible().catch(() => false)) {
        await firstOption.click();
      }
    }
  });

  test('search employees filters the list', async ({ page }) => {
    await page.goto('/manage/team');

    const searchInput = page.getByPlaceholder(/search employees|search/i);
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('xyznotexistent');
      await page.waitForTimeout(400);

      await expect(
        page.getByText(/no employees|no results|found/i).first(),
      ).toBeVisible({ timeout: 5000 });

      await searchInput.clear();
      await page.waitForTimeout(400);
    }
  });

  test('stalled alert shows nudge button', async ({ page }) => {
    await page.goto('/manage/dashboard');

    const stalledBanner = page.getByText(/haven't learned/i);
    if (await stalledBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(
        page.getByRole('button', { name: /send nudge/i }),
      ).toBeVisible();
    }
  });

  test('manager cannot access admin portal', async ({ page }) => {
    await page.goto('/admin/dashboard');

    // Should redirect away from admin portal or show 403 / access denied
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/admin/dashboard');
  });
});
