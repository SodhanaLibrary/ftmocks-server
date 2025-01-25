// @ts-check
import { test, expect } from '@playwright/test';
import { 
  initiatePlaywrightRoutes,
} from 'ftmocks-utils';
import { ftmocksConifg } from './test-config';

// create teachers test case
test('create teachers', async ({ page }) => {
  await initiatePlaywrightRoutes(page, ftmocksConifg, 'create teachers');
  await page.goto('http://localhost:4050/');
  await page.locator("//*[@id='teacher-form-name']").click();
  await page.locator("//*[@id='teacher-form-name']").evaluate(el => el.value = 'a');
  await page.locator("//*[@id='teacher-form-name']").evaluate(el => el.value = 'ab');
  await page.locator("//*[@id='teacher-form-name']").evaluate(el => el.value = 'abc');
  await page.locator("//*[@id='teacher-form-subject']").click();
  await page.locator("//*[@id='teacher-form-subject']").evaluate(el => el.value = 'm');
  await page.locator("//*[@id='teacher-form-subject']").evaluate(el => el.value = 'ma');
  await page.locator("//*[@id='teacher-form-subject']").evaluate(el => el.value = 'mat');
  await page.locator("//*[@id='teacher-form-subject']").evaluate(el => el.value = 'math');
  await page.locator("//*[@id='teacher-form-subject']").evaluate(el => el.value = 'maths');
  await page.locator("//*[@id='teacher-form-experience']").evaluate(el => el.value = '6');
  await page.locator("//*[@id='teacher-form-experience']").click();
  await page.locator("//*[@id='teacher-form-submit']").click();
});

// update teachers test case
test('update teachers', async ({ page }) => {
  await initiatePlaywrightRoutes(page, ftmocksConifg, 'update teachers');
  await page.goto('http://localhost:4050/');
  await page.locator("//*[@id='teacher-6-edit-btn']").click();
  await page.locator("//*[@id='teacher-form-experience']").click();
  await page.locator("//*[@id='teacher-form-submit']").click();
});

// delete teachers test case
test('delete teachers', async ({ page }) => {
  await initiatePlaywrightRoutes(page, ftmocksConifg, 'delete teachers');
  await page.goto('http://localhost:4050/');
  await page.locator("//*[@id='teacher-6-delete-btn']").click();
});

// create students test case
test('create students', async ({ page }) => {
  await initiatePlaywrightRoutes(page, ftmocksConifg, 'create students');
  await page.goto('http://localhost:4050/');
  await page.locator("//*[@id='header-menu-students']").click();
  await page.locator("//*[@id='student-form-name']").click();
  await page.locator("//*[@id='student-form-name']").evaluate(el => el.value = 's');
  await page.locator("//*[@id='student-form-name']").evaluate(el => el.value = 'sr');
  await page.locator("//*[@id='student-form-name']").evaluate(el => el.value = 'sri');
  await page.locator("//*[@id='student-form-age']").click();
  await page.locator("//*[@id='student-form-grade']").click();
  await page.locator("//*[@id='student-form-grade']").evaluate(el => el.value = 'A');
  await page.locator("//*[@id='student-form-submit']").click();
});

// update students test case
test('update students', async ({ page }) => {
  await initiatePlaywrightRoutes(page, ftmocksConifg, 'update students');
  await page.goto('http://localhost:4050/');
  await page.locator("//*[@id='header-menu-students']").click();
  await page.locator("//*[@id='student-6-edit-btn']").click();
  await page.locator("//*[@id='student-form-grade']").click();
  await page.locator("//*[@id='student-form-grade']").evaluate(el => el.value = 'B');
  await page.locator("//*[@id='student-form-submit']").click();
});

// delete students test case
test('delete students', async ({ page }) => {
  await initiatePlaywrightRoutes(page, ftmocksConifg, 'delete students');
  await page.goto('http://localhost:4050/');
  await page.locator("//*[@id='header-menu-students']").click();
  await page.locator("//*[@id='student-6-delete-btn']").click();
});

// create subjects test case
test('create subjects', async ({ page }) => {
  await initiatePlaywrightRoutes(page, ftmocksConifg, 'create subjects');
  await page.goto('http://localhost:4050/');
  await page.locator("//*[@id='header-menu-subjects']").click();
  await page.locator("//*[@id='subject-form-name']").click();
  await page.locator("//*[@id='subject-form-name']").evaluate(el => el.value = 't');
  await page.locator("//*[@id='subject-form-name']").evaluate(el => el.value = 'te');
  await page.locator("//*[@id='subject-form-name']").evaluate(el => el.value = 'tel');
  await page.locator("//*[@id='subject-form-name']").evaluate(el => el.value = 'telug');
  await page.locator("//*[@id='subject-form-name']").evaluate(el => el.value = 'telu');
  await page.locator("//*[@id='subject-form-name']").evaluate(el => el.value = 'telugu');
  await page.locator("//*[@id='subject-form-credits']").click();
  await page.locator("//*[@id='subject-form-submit']").click();
});

// update subjects test case
test('update subjects', async ({ page }) => {
  await initiatePlaywrightRoutes(page, ftmocksConifg, 'update subjects');
  await page.goto('http://localhost:4050/');
  await page.locator("//*[@id='header-menu-subjects']").click();
  await page.locator("//*[@id='subject-6-edit-btn']").click();
  await page.locator("//*[@id='subject-form-credits']").click();
  await page.locator("//*[@id='subject-form-submit']").click();
});

// delete subjects test case
test('delete subjects', async ({ page }) => {
  await initiatePlaywrightRoutes(page, ftmocksConifg, 'delete subjects');
  await page.goto('http://localhost:4050/');
  await page.locator("//*[@id='header-menu-subjects']").click();
  await page.locator("//*[@id='subject-6-delete-btn']").click();
});
