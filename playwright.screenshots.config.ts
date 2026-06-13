import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/screenshots',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: 'screenshots/.playwright-output',
});
