import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'YT Voice',
  version: '0.0.1',
  description: 'Hands-free voice control for YouTube watch pages.',
  icons: {
    '16': 'icon-16.png',
    '48': 'icon-48.png',
    '128': 'icon-128.png',
  },
  action: {
    default_popup: 'src/popup/popup.html',
    default_title: 'YT Voice',
    default_icon: { '16': 'icon-16.png', '48': 'icon-48.png' },
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://www.youtube.com/watch*'],
      js: ['src/content/index.tsx'],
      run_at: 'document_idle',
    },
    {
      matches: ['https://www.youtube.com/watch*'],
      js: ['src/content/playerApiBridge.main.ts'],
      run_at: 'document_idle',
      world: 'MAIN',
    },
  ],
  permissions: ['storage', 'offscreen'],
  host_permissions: [
    'https://www.youtube.com/*',
  ],
  minimum_chrome_version: '116',
});
