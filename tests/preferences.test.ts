import { describe, expect, it } from 'vitest';
import { buildScopeClause } from '@/lib/preferences';

describe('buildScopeClause', () => {
  it('returns null when mode is all', () => {
    expect(buildScopeClause('all', 'apache', 'torvalds', 'vercel/next.js')).toBeNull();
  });

  it('returns null when the relevant list is empty', () => {
    expect(buildScopeClause('org', '', 'torvalds', '')).toBeNull();
    expect(buildScopeClause('user', 'apache', '', '')).toBeNull();
    expect(buildScopeClause('repo', 'apache', 'torvalds', '')).toBeNull();
  });

  it('returns a single qualifier without parentheses for one value', () => {
    expect(buildScopeClause('org', 'apache', '', '')).toBe('org:apache');
    expect(buildScopeClause('user', '', 'torvalds', '')).toBe('user:torvalds');
    expect(buildScopeClause('repo', '', '', 'vercel/next.js')).toBe('repo:vercel/next.js');
  });

  it('returns a parenthesized OR for multiple values', () => {
    expect(buildScopeClause('org', 'apache,google,facebook', '', '')).toBe(
      '(org:apache OR org:google OR org:facebook)',
    );
  });

  it('trims whitespace and skips empty entries', () => {
    expect(buildScopeClause('user', '', '  torvalds  , , gaearon ,', '')).toBe(
      '(user:torvalds OR user:gaearon)',
    );
  });
});
