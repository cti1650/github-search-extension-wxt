import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  manifest: ({ browser }) => ({
    name: 'GitHub Search Extension',
    description: 'GitHub Search Extension',
    permissions: [
      'contextMenus',
      'activeTab',
      'storage',
      'scripting',
      ...(browser === 'chrome' ? ['sidePanel'] : []),
    ],
    action: {
      default_title: 'GitHub Search Extension',
    },
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Alt+G',
          mac: 'Alt+G',
        },
      },
      'search-selection': {
        description: 'Search the current page selection on GitHub',
        suggested_key: {
          default: 'Alt+Shift+G',
          mac: 'Alt+Shift+G',
        },
      },
    },
    omnibox: {
      keyword: 'gse',
    },
  }),
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
