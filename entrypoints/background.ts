export default defineBackground(() => {
  const CONTEXT_MENU_ID = 'github-search-extension';

  browser.runtime.onInstalled.addListener(async () => {
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
  });

  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId !== CONTEXT_MENU_ID) return;
    const selection = info.selectionText ?? '';
    const searchText = encodeURIComponent(selection);
    const searchUrl = `https://github.com/search?type=code&q=${searchText}`;
    void browser.tabs.create({ url: searchUrl });
  });
});
