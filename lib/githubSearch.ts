type Props = {
  keyword: string;
  exclusionKeyword: string;
  extensionKeyword: string;
};

export type SearchType = 'Code' | 'Packages' | 'Repositories';

export const buildGitHubSearch = (props: Props) => {
  const { keyword, exclusionKeyword, extensionKeyword } = props;

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
      return trimmed.indexOf('.') > 0 ? `path:${trimmed}` : `path:*.${trimmed}`;
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

  const searchKeywordQuery = encodeURIComponent(baseKeywords);

  const open = (type: SearchType) => {
    const query = searchKeywordQuery.trim();
    switch (type) {
      case 'Code':
        window.open(`https://github.com/search?type=code&q=${query}`, '_blank');
        break;
      case 'Packages':
        window.open(`https://github.com/search?type=registrypackages&q=${query}`, '_blank');
        break;
      case 'Repositories':
        window.open(`https://github.com/search?type=repositories&q=${query}`, '_blank');
        break;
    }
  };

  return { open };
};
