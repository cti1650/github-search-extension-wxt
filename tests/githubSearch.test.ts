import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGitHubSearch } from '@/lib/githubSearch';

const make = (keyword: string, exclusionKeyword = '', extensionKeyword = '') =>
  buildGitHubSearch({ keyword, exclusionKeyword, extensionKeyword });

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
});
