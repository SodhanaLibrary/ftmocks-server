// update students test case
import { test, expect } from '@playwright/test';
import { initiatePlaywrightRoutes } from 'ftmocks-utils';

test('update students', async ({ page }) => {
 await initiatePlaywrightRoutes(
        page,
        {
          MOCK_DIR: '../testMockData',
          FALLBACK_DIR: '../build',
        },
        'update students'
      );
  await page.goto('http://localhost:4050/');
  await page.locator("//button[contains(text(), 'Students')]").click();
  await page.locator("//*[@id='student-6-edit-btn']").click();
  await page.locator("input[name='name']").click();
  await page.locator("//*[@id='student-form-name']").type('St.Update');
  await page.locator("//button[contains(text(), 'Update')]").click();
  await page.locator("//td[contains(text(), 'St.Update')]").click();
  await page.locator("//td[contains(text(), '19')]").click();
  await page.close();
});
