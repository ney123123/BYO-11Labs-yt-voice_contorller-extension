import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'node:path';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        offscreen:  resolve(process.cwd(), 'src/offscreen/offscreen.html'),
        permission: resolve(process.cwd(), 'src/permission/permission.html'),
      },
    },
  },
  server: { port: 5173, strictPort: true, hmr: { port: 5173 } },
});
