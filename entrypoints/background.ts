import { type ActiveTemplate, buildGitHubSearch, type SearchType } from '@/lib/githubSearch';
import {
  buildScopeClause,
  type DisplayMode,
  displayModeItem,
  normalizeQuickSearch,
  quickSearchItem,
  scopeModeItem,
  scopeOrgsItem,
  scopeReposItem,
  scopeUsersItem,
} from '@/lib/preferences';
import {
  computeActiveTemplates,
  mergeBuiltins,
  templateActivationsItem,
  templatesItem,
} from '@/lib/templates';

export default defineBackground(() => {
  const CONTEXT_MENU_ID = 'github-search-extension';

  const setupContextMenu = async () => {
    try {
      await browser.contextMenus.removeAll();
      browser.contextMenus.create({
        id: CONTEXT_MENU_ID,
        title: 'GitHub Search',
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

  const loadActiveTemplates = async (): Promise<ActiveTemplate[]> => {
    const [stored, activations] = await Promise.all([
      templatesItem.getValue(),
      templateActivationsItem.getValue(),
    ]);
    return computeActiveTemplates(mergeBuiltins(stored), activations);
  };

  /**
   * Build a search URL for short-form entry points (context menu, omnibox).
   * Scope and Templates are shared with the Side Panel — only the search
   * target type lives in QuickSearchConfig.
   */
  const buildQuickSearchUrl = async (keyword: string): Promise<string> => {
    const [config, scopeMode, orgs, users, repos, templates] = await Promise.all([
      quickSearchItem.getValue().then(normalizeQuickSearch),
      scopeModeItem.getValue(),
      scopeOrgsItem.getValue(),
      scopeUsersItem.getValue(),
      scopeReposItem.getValue(),
      loadActiveTemplates(),
    ]);
    const scopeClause = buildScopeClause(scopeMode, orgs, users, repos);
    const { buildUrl } = buildGitHubSearch({
      keyword,
      exclusionKeyword: '',
      extensionKeyword: '',
      templates,
      scopeClause,
    });
    return buildUrl(config.searchType as SearchType);
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

  browser.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId !== CONTEXT_MENU_ID) return;
    const selection = info.selectionText ?? '';
    if (!selection.trim()) return;
    const url = await buildQuickSearchUrl(selection);
    void browser.tabs.create({ url });
  });

  type ScriptingLike = {
    executeScript: (args: {
      target: { tabId: number };
      func: () => string;
    }) => Promise<Array<{ result?: string }>>;
  };
  const getScripting = (): ScriptingLike | undefined =>
    (browser as unknown as { scripting?: ScriptingLike }).scripting;

  /**
   * Read the current selection from the active tab. Uses scripting.executeScript,
   * which is granted via activeTab when the command is invoked by the user.
   */
  const readActiveTabSelection = async (): Promise<string> => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return '';
    const scripting = getScripting();
    if (!scripting) return '';
    try {
      const results = await scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString() ?? '',
      });
      return results[0]?.result ?? '';
    } catch (error) {
      console.error('[github-search-extension] failed to read selection:', error);
      return '';
    }
  };

  browser.commands.onCommand.addListener(async (command) => {
    if (command !== 'search-selection') return;
    const selection = (await readActiveTabSelection()).trim();
    if (!selection) return;
    const url = await buildQuickSearchUrl(selection);
    void browser.tabs.create({ url });
  });

  type OmniboxLike = {
    onInputEntered: {
      addListener(cb: (text: string) => void): void;
    };
  };
  const omnibox = (browser as unknown as { omnibox?: OmniboxLike }).omnibox;
  omnibox?.onInputEntered.addListener((text: string) => {
    const keyword = text.trim();
    if (!keyword) return;
    void buildQuickSearchUrl(keyword).then((url) => browser.tabs.create({ url }));
  });
});
