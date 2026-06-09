import { storage } from 'wxt/utils/storage';

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
