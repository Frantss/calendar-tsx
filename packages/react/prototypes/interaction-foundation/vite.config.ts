import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: { '@calendar-tsx/core': fileURLToPath(new URL('../../../core/export/index.ts', import.meta.url)) },
  },
  server: { host: '127.0.0.1', port: 5177, strictPort: true },
  optimizeDeps: {
    include: ['react', 'react-dom/client', '@tanstack/react-store', '@tanstack/store', 'temporal-polyfill'],
  },
  build: {
    outDir: 'dist/interaction-prototype',
    rolldownOptions: { input: 'prototypes/interaction-foundation/index.html' },
  },
});
