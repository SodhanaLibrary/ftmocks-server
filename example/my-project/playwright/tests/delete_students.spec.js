// delete students test case
import { test, expect } from '@playwright/test';
import { initiatePlaywrightRoutes } from 'ftmocks-utils';

test('delete students', async ({ page }) => {
 await initiatePlaywrightRoutes(
        page,
        {
          MOCK_DIR: '../testMockData',
          FALLBACK_DIR: '../build',
        },
        'delete students'
      );
  await page.goto('http://localhost:4050/');
  await page.locator("//button[contains(text(), 'Students')]").click();
  await page.locator("//*[@id='student-6-delete-btn']").click();
  await page.close();
});
