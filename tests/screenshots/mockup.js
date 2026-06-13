const params = new URLSearchParams(location.search);
const mode = params.get('mode') === 'sidepanel' ? 'sidepanel' : 'popup';
const base = params.get('base') || 'https://github.com/explore';
const SIDEPANEL_WIDTH = 420;

const backdrop = document.createElement('iframe');
backdrop.id = 'backdrop';
backdrop.src = base;

const overlay = document.createElement('iframe');
overlay.id = 'overlay';
overlay.src = mode === 'sidepanel' ? 'sidepanel.html' : 'popup.html';

if (mode === 'sidepanel') {
  backdrop.style.cssText = `position:fixed;top:0;left:0;width:calc(100vw - ${SIDEPANEL_WIDTH}px);height:100dvh;`;
  overlay.style.cssText =
    `position:fixed;top:0;right:0;width:${SIDEPANEL_WIDTH}px;height:100dvh;` +
    `box-shadow:-6px 0 24px rgba(0,0,0,0.5);background:#1f2937;z-index:9999;`;
} else {
  backdrop.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100dvh;';
  overlay.style.cssText =
    'position:fixed;top:0;right:8px;width:392px;height:332px;border-radius:0 0 8px 8px;' +
    'box-shadow:0 12px 32px rgba(0,0,0,0.5);background:#1f2937;z-index:9999;';
}

document.body.appendChild(backdrop);
document.body.appendChild(overlay);
