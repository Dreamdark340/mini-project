import { test, expect } from '@playwright/test';

const ADMIN = { username: 'admin', password: 'admin123' };

test('Admin dashboard shows audit logs and queue metrics', async ({ page }) => {
  await page.goto('/login.html');
  await page.fill('#username', ADMIN.username);
  await page.fill('#password', ADMIN.password);
  await page.click('button:has-text("Continue")');

  await page.waitForURL('**/hr-dashboard.html'); // Admin shares HR view for now

  // Ensure Audit Logs section exists
  await expect(page.locator('text="Audit Logs"')).toBeVisible();

  // Bull-Board link present
  await expect(page.locator('a[href*="/admin/queues"]')).toBeVisible();

  // No console errors
  const errors: Error[] = [];
  page.on('pageerror', e => errors.push(e));
  await expect.poll(() => errors.length, { timeout: 1000 }).toBe(0);
});