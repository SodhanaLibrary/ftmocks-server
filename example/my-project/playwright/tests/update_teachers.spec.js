// update teachers test case
import { test, expect } from '@playwright/test';
import { initiatePlaywrightRoutes } from 'ftmocks-utils';

test('update teachers', async ({ page }) => {
 await initiatePlaywrightRoutes(
        page,
        {
          MOCK_DIR: '../testMockData',
          FALLBACK_DIR: '../build',
        },
        'update teachers'
      );
  await page.goto('http://localhost:4050/');
  await page.locator("//*[@id='teacher-6-edit-btn']").click();
  await page.locator("input[name='name']").click();
  await page.locator("//*[@id='teacher-form-name']").type('Dr.Update');
  await page.locator("//button[contains(text(), 'Update')]").click();
  await page.locator("//td[contains(text(), 'Dr.Update')]").click();
  await page.locator("//td[contains(text(), 'Chem')]").click();
  await page.close();
});
