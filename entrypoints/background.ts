import { type DisplayMode, displayModeItem } from '@/lib/preferences';

export default defineBackground(() => {
  const CONTEXT_MENU_ID = 'github-search-extension';

  const setupContextMenu = async () => {
    try {
      await browser.contextMenus.removeAll();
      browser.contextMenus.create({
        id: CONTEXT_MENU_ID,
        title: 'GitHub Code Search',
        contexts: ['page', 'frame', 'selection'],
      });
    } catch (error) {
      console.error('[github-search-extension] context menu setup failed:', error);
    }
  };

  type SidePanelLike = {
    setPanelBehavior?: (options: { openPanelOnActionClick: boolean }) => Promise<void>;
  };
  const getSidePanel = (): SidePanelLike | undefined =>
    (browser as unknown as { sidePanel?: SidePanelLike }).sidePanel;

  const applyDisplayMode = async (mode: DisplayMode) => {
    const sidePanel = getSidePanel();
    try {
      if (mode === 'sidepanel') {
        await browser.action.setPopup({ popup: '' });
        await sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true });
      } else {
        await browser.action.setPopup({ popup: 'popup.html' });
        await sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false });
      }
    } catch (error) {
      console.error('[github-search-extension] display mode setup failed:', error);
    }
  };

  const syncDisplayMode = async () => {
    const mode = await displayModeItem.getValue();
    await applyDisplayMode(mode);
  };

  browser.runtime.onInstalled.addListener(() => {
    void setupContextMenu();
    void syncDisplayMode();
  });

  browser.runtime.onStartup.addListener(() => {
    void syncDisplayMode();
  });

  displayModeItem.watch((next) => {
    void applyDisplayMode(next);
  });

  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId !== CONTEXT_MENU_ID) return;
    const selection = info.selectionText ?? '';
    const searchText = encodeURIComponent(selection);
    const searchUrl = `https://github.com/search?type=code&q=${searchText}`;
    void browser.tabs.create({ url: searchUrl });
  });
});
