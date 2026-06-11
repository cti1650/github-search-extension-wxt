import { storage } from 'wxt/utils/storage';
import type { SearchType } from './githubSearch';
import type { TemplateActivation } from './templates';

export type DisplayMode = 'popup' | 'sidepanel';

export const DEFAULT_DISPLAY_MODE: DisplayMode = 'popup';

export const displayModeItem = storage.defineItem<DisplayMode>('local:display_mode', {
  fallback: DEFAULT_DISPLAY_MODE,
});

export type ScopeMode = 'all' | 'org' | 'user' | 'repo';

export const SCOPE_MODES: readonly ScopeMode[] = ['all', 'org', 'user', 'repo'] as const;

export const scopeModeItem = storage.defineItem<ScopeMode>('local:scope_mode', {
  fallback: 'all',
});

export const scopeOrgsItem = storage.defineItem<string>('local:scope_orgs', { fallback: '' });
export const scopeUsersItem = storage.defineItem<string>('local:scope_users', { fallback: '' });
export const scopeReposItem = storage.defineItem<string>('local:scope_repos', { fallback: '' });

/**
 * Configuration shared by the context menu and the omnibox.
 * Context menu uses the selected text as keyword.
 * Omnibox uses what the user typed after the `gse` keyword.
 *
 * scopeMode and templateActivations are independent from the Side Panel state —
 * the user configures them explicitly in the クイック検索 tab.
 */
export type QuickSearchConfig = {
  searchType: SearchType;
  scopeMode: ScopeMode;
  templateActivations: Record<string, TemplateActivation>;
};

export const DEFAULT_QUICK_SEARCH: QuickSearchConfig = {
  searchType: 'Code',
  scopeMode: 'all',
  templateActivations: {},
};

/**
 * Storage may contain a config from a previous schema; fill in missing fields
 * with defaults to keep callers simple.
 */
export const normalizeQuickSearch = (
  raw: Partial<QuickSearchConfig> | undefined | null,
): QuickSearchConfig => ({
  searchType: raw?.searchType ?? DEFAULT_QUICK_SEARCH.searchType,
  scopeMode: raw?.scopeMode ?? DEFAULT_QUICK_SEARCH.scopeMode,
  templateActivations: raw?.templateActivations ?? DEFAULT_QUICK_SEARCH.templateActivations,
});

export const quickSearchItem = storage.defineItem<QuickSearchConfig>('local:quick_search', {
  fallback: DEFAULT_QUICK_SEARCH,
});

const parseList = (raw: string): string[] =>
  raw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

/**
 * Build a GitHub qualifier clause for the active scope. Returns null when:
 *  - mode is 'all'
 *  - the configured list for the active mode is empty
 */
export const buildScopeClause = (
  mode: ScopeMode,
  orgs: string,
  users: string,
  repos: string,
): string | null => {
  if (mode === 'all') return null;
  const source = mode === 'org' ? orgs : mode === 'user' ? users : repos;
  const list = parseList(source);
  if (list.length === 0) return null;
  if (list.length === 1) return `${mode}:${list[0]}`;
  return `(${list.map((v) => `${mode}:${v}`).join(' OR ')})`;
};
