import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type BrowserContext, chromium, type Page, test } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../../.output/chrome-mv3');
const OUT_DIR = path.resolve(__dirname, '../../screenshots');
const SIZE = { width: 1280, height: 800 } as const;

let context: BrowserContext;
let extensionId: string;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [
      `--headless=new`,
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      `--window-size=${SIZE.width},${SIZE.height}`,
    ],
    viewport: SIZE,
    recordVideo: { dir: OUT_DIR, size: SIZE },
  });
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent('serviceworker');
  extensionId = worker.url().split('/')[2];
});

test.afterAll(async () => {
  await context?.close();
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.startsWith('page@') && f.endsWith('.webm')) {
      fs.unlinkSync(path.join(OUT_DIR, f));
    }
  }
  fs.rmSync(path.join(OUT_DIR, '.playwright-output'), { recursive: true, force: true });
});

async function openPage(file: string): Promise<Page> {
  const page = await context.newPage();
  await page.setViewportSize(SIZE);
  await page.goto(`chrome-extension://${extensionId}/${file}`);
  await page.waitForLoadState('networkidle');
  return page;
}

async function finalize(page: Page, name: string) {
  const video = page.video();
  await page.close();
  if (video) {
    const src = await video.path();
    fs.renameSync(src, path.join(OUT_DIR, `${name}-1280x800.webm`));
  }
}

async function fillSearch(page: Page) {
  await page.getByLabel('Keyword').fill('react hooks');
  await page.waitForTimeout(500);
  await page.getByLabel('File or Extension').fill('tsx,ts');
  await page.waitForTimeout(500);
}

async function clickCode(page: Page) {
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  await page.waitForTimeout(1500);
}

test('popup', async () => {
  const page = await openPage('popup.html');
  await page.addStyleTag({
    content: `
      html, body { min-height: 100vh; }
      body { display: flex; align-items: center; justify-content: center; }
    `,
  });
  await fillSearch(page);
  await page.screenshot({ path: path.join(OUT_DIR, 'popup-1280x800.png') });
  await clickCode(page);
  await finalize(page, 'popup');
});

test('sidepanel', async () => {
  const page = await openPage('sidepanel.html');
  await fillSearch(page);
  await page.screenshot({ path: path.join(OUT_DIR, 'sidepanel-1280x800.png') });
  await clickCode(page);
  await finalize(page, 'sidepanel');
});

test('options', async () => {
  const page = await openPage('options.html');
  await page.screenshot({ path: path.join(OUT_DIR, 'options-1280x800.png') });
  await page.waitForTimeout(1500);
  await finalize(page, 'options');
});
