import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  manifest: {
    name: 'GitHub Search Extension',
    description: 'GitHub Search Extension',
    permissions: ['contextMenus', 'activeTab', 'storage'],
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
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
