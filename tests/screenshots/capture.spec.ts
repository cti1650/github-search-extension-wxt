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

let context: BrowserContext;
let extensionId: string;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Patch the built manifest in-place so the extension's popup/sidepanel pages
  // can be iframed from regular web pages. This only touches .output (gitignored,
  // rebuilt next run); the source manifest in wxt.config.ts is untouched so
  // production builds stay locked down.
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  manifest.web_accessible_resources = [
    ...(manifest.web_accessible_resources ?? []),
    { resources: ['popup.html', 'sidepanel.html'], matches: ['<all_urls>'] },
  ];
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

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

const SIDEPANEL_WIDTH = 420;

const OVERLAY_STYLE = {
  popup: [
    'position:fixed',
    'top:0',
    'right:8px',
    'width:392px',
    'height:332px',
    'border:0',
    'border-radius:0 0 8px 8px',
    'box-shadow:0 12px 32px rgba(0,0,0,0.5)',
    'z-index:2147483647',
    'background:#1f2937',
  ].join(';'),
  sidepanel: [
    'position:fixed',
    'top:0',
    'right:0',
    `width:${SIDEPANEL_WIDTH}px`,
    'height:100dvh',
    'border:0',
    'box-shadow:-6px 0 24px rgba(0,0,0,0.5)',
    'z-index:2147483647',
    'background:#1f2937',
  ].join(';'),
} as const;

async function openWithOverlay(mode: 'popup' | 'sidepanel'): Promise<{ page: Page; frame: Frame }> {
  const page = await context.newPage();
  await page.setViewportSize(SIZE);
  // Load the real GitHub page as the backdrop.
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  if (mode === 'sidepanel') {
    // Mimic Chrome's Side Panel docking: shrink the backdrop page horizontally
    // so the panel sits beside the content instead of on top of it.
    await page.addStyleTag({
      content: `
        html, body {
          width: calc(100vw - ${SIDEPANEL_WIDTH}px) !important;
          max-width: calc(100vw - ${SIDEPANEL_WIDTH}px) !important;
          overflow-x: hidden !important;
        }
      `,
    });
    await page.waitForTimeout(500);
  }

  const extPage = mode === 'popup' ? 'popup.html' : 'sidepanel.html';
  await page.evaluate(
    ({ extId, extPage, style }) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'gse-overlay';
      iframe.src = `chrome-extension://${extId}/${extPage}`;
      iframe.setAttribute('style', style);
      document.body.appendChild(iframe);
    },
    { extId: extensionId, extPage, style: OVERLAY_STYLE[mode] },
  );

  const handle = await page.waitForSelector('iframe#gse-overlay', { state: 'attached' });
  const frame = await handle.contentFrame();
  if (!frame) throw new Error(`overlay iframe not found for ${mode}`);
  await frame.waitForLoadState('domcontentloaded');
  await frame.locator('input').first().waitFor({ state: 'attached' });

  // The React app calls window.open(url, '_blank'). Reroute it to navigate the
  // parent (GitHub) so the result page appears in the same screencast.
  await frame.evaluate(() => {
    window.open = (url) => {
      if (url) (window.top as Window).location.href = String(url);
      return null;
    };
  });

  return { page, frame };
}

async function openExtensionPage(file: string): Promise<Page> {
  const page = await context.newPage();
  await page.setViewportSize(SIZE);
  await page.goto(`chrome-extension://${extensionId}/${file}`, { waitUntil: 'load' });
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

async function fillSearch(frame: Frame) {
  // Repository search ignores code-only qualifiers like `path:`, so keep the
  // demo to plain text terms that actually return public results.
  await frame.getByLabel('Keyword').fill('react hooks');
  await frame.page().waitForTimeout(500);
  await frame.getByLabel('Exclusion').fill('boilerplate');
  await frame.page().waitForTimeout(500);
}

async function clickRepositories(page: Page, frame: Frame) {
  await frame.getByRole('button', { name: 'Repositories', exact: true }).click();
  await page.waitForLoadState('load');
  await page.waitForTimeout(2500);
}

test('popup', async () => {
  const { page, frame } = await openWithOverlay('popup');
  await fillSearch(frame);
  await page.screenshot({ path: path.join(OUT_DIR, 'popup-1280x800.png') });
  await clickRepositories(page, frame);
  await finalize(page, 'popup');
});

test('sidepanel', async () => {
  const { page, frame } = await openWithOverlay('sidepanel');
  await fillSearch(frame);
  await page.screenshot({ path: path.join(OUT_DIR, 'sidepanel-1280x800.png') });
  await clickRepositories(page, frame);
  await finalize(page, 'sidepanel');
});

test('options', async () => {
  const page = await openExtensionPage('options.html');
  await page.screenshot({ path: path.join(OUT_DIR, 'options-1280x800.png') });
  // Walk through the three tabs so the screencast actually demonstrates the page.
  for (const tab of ['検索オプション', '設定', 'クイック検索']) {
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: tab, exact: true }).click();
  }
  await page.waitForTimeout(1500);
  await finalize(page, 'options');
});
