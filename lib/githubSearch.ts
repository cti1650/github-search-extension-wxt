import { expandDateMacros } from './templates';

export type ActiveTemplate = {
  pattern: string;
  argValue?: string;
};

type Props = {
  keyword: string;
  exclusionKeyword: string;
  extensionKeyword: string;
  templates?: ActiveTemplate[];
  scopeClause?: string | null;
};

export type SearchType = 'Code' | 'Repositories' | 'Issues' | 'Commits' | 'Advisory';

export const SEARCH_TYPES: readonly SearchType[] = [
  'Code',
  'Repositories',
  'Issues',
  'Commits',
  'Advisory',
] as const;

const SEARCH_URL_BUILDERS: Record<SearchType, (query: string) => string> = {
  Code: (q) => `https://github.com/search?type=code&q=${q}`,
  Repositories: (q) => `https://github.com/search?type=repositories&q=${q}`,
  Issues: (q) => `https://github.com/search?type=issues&q=${q}`,
  Commits: (q) => `https://github.com/search?type=commits&q=${q}`,
  Advisory: (q) => `https://github.com/advisories?query=${q}`,
};

const expandTemplate = ({ pattern, argValue }: ActiveTemplate): string | null => {
  const dateExpanded = expandDateMacros(pattern);
  if (!dateExpanded.includes('%s')) return dateExpanded;
  const trimmed = argValue?.trim();
  if (!trimmed) return null;
  return dateExpanded.replaceAll('%s', trimmed);
};

export const buildGitHubSearch = (props: Props) => {
  const { keyword, exclusionKeyword, extensionKeyword, templates = [], scopeClause } = props;

  const keywords = keyword.split(' ').filter((v) => v);
  const exclusionKeywords = exclusionKeyword
    .split(' ')
    .filter((v) => v)
    .map((word) => `-${word}`);
  const extensionKeywords = extensionKeyword
    .replaceAll(',', ' ')
    .split(' ')
    .filter((v) => v)
    .map((word) => {
      const trimmed = word.trim();
      // Bare extension (`tsx`, `js` 等) は `*.` を付ける。
      // `.`, `/`, `*` のいずれかを含む場合は既に path/glob とみなしてそのまま使う
      // (`package.json`, `.github/**/pinact.yml`, `*/pinact.yml` などに対応)。
      const isBareExtension = /^[\w-]+$/.test(trimmed);
      return isBareExtension ? `path:*.${trimmed}` : `path:${trimmed}`;
    });

  const parseQuery = (arr: string[]) => {
    return arr.includes('OR')
      ? [
          `(${arr
            .filter((v) => v)
            .join(' AND ')
            .replaceAll(' AND OR AND ', ' OR ')})`,
        ]
      : arr;
  };

  const baseKeywords = [
    ...parseQuery(keywords),
    ...parseQuery(exclusionKeywords),
    ...(extensionKeywords.length ? [`(${extensionKeywords.join(' OR ')})`] : []),
  ]
    .filter((v) => v)
    .join(' AND ');

  const templatePrefix = templates
    .map(expandTemplate)
    .filter((v): v is string => v !== null && v !== '')
    .join(' ');

  const rawQuery = [scopeClause ?? '', templatePrefix, baseKeywords].filter((v) => v).join(' ');
  const searchKeywordQuery = encodeURIComponent(rawQuery);

  const buildUrl = (type: SearchType): string =>
    SEARCH_URL_BUILDERS[type](searchKeywordQuery.trim());

  const open = (type: SearchType) => {
    window.open(buildUrl(type), '_blank');
  };

  return { open, buildUrl, rawQuery };
};
