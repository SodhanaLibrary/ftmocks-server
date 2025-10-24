// create teachers test case
import { test, expect } from '@playwright/test';
import { initiatePlaywrightRoutes } from 'ftmocks-utils';

test('create teachers', async ({ page }) => {
 await initiatePlaywrightRoutes(
        page,
        {
          MOCK_DIR: '../testMockData',
          FALLBACK_DIR: '../build',
        },
        'create teachers'
      );
  await page.goto('http://localhost:4050/');
  await page.locator("input[name='name']").click();
  await page.locator("//*[@id='teacher-form-name']").type('Dr.New');
  await page.locator("input[name='subject']").click();
  await page.locator("//*[@id='teacher-form-subject']").type('Chem');
  await page.locator("//*[@id='teacher-form-experience']").click();
  await page.locator("//*[@id='teacher-form-experience']").type('3');
  await page.locator("//button[contains(text(), 'Create')]").click();
  await page.locator("//td[contains(text(), 'Dr.New')]").click();
  await page.locator("//td[contains(text(), 'Chem')]").click();
  await page.close();
});
