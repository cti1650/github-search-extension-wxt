import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type BrowserContext, chromium, type Frame, type Page, test } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../../.output/chrome-mv3');
const OUT_DIR = path.resolve(__dirname, '../../screenshots');
const SIZE = { width: 1280, height: 800 } as const;
const BASE_URL = 'https://github.com/explore';
const MANIFEST_PATH = path.join(EXTENSION_PATH, 'manifest.json');
const MOCKUP_FILES = ['mockup.html', 'mockup.js'] as const;

let context: BrowserContext;
let extensionId: string;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Allow popup/sidepanel/mockup pages to be iframed from any origin (only
  // patches .output, which is gitignored; production manifest stays untouched).
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  manifest.web_accessible_resources = [
    ...(manifest.web_accessible_resources ?? []),
    {
      resources: ['popup.html', 'sidepanel.html', 'mockup.html'],
      matches: ['<all_urls>'],
    },
  ];
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  // Copy the mockup chrome (host page that frames github + the extension UI).
  for (const f of MOCKUP_FILES) {
    fs.copyFileSync(path.resolve(__dirname, f), path.join(EXTENSION_PATH, f));
  }

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
  for (const f of MOCKUP_FILES) {
    fs.rmSync(path.join(EXTENSION_PATH, f), { force: true });
  }
});

async function openExtensionPage(file: string): Promise<Page> {
  const page = await context.newPage();
  await page.setViewportSize(SIZE);
  await page.goto(`chrome-extension://${extensionId}/${file}`, { waitUntil: 'load' });
  return page;
}

async function openWithOverlay(mode: 'popup' | 'sidepanel'): Promise<{
  page: Page;
  overlayFrame: Frame;
}> {
  const page = await context.newPage();
  await page.setViewportSize(SIZE);

  // Strip framing restrictions so github.com can be iframed. Only http(s) URLs
  // — Playwright's route.fetch can't handle chrome-extension://.
  await page.route(/^https?:\/\//, async (route) => {
    try {
      const response = await route.fetch();
      const body = await response.body();
      const headers = { ...response.headers() };
      delete headers['x-frame-options'];
      delete headers['content-security-policy'];
      delete headers['content-security-policy-report-only'];
      delete headers['cross-origin-opener-policy'];
      delete headers['cross-origin-embedder-policy'];
      delete headers['cross-origin-resource-policy'];
      await route.fulfill({ status: response.status(), headers, body });
    } catch {
      await route.continue();
    }
  });

  await page.goto(
    `chrome-extension://${extensionId}/mockup.html?mode=${mode}&base=${encodeURIComponent(BASE_URL)}`,
    { waitUntil: 'load' },
  );

  // Wait for both iframes to mount and for the overlay's React app to render.
  await page.waitForSelector('iframe#overlay', { state: 'attached' });
  const overlayHandle = await page.$('iframe#overlay');
  const overlayFrame = await overlayHandle!.contentFrame();
  if (!overlayFrame) throw new Error('overlay frame missing');
  await overlayFrame.waitForLoadState('domcontentloaded');
  await overlayFrame.locator('input').first().waitFor({ state: 'attached' });

  // Give the backdrop github iframe time to settle.
  await page.waitForTimeout(2500);

  // Reroute window.open so search-button clicks navigate the *backdrop* iframe
  // instead of replacing the whole document. This keeps the sidepanel iframe
  // alive across the navigation.
  await overlayFrame.evaluate(() => {
    window.open = (url) => {
      if (!url) return null;
      const parentDoc = window.parent.document;
      const backdrop = parentDoc.getElementById('backdrop') as HTMLIFrameElement | null;
      if (backdrop) backdrop.src = String(url);
      return null;
    };
  });

  return { page, overlayFrame };
}

async function finalize(page: Page, name: string) {
  const video = page.video();
  await page.close();
  if (video) {
    const src = await video.path();
    fs.renameSync(src, path.join(OUT_DIR, `${name}-1280x800.webm`));
  }
}

async function fillSearch(frame: Frame) {
  await frame.getByLabel('Keyword').fill('react hooks');
  await frame.page().waitForTimeout(500);
  await frame.getByLabel('Exclusion').fill('boilerplate');
  await frame.page().waitForTimeout(500);
}

async function clickRepositories(page: Page, frame: Frame) {
  await frame.getByRole('button', { name: 'Repositories', exact: true }).click();
  // The backdrop iframe navigates; the overlay (sidepanel) keeps running.
  await page.waitForTimeout(4000);
}

test('popup', async () => {
  const { page, overlayFrame } = await openWithOverlay('popup');
  await fillSearch(overlayFrame);
  await page.screenshot({ path: path.join(OUT_DIR, 'popup-1280x800.png') });
  await clickRepositories(page, overlayFrame);
  await finalize(page, 'popup');
});

test('sidepanel', async () => {
  const { page, overlayFrame } = await openWithOverlay('sidepanel');
  await fillSearch(overlayFrame);
  await page.screenshot({ path: path.join(OUT_DIR, 'sidepanel-1280x800.png') });
  await clickRepositories(page, overlayFrame);
  await finalize(page, 'sidepanel');
});

test('options', async () => {
  const page = await openExtensionPage('options.html');
  await page.screenshot({ path: path.join(OUT_DIR, 'options-1280x800.png') });
  for (const tab of ['検索オプション', '設定', 'クイック検索']) {
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: tab, exact: true }).click();
  }
  await page.waitForTimeout(1500);
  await finalize(page, 'options');
});
