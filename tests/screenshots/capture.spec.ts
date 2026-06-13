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

// Redirect window.open into in-place navigation so the recording stays on the same
// page and ends on the actual GitHub search results page.
async function inlineOpen(page: Page) {
  await page.evaluate(() => {
    window.open = (url) => {
      if (url) window.location.href = String(url);
      return null;
    };
  });
}

async function clickCode(page: Page) {
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);
}

// Re-skin the popup/sidepanel page so it looks like the extension surface is floating
// on top of a Chrome-like browser viewport. This is a visual mock — the actual popup
// React app is preserved and remains interactive.
async function dressAsBrowser(page: Page, mode: 'popup' | 'sidepanel') {
  await page.evaluate((m) => {
    const root = document.getElementById('root');
    if (!root) return;
    root.remove();

    document.body.style.margin = '0';
    document.body.style.background = '#f6f8fa';
    document.body.innerHTML = `
      <div id="chrome-frame" style="
        position: fixed; inset: 0;
        display: grid; grid-template-rows: 36px 52px 1fr;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">
        <div style="background:#dcdfe4;border-bottom:1px solid #c5c8cd;padding:0 14px;display:flex;align-items:center;gap:10px;">
          <span style="width:12px;height:12px;border-radius:50%;background:#ff5f56;"></span>
          <span style="width:12px;height:12px;border-radius:50%;background:#ffbd2e;"></span>
          <span style="width:12px;height:12px;border-radius:50%;background:#27c93f;"></span>
          <div style="margin-left:20px;color:#586069;font-size:13px;background:#fff;padding:4px 10px;border-radius:4px;border:1px solid #c5c8cd;min-width:520px;">github.com</div>
        </div>
        <div style="background:#24292f;color:#fff;padding:0 24px;display:flex;align-items:center;gap:16px;">
          <svg height="32" viewBox="0 0 16 16" fill="white" aria-hidden="true">
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.27-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.18.73.85.82 1.07.15.43.65 1.26 2.7.88 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38C2.32 14.21 0 11.39 0 8.02 0 3.58 3.58 0 8 0z"></path>
          </svg>
          <div style="flex:1;max-width:560px;background:#161b22;border:1px solid #30363d;border-radius:6px;padding:6px 12px;color:#7d8590;font-size:14px;">Type / to search</div>
          <div style="display:flex;gap:14px;align-items:center;color:#c9d1d9;font-size:13px;">
            <span style="opacity:.8;">Pull requests</span>
            <span style="opacity:.8;">Issues</span>
            <span style="opacity:.8;">Marketplace</span>
            <span style="opacity:.8;">Explore</span>
            <span style="width:24px;height:24px;border-radius:50%;background:#30363d;display:inline-block;"></span>
          </div>
        </div>
        <div style="background:#0d1117;color:#c9d1d9;padding:28px 32px;overflow:hidden;">
          <div style="max-width:1080px;margin:0 auto;">
            <div style="font-size:13px;color:#7d8590;margin-bottom:8px;">Repositories you might be interested in</div>
            <h1 style="font-size:22px;font-weight:600;margin:0 0 18px;color:#f0f6fc;">Discover repositories</h1>
            <div style="display:grid;gap:14px;">
              <div style="border:1px solid #30363d;border-radius:6px;padding:16px;background:#161b22;">
                <div style="font-size:16px;font-weight:600;color:#58a6ff;">facebook / react</div>
                <div style="font-size:13px;color:#8b949e;margin-top:6px;">The library for web and native user interfaces</div>
                <div style="font-size:12px;color:#7d8590;margin-top:10px;">TypeScript · ★ 230k</div>
              </div>
              <div style="border:1px solid #30363d;border-radius:6px;padding:16px;background:#161b22;">
                <div style="font-size:16px;font-weight:600;color:#58a6ff;">vercel / next.js</div>
                <div style="font-size:13px;color:#8b949e;margin-top:6px;">The React Framework</div>
                <div style="font-size:12px;color:#7d8590;margin-top:10px;">JavaScript · ★ 130k</div>
              </div>
              <div style="border:1px solid #30363d;border-radius:6px;padding:16px;background:#161b22;">
                <div style="font-size:16px;font-weight:600;color:#58a6ff;">vitejs / vite</div>
                <div style="font-size:13px;color:#8b949e;margin-top:6px;">Next generation frontend tooling</div>
                <div style="font-size:12px;color:#7d8590;margin-top:10px;">TypeScript · ★ 70k</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="popup-host"></div>
    `;

    const host = document.getElementById('popup-host') as HTMLElement;
    if (m === 'popup') {
      host.style.cssText = [
        'position:fixed',
        'top:74px',
        'right:120px',
        'width:372px',
        'border-radius:8px',
        'overflow:hidden',
        'box-shadow:0 12px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.08)',
        'z-index:9999',
      ].join(';');
    } else {
      host.style.cssText = [
        'position:fixed',
        'top:88px',
        'right:0',
        'bottom:0',
        'width:420px',
        'box-shadow:-6px 0 24px rgba(0,0,0,0.4)',
        'z-index:9999',
        'overflow:hidden',
      ].join(';');
    }
    host.appendChild(root);
  }, mode);
}

test('popup', async () => {
  const page = await openPage('popup.html');
  await dressAsBrowser(page, 'popup');
  await inlineOpen(page);
  await fillSearch(page);
  await page.screenshot({ path: path.join(OUT_DIR, 'popup-1280x800.png') });
  await clickCode(page);
  await finalize(page, 'popup');
});

test('sidepanel', async () => {
  const page = await openPage('sidepanel.html');
  await dressAsBrowser(page, 'sidepanel');
  await inlineOpen(page);
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
