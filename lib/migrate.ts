import { storage } from 'wxt/utils/storage';
import { exclusionKeywordItem, extensionKeywordItem, keywordItem } from './storage';

const MIGRATION_FLAG_KEY = 'local:migrated_from_localstorage';

const LEGACY_KEYS: Array<[string, typeof keywordItem]> = [
  ['search_keyword', keywordItem],
  ['search_exclusion_keyword', exclusionKeywordItem],
  ['search_file_extension_keyword', extensionKeywordItem],
];

/**
 * 旧バージョン (Next.js 実装) は localStorage に検索条件を保存していた。
 * 初回起動時のみ localStorage の値を chrome.storage.local へ移行し、
 * 以後は storage 経由で読み書きする。
 */
export async function ensureMigrated(): Promise<void> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

  const flag = await storage.getItem<boolean>(MIGRATION_FLAG_KEY);
  if (flag) return;

  for (const [legacyKey, item] of LEGACY_KEYS) {
    const legacyValue = localStorage.getItem(legacyKey);
    if (legacyValue != null && legacyValue !== '') {
      const current = await item.getValue();
      if (current === '') {
        await item.setValue(legacyValue);
      }
    }
  }

  await storage.setItem(MIGRATION_FLAG_KEY, true);
}
