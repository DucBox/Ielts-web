// @ts-check
const { defineConfig } = require('@playwright/test');

/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
  },

  projects: [
    // ── Desktop ──────────────────────────────────────────────────────────────
    { name: 'desktop-1280',        use: { viewport: { width: 1280, height: 800 } } },

    // ── Tablet ───────────────────────────────────────────────────────────────
    { name: 'tablet-768-portrait', use: { viewport: { width: 768,  height: 1024 }, isMobile: true, hasTouch: true } },
    { name: 'tablet-820',          use: { viewport: { width: 820,  height: 1180 }, isMobile: true, hasTouch: true } },
    { name: 'tablet-1024-land',    use: { viewport: { width: 1024, height: 768  }, isMobile: true, hasTouch: true } },

    // ── Phone ────────────────────────────────────────────────────────────────
    { name: 'phone-414',           use: { viewport: { width: 414,  height: 896  }, isMobile: true, hasTouch: true } },
    { name: 'phone-390',           use: { viewport: { width: 390,  height: 844  }, isMobile: true, hasTouch: true } },
    { name: 'phone-375',           use: { viewport: { width: 375,  height: 812  }, isMobile: true, hasTouch: true } },
    { name: 'phone-360',           use: { viewport: { width: 360,  height: 800  }, isMobile: true, hasTouch: true } },
    { name: 'phone-320',           use: { viewport: { width: 320,  height: 568  }, isMobile: true, hasTouch: true } },
  ],
});

