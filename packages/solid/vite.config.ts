import { defineConfig } from 'vite-plus';
import solid from 'vite-plugin-solid';
import { base } from '../../vite.config';

export default defineConfig({
  ...base,
  plugins: [solid()],
  test: {
    ...base.test,
    // tests run in the browser; without an explicit environment vite-plugin-solid injects jsdom
    environment: 'node',
  },
  optimizeDeps: {
    include: [
      'solid-js',
      'solid-js/web',
      // late discovery reloads the browser mid-run and duplicates Solid
      '@tanstack/solid-store',
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
    plugins: [solid()],
    deps: {
      alwaysBundle: [/#.*/],
    },
  },
});
