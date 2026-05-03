import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // .env lives in the repo root, not in client/
  envDir: '..',
  plugins: [react()],
  server: {
    port: 5173,
    // expose to all interfaces so discord's proxy can reach us
    host: true,
    // vite 6 blocks requests from non-localhost hosts by default.
    // discord's proxy sends requests with a discordsays.com host header
    // so we need to allow all hosts or it just returns a blank page
    allowedHosts: true,
    // forward /api reqs to express in dev
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    hmr: {
      // discord's activity proxy uses https on 443,
      // hmr websocket needs to match or it wont connect
      clientPort: 443,
    },
  },
});
