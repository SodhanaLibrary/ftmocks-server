// delete subjects test case
import { test, expect } from '@playwright/test';
import { initiatePlaywrightRoutes } from 'ftmocks-utils';

test('delete subjects', async ({ page }) => {
 await initiatePlaywrightRoutes(
        page,
        {
          MOCK_DIR: '../testMockData',
          FALLBACK_DIR: '../build',
        },
        'delete subjects'
      );
  await page.goto('http://localhost:4050/');
  await page.locator("//button[contains(text(), 'Subjects')]").click();
  await page.locator("//*[@id='subject-6-delete-btn']").click();
  await page.close();
});
