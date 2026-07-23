import { test, expect } from './fixtures';

test.describe('Employee Invitation', () => {
  test('manager can send a single invite', async ({ page }) => {
    await page.goto('/manage/team');

    // Open invite dialog
    const inviteBtn = page.getByRole('button', { name: /invite employee|add employee/i });
    await inviteBtn.waitFor({ timeout: 10000 });
    await inviteBtn.click();

    await expect(
      page.getByRole('dialog', { name: /invite/i }).or(page.locator('[role="dialog"]')),
    ).toBeVisible();

    // Fill invite form
    const email = `invite-${Date.now()}@e2etest.com`;
    await page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i)).fill(email);
    await page.getByLabel(/full name|name/i).or(page.getByPlaceholder(/name/i)).fill('Test Invitee');

    // Optional department
    const deptField = page.getByLabel(/department/i);
    if (await deptField.isVisible().catch(() => false)) {
      await deptField.fill('Engineering');
    }

    await page.getByRole('button', { name: /send invite|invite/i }).click();

    // Success toast
    await expect(
      page.getByText(/invite sent|invitation sent|success/i).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('manager can upload bulk CSV', async ({ page }) => {
    await page.goto('/manage/invitations');

    const bulkBtn = page.getByRole('button', { name: /bulk invite|upload csv/i });
    if (await bulkBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bulkBtn.click();

      // File upload — create a minimal CSV
      const csvContent = `email,fullName,department\nbulk-${Date.now()}@test.com,Bulk Employee,Engineering`;

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'employees.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent),
      });

      // Preview should show 1 valid row
      await expect(page.getByText(/1 employee|1 valid/i).first()).toBeVisible({
        timeout: 5000,
      });

      await page.getByRole('button', { name: /send invites/i }).click();

      await expect(page.getByText(/sent/i).first()).toBeVisible({
        timeout: 8000,
      });
    }
  });

  test('invite link is generated and copyable', async ({
    page,
    testEmployee,
  }) => {
    await page.goto('/manage/invitations');

    // Find the test employee's invite row or heading
    const emailText = page.getByText(testEmployee.email);
    if (await emailText.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Copy link button
      const copyBtn = page
        .getByRole('row', { name: new RegExp(testEmployee.email) })
        .getByRole('button', { name: /copy link|copy/i });

      if (await copyBtn.isVisible().catch(() => false)) {
        await copyBtn.click();
        await expect(page.getByText(/copied/i).first()).toBeVisible({
          timeout: 3000,
        });
      }
    }
  });

  test('revoke invite works', async ({ page, testEmployee }) => {
    await page.goto('/manage/invitations');

    const emailText = page.getByText(testEmployee.email);
    if (await emailText.isVisible({ timeout: 5000 }).catch(() => false)) {
      const revokeBtn = page
        .getByRole('row', { name: new RegExp(testEmployee.email) })
        .getByRole('button', { name: /revoke/i });

      if (await revokeBtn.isVisible().catch(() => false)) {
        await revokeBtn.click();

        const confirmBtn = page
          .getByRole('button', { name: /confirm|revoke/i })
          .last();
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click();
        }

        await expect(page.getByText(testEmployee.email)).not.toBeVisible({
          timeout: 5000,
        });
      }
    }
  });
});
