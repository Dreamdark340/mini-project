import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const TRADER = { username: 'aaron', password: 'password' };
const csvPath = path.resolve(__dirname, 'fixtures', 'trades.csv');

// Ensure fixture directory & file exist
if (!fs.existsSync(path.dirname(csvPath))) {
  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  fs.writeFileSync(csvPath, 'date,asset,qty,price,fee\n2024-01-01,BTC,0.1,30000,5\n2024-01-02,ETH,-1,2000,2');
}

test('Wallet import modal shows row validation', async ({ page }) => {
  await page.goto('/login.html');
  await page.fill('#username', TRADER.username);
  await page.fill('#password', TRADER.password);
  await page.click('button:has-text("Continue")');

  await page.waitForURL('**/employee-dashboard.html');

  // Navigate to wallet import (assuming button)
  await page.click('text="Import Wallet"');

  // Upload CSV
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('input[type="file"]')
  ]);
  await fileChooser.setFiles(csvPath);

  // Modal preview rows appear
  await expect(page.locator('.import-preview-row')).toHaveCountGreaterThan(0);

  // Import button enabled
  await expect(page.locator('button:has-text("Import")')).toBeEnabled();
});