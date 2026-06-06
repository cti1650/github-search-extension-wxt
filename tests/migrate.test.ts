import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { storage } from 'wxt/utils/storage';
import { ensureMigrated } from '@/lib/migrate';
import { exclusionKeywordItem, extensionKeywordItem, keywordItem } from '@/lib/storage';

const MIGRATION_FLAG_KEY = 'local:migrated_from_localstorage';

const resetState = async () => {
  localStorage.clear();
  await storage.removeItems([
    keywordItem.key,
    exclusionKeywordItem.key,
    extensionKeywordItem.key,
    MIGRATION_FLAG_KEY,
  ]);
};

describe('ensureMigrated', () => {
  beforeEach(resetState);
  afterEach(resetState);

  it('migrates legacy localStorage values into chrome.storage and sets the flag', async () => {
    localStorage.setItem('search_keyword', 'legacy-keyword');
    localStorage.setItem('search_exclusion_keyword', 'legacy-exclusion');
    localStorage.setItem('search_file_extension_keyword', 'ts,tsx');

    await ensureMigrated();

    expect(await keywordItem.getValue()).toBe('legacy-keyword');
    expect(await exclusionKeywordItem.getValue()).toBe('legacy-exclusion');
    expect(await extensionKeywordItem.getValue()).toBe('ts,tsx');
    expect(await storage.getItem<boolean>(MIGRATION_FLAG_KEY)).toBe(true);
  });

  it('skips migration entirely when the flag is already set', async () => {
    await storage.setItem(MIGRATION_FLAG_KEY, true);
    localStorage.setItem('search_keyword', 'should-not-be-migrated');

    await ensureMigrated();

    expect(await keywordItem.getValue()).toBe('');
  });

  it('does not overwrite existing chrome.storage values', async () => {
    await keywordItem.setValue('pre-existing');
    localStorage.setItem('search_keyword', 'legacy-value');

    await ensureMigrated();

    expect(await keywordItem.getValue()).toBe('pre-existing');
    expect(await storage.getItem<boolean>(MIGRATION_FLAG_KEY)).toBe(true);
  });

  it('ignores empty legacy values', async () => {
    localStorage.setItem('search_keyword', '');
    localStorage.setItem('search_exclusion_keyword', 'only-this');

    await ensureMigrated();

    expect(await keywordItem.getValue()).toBe('');
    expect(await exclusionKeywordItem.getValue()).toBe('only-this');
  });

  it('is idempotent: a second call after migration has no effect', async () => {
    localStorage.setItem('search_keyword', 'first-run');
    await ensureMigrated();

    localStorage.setItem('search_keyword', 'second-run');
    await ensureMigrated();

    expect(await keywordItem.getValue()).toBe('first-run');
  });
});
