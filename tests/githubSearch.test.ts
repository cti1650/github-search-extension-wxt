import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type ActiveTemplate, buildGitHubSearch } from '@/lib/githubSearch';

const make = (
  keyword: string,
  exclusionKeyword = '',
  extensionKeyword = '',
  templates: ActiveTemplate[] = [],
  scopeClause: string | null = null,
) =>
  buildGitHubSearch({
    keyword,
    exclusionKeyword,
    extensionKeyword,
    templates,
    scopeClause,
  });

const lastOpenedUrl = (): string => {
  const open = window.open as unknown as { mock: { calls: unknown[][] } };
  const calls = open.mock.calls;
  return calls[calls.length - 1]?.[0] as string;
};

describe('buildGitHubSearch', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
  });

  it('builds Code search URL with single keyword', () => {
    make('react').open('Code');
    expect(lastOpenedUrl()).toBe('https://github.com/search?type=code&q=react');
  });

  it('joins multiple keywords with AND', () => {
    make('react hooks').open('Code');
    expect(decodeURIComponent(lastOpenedUrl())).toContain('react AND hooks');
  });

  it('adds exclusion keywords as -keyword', () => {
    make('react', 'test').open('Code');
    expect(decodeURIComponent(lastOpenedUrl())).toContain('-test');
  });

  it('adds extension filters with path:*.ext for bare extensions', () => {
    make('foo', '', 'tsx,ts').open('Code');
    const url = decodeURIComponent(lastOpenedUrl());
    expect(url).toContain('path:*.tsx');
    expect(url).toContain('path:*.ts');
    expect(url).toContain(' OR ');
  });

  it('preserves explicit path: for filenames containing a dot', () => {
    make('foo', '', 'package.json').open('Code');
    expect(decodeURIComponent(lastOpenedUrl())).toContain('path:package.json');
  });

  it('builds Repositories URL on Repositories type', () => {
    make('react').open('Repositories');
    expect(lastOpenedUrl()).toBe('https://github.com/search?type=repositories&q=react');
  });

  it('converts AND OR AND back to OR when OR keyword is present', () => {
    make('react OR vue').open('Code');
    expect(decodeURIComponent(lastOpenedUrl())).toContain('(react OR vue)');
  });

  describe('search type URLs', () => {
    it('builds Issues URL', () => {
      make('bug').open('Issues');
      expect(lastOpenedUrl()).toBe('https://github.com/search?type=issues&q=bug');
    });

    it('builds Commits URL', () => {
      make('fix').open('Commits');
      expect(lastOpenedUrl()).toBe('https://github.com/search?type=commits&q=fix');
    });

    it('uses the advisories endpoint with ?query= for Advisory', () => {
      make('CVE-2025-12345').open('Advisory');
      expect(lastOpenedUrl()).toBe('https://github.com/advisories?query=CVE-2025-12345');
    });
  });

  describe('templates', () => {
    it('prepends static template patterns before the keyword query', () => {
      make('react', '', '', [{ pattern: 'is:pr is:merged' }]).open('Code');
      expect(decodeURIComponent(lastOpenedUrl())).toBe(
        'https://github.com/search?type=code&q=is:pr is:merged react',
      );
    });

    it('substitutes %s with the provided argValue', () => {
      make('react', '', '', [{ pattern: 'org:%s', argValue: 'apache' }]).open('Code');
      expect(decodeURIComponent(lastOpenedUrl())).toContain('org:apache react');
    });

    it('skips parameterized templates with empty argValue', () => {
      make('react', '', '', [{ pattern: 'org:%s', argValue: '' }]).open('Code');
      const url = decodeURIComponent(lastOpenedUrl());
      expect(url).toBe('https://github.com/search?type=code&q=react');
    });

    it('skips parameterized templates with undefined argValue', () => {
      make('react', '', '', [{ pattern: 'org:%s' }]).open('Code');
      expect(decodeURIComponent(lastOpenedUrl())).toBe(
        'https://github.com/search?type=code&q=react',
      );
    });

    it('trims whitespace from argValue', () => {
      make('react', '', '', [{ pattern: 'org:%s', argValue: '  apache  ' }]).open('Code');
      expect(decodeURIComponent(lastOpenedUrl())).toContain('org:apache react');
    });

    it('combines multiple templates with a single space', () => {
      make('react', '', '', [
        { pattern: 'org:%s', argValue: 'apache' },
        { pattern: 'language:%s', argValue: 'java' },
        { pattern: 'is:pr' },
      ]).open('Code');
      expect(decodeURIComponent(lastOpenedUrl())).toContain('org:apache language:java is:pr react');
    });

    it('works with templates only (no keyword)', () => {
      make('', '', '', [{ pattern: 'CVE-%s', argValue: '2025-12345' }]).open('Advisory');
      expect(decodeURIComponent(lastOpenedUrl())).toBe(
        'https://github.com/advisories?query=CVE-2025-12345',
      );
    });

    it('replaces every occurrence of %s', () => {
      make('', '', '', [{ pattern: 'repo:%s OR fork:%s', argValue: 'foo' }]).open('Code');
      expect(decodeURIComponent(lastOpenedUrl())).toContain('repo:foo OR fork:foo');
    });

    it('expands {{Nd}} date macros to YYYY-MM-DD', () => {
      make('react', '', '', [{ pattern: 'pushed:>{{30d}}' }]).open('Code');
      const url = decodeURIComponent(lastOpenedUrl());
      // The exact date depends on system clock; just assert the macro was resolved.
      expect(url).toMatch(/pushed:>\d{4}-\d{2}-\d{2} react/);
      expect(url).not.toContain('{{30d}}');
    });
  });

  describe('scope clause', () => {
    it('prepends the scope clause before templates and keyword', () => {
      make('react', '', '', [{ pattern: 'is:pr' }], '(org:apache OR org:google)').open('Code');
      expect(decodeURIComponent(lastOpenedUrl())).toBe(
        'https://github.com/search?type=code&q=(org:apache OR org:google) is:pr react',
      );
    });

    it('omits scope clause when null', () => {
      make('react', '', '', [], null).open('Code');
      expect(decodeURIComponent(lastOpenedUrl())).toBe(
        'https://github.com/search?type=code&q=react',
      );
    });
  });

  describe('buildUrl', () => {
    it('returns the search URL without opening a window', () => {
      const { buildUrl } = buildGitHubSearch({
        keyword: 'react',
        exclusionKeyword: '',
        extensionKeyword: '',
        templates: [{ pattern: 'is:pr' }],
        scopeClause: 'org:apache',
      });
      expect(decodeURIComponent(buildUrl('Code'))).toBe(
        'https://github.com/search?type=code&q=org:apache is:pr react',
      );
      expect(decodeURIComponent(buildUrl('Advisory'))).toBe(
        'https://github.com/advisories?query=org:apache is:pr react',
      );
    });
  });
});
