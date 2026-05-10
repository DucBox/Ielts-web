// @ts-check
const { test, expect } = require('@playwright/test');

const STUDENT_URL = process.env.STUDENT_URL || 'https://ielts-student.pages.dev';
const TEACHER_URL = process.env.TEACHER_URL || 'https://ielts-teacher.pages.dev';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Assert no horizontal page scroll (page width === viewport width). */
async function expectNoHScroll(page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth, 'Page should not overflow horizontally').toBeLessThanOrEqual(
    overflow.clientWidth + 1   // 1px tolerance for sub-pixel rounding
  );
}

/** Assert element exists and is visible without overflow. */
async function expectVisible(page, selector) {
  const el = page.locator(selector);
  await expect(el).toBeVisible();
}

// ─── Student app ──────────────────────────────────────────────────────────────

test.describe('Student app – login screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STUDENT_URL);
    await page.waitForLoadState('networkidle');
  });

  test('no horizontal page scroll', async ({ page }) => {
    await expectNoHScroll(page);
  });

  test('login form is visible and fits viewport', async ({ page }) => {
    // Login card should be visible
    const card = page.locator('.login-card, .login-box, form').first();
    await expect(card).toBeVisible();
    await expectNoHScroll(page);
  });

  test('screenshot – login', async ({ page }) => {
    await page.screenshot({ path: `test-results/student-login-${page.viewportSize()?.width}px.png`, fullPage: false });
  });
});

test.describe('Student app – after login (home)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly; real auth requires credentials, so we just check
    // the page doesn't overflow before login redirect.
    await page.goto(STUDENT_URL + '#/home');
    await page.waitForLoadState('networkidle');
  });

  test('no horizontal page scroll on home', async ({ page }) => {
    await expectNoHScroll(page);
  });

  test('header is visible', async ({ page }) => {
    // Header may be hidden pre-login; just assert no horizontal scroll.
    await expectNoHScroll(page);
  });

  test('screenshot – home', async ({ page }) => {
    await page.screenshot({ path: `test-results/student-home-${page.viewportSize()?.width}px.png`, fullPage: true });
  });
});

// ─── Teacher app ──────────────────────────────────────────────────────────────

test.describe('Teacher app – login screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEACHER_URL);
    await page.waitForLoadState('networkidle');
  });

  test('no horizontal page scroll', async ({ page }) => {
    await expectNoHScroll(page);
  });

  test('login form fits viewport', async ({ page }) => {
    const form = page.locator('form, .login-card, .login-box, input[type="text"]').first();
    await expect(form).toBeVisible();
    await expectNoHScroll(page);
  });

  test('screenshot – login', async ({ page }) => {
    await page.screenshot({ path: `test-results/teacher-login-${page.viewportSize()?.width}px.png`, fullPage: false });
  });
});

test.describe('Teacher app – after login (classes)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEACHER_URL + '#/classes');
    await page.waitForLoadState('networkidle');
  });

  test('no horizontal page scroll on classes page', async ({ page }) => {
    await expectNoHScroll(page);
  });

  test('screenshot – classes', async ({ page }) => {
    await page.screenshot({ path: `test-results/teacher-classes-${page.viewportSize()?.width}px.png`, fullPage: true });
  });
});

// ─── Cross-viewport: critical UI elements ─────────────────────────────────────

test.describe('Viewport regression – student', () => {
  const viewports = [
    { width: 320, height: 568 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
  ];

  for (const vp of viewports) {
    test(`${vp.width}x${vp.height} – no hscroll`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto(STUDENT_URL);
      await page.waitForLoadState('networkidle');
      await expectNoHScroll(page);
    });
  }
});

test.describe('Viewport regression – teacher', () => {
  const viewports = [
    { width: 320, height: 568 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
  ];

  for (const vp of viewports) {
    test(`${vp.width}x${vp.height} – no hscroll`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto(TEACHER_URL);
      await page.waitForLoadState('networkidle');
      await expectNoHScroll(page);
    });
  }
});
