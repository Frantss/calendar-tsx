import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';
import { base } from '../../vite.config';

export default defineConfig({
  ...base,
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-dom/server',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      // late discovery reloads the browser mid-run and duplicates React
      '@tanstack/react-store',
      '@tanstack/store',
      'temporal-polyfill',
    ],
  },
  pack: {
    entry: {
      index: 'export/index.ts',
    },
    format: ['esm', 'cjs'],
    platform: 'browser',
    dts: true,
    sourcemap: true,
    minify: false,
    clean: true,
    // the parts use context and hooks, so React Server Components must treat the entry as a client module (D27)
    banner: { js: "'use client';" },
    deps: {
      alwaysBundle: [/#.*/],
      neverBundle: ['temporal-polyfill'],
    },
  },
});
