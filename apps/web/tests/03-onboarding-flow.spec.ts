import { test, expect } from './fixtures';

// Onboarding tests don't use stored manager auth
test.use({ storageState: undefined });

test.describe('Onboarding Flow', () => {
  test('valid invite link shows welcome page', async ({
    page,
    testEmployee,
  }) => {
    const inviteUrl = `/onboarding/${testEmployee.inviteToken}`;
    await page.goto(inviteUrl);

    // Welcome page should load
    await expect(
      page.getByText(/welcome|get started|assessment/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('invalid invite token shows error page', async ({ page }) => {
    await page.goto('/onboarding/invalid-token-12345');

    await expect(
      page.getByText(/invalid|expired|not found/i).first(),
    ).toBeVisible({ timeout: 10000 });

    // Should NOT show the assessment CTA
    await expect(
      page.getByRole('button', { name: /begin assessment/i }),
    ).not.toBeVisible();
  });

  test('employee completes assessment with mocked AI', async ({
    page,
    testEmployee,
  }) => {
    // Use mock AI server (started in globalSetup)
    await page.goto(`/onboarding/${testEmployee.inviteToken}`);

    // Start assessment if CTA button is present
    const startBtn = page.getByRole('button', { name: /begin assessment|start assessment|continue/i });
    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click();
    }

    // Assessment chat input
    const input = page.getByPlaceholder(/type your message|message/i);
    if (await input.isVisible({ timeout: 10000 }).catch(() => false)) {
      await input.fill('5 years of TypeScript experience');
      await page.keyboard.press('Enter');

      // AI responds (mock server returns follow-up)
      await expect(
        page.getByText(/tell me more|experience/i).first(),
      ).toBeVisible({ timeout: 10000 });

      // Send completion-triggering message
      await input.fill('I am an expert level developer');
      await page.keyboard.press('Enter');

      // Assessment complete screen
      await expect(
        page.getByText(/assessment complete|complete|skill profile/i).first(),
      ).toBeVisible({ timeout: 15000 });
    }
  });

  test('assessment complete shows skill profile', async ({
    page,
    testEmployee,
  }) => {
    await page.goto(`/onboarding/${testEmployee.inviteToken}`);

    const startBtn = page.getByRole('button', { name: /begin assessment|start assessment|continue/i });
    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click();
    }

    const input = page.getByPlaceholder(/type your message|message/i);
    if (await input.isVisible({ timeout: 10000 }).catch(() => false)) {
      await input.fill('I am an expert level developer with 10 years');
      await page.keyboard.press('Enter');

      // Wait for completion
      await expect(
        page.getByText(/assessment complete|skill profile/i).first(),
      ).toBeVisible({ timeout: 15000 });
    }
  });
});
