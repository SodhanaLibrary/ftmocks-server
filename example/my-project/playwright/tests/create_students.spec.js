// create students test case
import { test, expect } from '@playwright/test';
import { initiatePlaywrightRoutes } from 'ftmocks-utils';

test('create students', async ({ page }) => {
 await initiatePlaywrightRoutes(
        page,
        {
          MOCK_DIR: '../testMockData',
          FALLBACK_DIR: '../build',
        },
        'create students'
      );
  await page.goto('http://localhost:4050/');
  await page.locator("//button[contains(text(), 'Students')]").click();
  await page.locator("input[name='name']").click();
  await page.locator("//*[@id='student-form-name']").type('St.New');
  await page.locator("//*[@id='student-form-age']").click();
  await page.locator("//*[@id='student-form-age']").type('19');
  await page.locator("input[name='grade']").click();
  await page.locator("//*[@id='student-form-grade']").type('A');
  await page.locator("//button[contains(text(), 'Create')]").click();
  await page.locator("//td[contains(text(), 'St.New')]").click();
  await page.locator("//td[contains(text(), '19')]").click();
  await page.close();
});
