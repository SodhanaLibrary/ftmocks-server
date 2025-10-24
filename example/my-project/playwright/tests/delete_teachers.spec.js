// delete teachers test case
import { test, expect } from '@playwright/test';
import { initiatePlaywrightRoutes } from 'ftmocks-utils';

test('delete teachers', async ({ page }) => {
 await initiatePlaywrightRoutes(
        page,
        {
          MOCK_DIR: '../testMockData',
          FALLBACK_DIR: '../build',
        },
        'delete teachers'
      );
  await page.goto('http://localhost:4050/');
  await page.locator("//*[@id='teacher-6-delete-btn']").click();
  await page.close();
});
