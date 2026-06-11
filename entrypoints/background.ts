import { type ActiveTemplate, buildGitHubSearch, type SearchType } from '@/lib/githubSearch';
import {
  buildScopeClause,
  type DisplayMode,
  displayModeItem,
  type QuickSearchConfig,
  quickSearchItem,
  scopeModeItem,
  scopeOrgsItem,
  scopeReposItem,
  scopeUsersItem,
} from '@/lib/preferences';
import { mergeBuiltins, templateActivationsItem, templatesItem } from '@/lib/templates';

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
    const stored = await templatesItem.getValue();
    const activations = await templateActivationsItem.getValue();
    const merged = mergeBuiltins(stored);
    const active: ActiveTemplate[] = [];
    for (const t of merged) {
      if (!t.enabled) continue;
      const state = activations[t.id];
      if (!state?.active) continue;
      active.push({ pattern: t.pattern, argValue: state.argValue });
    }
    return active;
  };

  const loadScopeClause = async (): Promise<string | null> => {
    const [mode, orgs, users, repos] = await Promise.all([
      scopeModeItem.getValue(),
      scopeOrgsItem.getValue(),
      scopeUsersItem.getValue(),
      scopeReposItem.getValue(),
    ]);
    return buildScopeClause(mode, orgs, users, repos);
  };

  /**
   * Build a search URL for short-form entry points (context menu, omnibox).
   * The QuickSearchConfig decides which optional filters (scope, templates) apply.
   */
  const buildQuickSearchUrl = async (keyword: string): Promise<string> => {
    const config: QuickSearchConfig = await quickSearchItem.getValue();
    const [scopeClause, templates] = await Promise.all([
      config.applyScope ? loadScopeClause() : Promise.resolve(null),
      config.applyTemplates ? loadActiveTemplates() : Promise.resolve<ActiveTemplate[]>([]),
    ]);
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
