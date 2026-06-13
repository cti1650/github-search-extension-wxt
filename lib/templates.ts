import { storage } from 'wxt/utils/storage';

export type Template = {
  id: string;
  name: string;
  pattern: string;
  enabled: boolean;
  builtin: boolean;
};

export type TemplateActivation = {
  active: boolean;
  argValue?: string;
};

export const BUILTIN_TEMPLATES: ReadonlyArray<Omit<Template, 'enabled' | 'builtin'>> = [
  // 種別
  { id: 'builtin:is-pr', name: 'Is PR', pattern: 'is:pr' },
  { id: 'builtin:merged-pr', name: 'Merged PR', pattern: 'is:pr is:merged' },
  { id: 'builtin:open-issue', name: 'Open Issue', pattern: 'is:issue is:open' },
  // 品質
  { id: 'builtin:stars-100', name: 'Stars 100+', pattern: 'stars:>100' },
  { id: 'builtin:stars-1000', name: 'Stars 1000+', pattern: 'stars:>1000' },
  // 鮮度（日付マクロ {{Nd}} を使用、検索実行時に N 日前の日付に展開）
  { id: 'builtin:pushed-7d', name: 'Pushed: last 7 days', pattern: 'pushed:>{{7d}}' },
  { id: 'builtin:pushed-30d', name: 'Pushed: last 30 days', pattern: 'pushed:>{{30d}}' },
  { id: 'builtin:pushed-90d', name: 'Pushed: last 90 days', pattern: 'pushed:>{{90d}}' },
  { id: 'builtin:created-30d', name: 'Created: last 30 days', pattern: 'created:>{{30d}}' },
  { id: 'builtin:created-365d', name: 'Created: last year', pattern: 'created:>{{365d}}' },
  // 依存・セキュリティ
  {
    id: 'builtin:npm-package',
    name: 'npm Package',
    pattern:
      '(path:package.json OR path:package-lock.json OR path:yarn.lock OR path:pnpm-lock.yaml)',
  },
  { id: 'builtin:security-md', name: 'SECURITY.md', pattern: 'path:SECURITY.md' },
  // package.json の dependencies / devDependencies 構造でフィルタ
  {
    id: 'builtin:has-deps',
    name: 'Has dependencies',
    pattern: 'path:package.json /"dependencies"/',
  },
  {
    id: 'builtin:dev-only',
    name: 'Dev-only deps',
    pattern: 'path:package.json /"devDependencies"/ NOT /"dependencies"/',
  },
  // フレームワーク/ライブラリ別フィルタ (package.json に該当パッケージが宣言されている repo)
  { id: 'builtin:uses-vite', name: 'Uses Vite', pattern: 'path:package.json /"vite":/' },
  { id: 'builtin:uses-next', name: 'Uses Next.js', pattern: 'path:package.json /"next":/' },
  { id: 'builtin:uses-react', name: 'Uses React', pattern: 'path:package.json /"react":/' },
  { id: 'builtin:uses-vue', name: 'Uses Vue', pattern: 'path:package.json /"vue":/' },
  { id: 'builtin:uses-express', name: 'Uses Express', pattern: 'path:package.json /"express":/' },
  {
    id: 'builtin:uses-typescript',
    name: 'Uses TypeScript',
    pattern: 'path:package.json /"typescript":/',
  },
];

const toTemplate = (t: Omit<Template, 'enabled' | 'builtin'>): Template => ({
  ...t,
  enabled: false,
  builtin: true,
});

export const DEFAULT_TEMPLATES: Template[] = BUILTIN_TEMPLATES.map(toTemplate);

export const templatesItem = storage.defineItem<Template[]>('local:templates', {
  fallback: DEFAULT_TEMPLATES,
});

export const templateActivationsItem = storage.defineItem<Record<string, TemplateActivation>>(
  'local:template_activations',
  {
    fallback: {},
  },
);

export const isParameterized = (pattern: string): boolean => pattern.includes('%s');

const DATE_MACRO_RE = /\{\{(\d+)d\}\}/g;

/**
 * Expand relative date macros like {{30d}} into YYYY-MM-DD (N days before `now`).
 */
export const expandDateMacros = (pattern: string, now: Date = new Date()): string =>
  pattern.replace(DATE_MACRO_RE, (_, daysStr: string) => {
    const days = Number(daysStr);
    const d = new Date(now.getTime() - days * 86400_000);
    return d.toISOString().slice(0, 10);
  });

export const resetTemplatesToDefault = async (): Promise<void> => {
  const current = await templatesItem.getValue();
  const customs = current.filter((t) => !t.builtin);
  await templatesItem.setValue([...DEFAULT_TEMPLATES, ...customs]);
};

/**
 * Reconcile stored templates against the current set of builtins:
 * - new builtins are appended (disabled by default)
 * - existing builtins keep user's enabled state but refresh name/pattern
 * - custom templates are preserved
 * - removed builtins (no longer in DEFAULT_TEMPLATES) are dropped
 */
export const mergeBuiltins = (stored: Template[]): Template[] => {
  const storedById = new Map(stored.map((t) => [t.id, t]));
  const merged: Template[] = [];

  for (const builtin of DEFAULT_TEMPLATES) {
    const existing = storedById.get(builtin.id);
    merged.push(existing ? { ...builtin, enabled: existing.enabled } : builtin);
  }

  for (const t of stored) {
    if (!t.builtin) merged.push(t);
  }

  return merged;
};

export const generateCustomId = (): string => `custom:${crypto.randomUUID()}`;

/**
 * Compute the list of templates that are both enabled (visible) and active
 * (toggled on in the panel/quick search activations).
 */
export const computeActiveTemplates = (
  templates: Template[],
  activations: Record<string, TemplateActivation>,
): Array<{ pattern: string; argValue?: string }> => {
  const result: Array<{ pattern: string; argValue?: string }> = [];
  for (const t of templates) {
    if (!t.enabled) continue;
    const state = activations[t.id];
    if (!state?.active) continue;
    result.push({ pattern: t.pattern, argValue: state.argValue });
  }
  return result;
};
