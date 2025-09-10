import { test, expect } from '@playwright/test';

const HR_CRED = { username: 'hr1', password: 'password' };

test('HR dashboard loads and PDF payslip downloads', async ({ page }) => {
  // Login via UI
  await page.goto('/login.html');
  await page.fill('#username', HR_CRED.username);
  await page.fill('#password', HR_CRED.password);
  await page.click('button:has-text("Continue")');

  // HR should not have 2FA in seed data – redirect to dashboard
  await page.waitForURL('**/hr-dashboard.html');
  await expect(page).toHaveTitle(/HR Dashboard/i);

  // Employee table first row should be visible (ensures rows exist)
  await expect(page.locator('table tbody tr').first()).toBeVisible();

  // Intercept PDF download
  const [ download ] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text="PDF Payslip"')
  ]);
  const buffer = await download.createReadStream();
  expect(buffer).not.toBeNull();
});