import type { WxtStorageItem } from 'wxt/utils/storage';
import { storage } from 'wxt/utils/storage';

export const keywordItem = storage.defineItem<string>('local:search_keyword', {
  fallback: '',
});

export const exclusionKeywordItem = storage.defineItem<string>('local:search_exclusion_keyword', {
  fallback: '',
});

export const extensionKeywordItem = storage.defineItem<string>(
  'local:search_file_extension_keyword',
  {
    fallback: '',
  },
);

export type StringStorageItem = WxtStorageItem<string, Record<string, unknown>>;

export const storageItemByHolder: Record<string, StringStorageItem> = {
  search_keyword: keywordItem,
  search_exclusion_keyword: exclusionKeywordItem,
  search_file_extension_keyword: extensionKeywordItem,
};
