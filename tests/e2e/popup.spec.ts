import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type BrowserContext, chromium, expect, test } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../../.output/chrome-mv3');

let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [
      `--headless=new`,
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent('serviceworker');
  extensionId = worker.url().split('/')[2];
});

test.afterAll(async () => {
  await context?.close();
});

test('popup renders the title', async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.getByText('GitHub Search Extension')).toBeVisible();
});

test('clicking Repositories button opens a GitHub repository search tab', async () => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await page.getByLabel('Keyword').fill('react hooks');

  const newPagePromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Repositories', exact: true }).click();

  const newPage = await newPagePromise;
  await newPage.waitForLoadState('domcontentloaded');
  expect(newPage.url()).toContain('github.com/search');
  expect(newPage.url()).toContain('type=repositories');
  expect(decodeURIComponent(newPage.url())).toContain('react');
  expect(decodeURIComponent(newPage.url())).toContain('hooks');
});
