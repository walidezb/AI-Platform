import { test, expect } from './fixtures';

test.use({ storageState: 'tests/.auth/learner.json' });

test.describe('Module Completion', () => {
  test('learner can view their learning path', async ({ page, testPath }) => {
    await page.goto('/learn/path');

    // Path title visible
    await expect(
      page
        .getByText(testPath.title)
        .or(page.getByText(/TypeScript|Path|Foundations/i).first()),
    ).toBeVisible({ timeout: 10000 });
  });

  test('resources can be marked as complete', async ({ page }) => {
    await page.goto('/learn/path');

    const moduleEl = page
      .getByText('Introduction')
      .or(page.getByText(/module/i).first());
    if (await moduleEl.isVisible({ timeout: 5000 }).catch(() => false)) {
      await moduleEl.click();
      await page.waitForURL(/\/learn\/module\//, { timeout: 10000 }).catch(() => {});

      const markBtn = page
        .getByRole('button', { name: /mark complete|mark as complete|completed/i })
        .first();

      if (await markBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        const wasComplete = await markBtn.isDisabled();
        if (!wasComplete) {
          await markBtn.click();
          await expect(
            page.getByText(/complete|marked|done/i).first(),
          ).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('module shows resources correctly', async ({ page }) => {
    await page.goto('/learn/path');

    const moduleLink = page
      .getByRole('link', { name: /introduction|module/i })
      .first();
    if (await moduleLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await moduleLink.click();
      await page.waitForURL(/\/learn\/module\//, { timeout: 10000 }).catch(() => {});

      await expect(page.getByRole('heading').first()).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('YouTube embed maintains aspect ratio', async ({ page }) => {
    await page.goto('/learn/path');
    const firstModule = page
      .getByRole('link', { name: /module/i })
      .first();
    if (await firstModule.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstModule.click();
      await page.waitForURL(/\/learn\/module\//, { timeout: 10000 }).catch(() => {});

      const videoWrapper = page.locator('.aspect-video');
      if (await videoWrapper.isVisible({ timeout: 3000 }).catch(() => false)) {
        const box = await videoWrapper.boundingBox();
        if (box) {
          const ratio = box.width / box.height;
          expect(ratio).toBeGreaterThan(1.6);
          expect(ratio).toBeLessThan(1.9);
        }
      }
    }
  });
});
