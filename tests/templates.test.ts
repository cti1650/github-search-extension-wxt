import { describe, expect, it } from 'vitest';
import {
  BUILTIN_TEMPLATES,
  computeActiveTemplates,
  DEFAULT_TEMPLATES,
  expandDateMacros,
  generateCustomId,
  isParameterized,
  mergeBuiltins,
  type Template,
} from '@/lib/templates';

const custom = (id: string, name = id, pattern = `${id}:%s`): Template => ({
  id,
  name,
  pattern,
  enabled: true,
  builtin: false,
});

describe('isParameterized', () => {
  it('returns true when %s is present', () => {
    expect(isParameterized('org:%s')).toBe(true);
  });

  it('returns false for static patterns', () => {
    expect(isParameterized('is:pr is:merged')).toBe(false);
  });
});

describe('expandDateMacros', () => {
  it('replaces {{Nd}} with the date N days before now', () => {
    const now = new Date('2026-06-09T00:00:00Z');
    expect(expandDateMacros('pushed:>{{30d}}', now)).toBe('pushed:>2026-05-10');
    expect(expandDateMacros('created:>{{7d}}', now)).toBe('created:>2026-06-02');
  });

  it('replaces multiple macros in one pattern', () => {
    const now = new Date('2026-06-09T00:00:00Z');
    expect(expandDateMacros('pushed:>{{30d}} created:>{{365d}}', now)).toBe(
      'pushed:>2026-05-10 created:>2025-06-09',
    );
  });

  it('leaves patterns without macros untouched', () => {
    expect(expandDateMacros('is:pr is:merged')).toBe('is:pr is:merged');
  });
});

describe('mergeBuiltins', () => {
  it('returns all defaults disabled when storage is empty', () => {
    const merged = mergeBuiltins([]);
    expect(merged).toHaveLength(BUILTIN_TEMPLATES.length);
    expect(merged.every((t) => t.builtin)).toBe(true);
    expect(merged.every((t) => !t.enabled)).toBe(true);
  });

  it('preserves user-enabled state on existing builtins', () => {
    const stored: Template[] = DEFAULT_TEMPLATES.map((t) =>
      t.id === 'builtin:is-pr' ? { ...t, enabled: true } : t,
    );
    const merged = mergeBuiltins(stored);
    expect(merged.find((t) => t.id === 'builtin:is-pr')?.enabled).toBe(true);
    expect(merged.find((t) => t.id === 'builtin:merged-pr')?.enabled).toBe(false);
  });

  it('refreshes name/pattern from current builtins (e.g., pattern fix on upgrade)', () => {
    const stored: Template[] = [
      {
        id: 'builtin:is-pr',
        name: 'OLD NAME',
        pattern: 'old:pattern',
        enabled: true,
        builtin: true,
      },
    ];
    const merged = mergeBuiltins(stored);
    const t = merged.find((m) => m.id === 'builtin:is-pr');
    expect(t?.name).toBe('Is PR');
    expect(t?.pattern).toBe('is:pr');
    expect(t?.enabled).toBe(true);
  });

  it('appends new builtins introduced after the stored snapshot', () => {
    const stored: Template[] = [
      { id: 'builtin:is-pr', name: 'Is PR', pattern: 'is:pr', enabled: true, builtin: true },
    ];
    const merged = mergeBuiltins(stored);
    expect(merged.length).toBe(BUILTIN_TEMPLATES.length);
    expect(merged.some((t) => t.id === 'builtin:npm-package')).toBe(true);
  });

  it('drops builtins that no longer exist in DEFAULT_TEMPLATES', () => {
    const stored: Template[] = [
      ...DEFAULT_TEMPLATES,
      { id: 'builtin:removed', name: 'Removed', pattern: 'x', enabled: true, builtin: true },
    ];
    const merged = mergeBuiltins(stored);
    expect(merged.some((t) => t.id === 'builtin:removed')).toBe(false);
  });

  it('preserves custom templates and places them after builtins', () => {
    const myCustom = custom('custom:abc', 'My Template');
    const merged = mergeBuiltins([...DEFAULT_TEMPLATES, myCustom]);
    expect(merged[merged.length - 1]).toEqual(myCustom);
  });
});

describe('computeActiveTemplates', () => {
  const tpl = (id: string, pattern: string, enabled = true): Template => ({
    id,
    name: id,
    pattern,
    enabled,
    builtin: false,
  });

  it('returns only templates that are both enabled and active', () => {
    const templates = [tpl('a', 'is:pr'), tpl('b', 'is:issue', false), tpl('c', 'is:merged')];
    const activations = {
      a: { active: true },
      b: { active: true }, // not enabled → skipped
      c: { active: false }, // not active → skipped
    };
    expect(computeActiveTemplates(templates, activations)).toEqual([
      { pattern: 'is:pr', argValue: undefined },
    ]);
  });

  it('carries through argValue for parameterized patterns', () => {
    const templates = [tpl('a', 'org:%s')];
    const activations = { a: { active: true, argValue: 'apache' } };
    expect(computeActiveTemplates(templates, activations)).toEqual([
      { pattern: 'org:%s', argValue: 'apache' },
    ]);
  });

  it('returns an empty list when nothing is active', () => {
    const templates = [tpl('a', 'is:pr')];
    expect(computeActiveTemplates(templates, {})).toEqual([]);
  });
});

describe('generateCustomId', () => {
  it('returns a custom: prefixed id', () => {
    expect(generateCustomId()).toMatch(/^custom:/);
  });

  it('returns unique ids', () => {
    const a = generateCustomId();
    const b = generateCustomId();
    expect(a).not.toBe(b);
  });
});
