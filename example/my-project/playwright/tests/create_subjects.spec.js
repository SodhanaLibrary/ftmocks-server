// create subjects test case
import { test, expect } from '@playwright/test';
import { initiatePlaywrightRoutes } from 'ftmocks-utils';

test('create subjects', async ({ page }) => {
 await initiatePlaywrightRoutes(
        page,
        {
          MOCK_DIR: '../testMockData',
          FALLBACK_DIR: '../build',
        },
        'create subjects'
      );
  await page.goto('http://localhost:4050/');
  await page.locator("//button[contains(text(), 'Subjects')]").click();
  await page.locator("input[name='name']").click();
  await page.locator("//*[@id='subject-form-name']").type('Sb.new');
  await page.locator("//*[@id='subject-form-credits']").click();
  await page.locator("//*[@id='subject-form-credits']").type('5');
  await page.locator("//button[contains(text(), 'Create')]").click();
  await page.locator("//td[contains(text(), 'Sb.new')]").click();
  await page.locator("//td[contains(text(), '5')]").click();
  await page.close();
});
