import { defineConfig } from 'vite-plus';
import { base } from '../../vite.config';

export default defineConfig({
  ...base,
  pack: {
    entry: {
      index: 'export/index.ts',
    },
    format: ['esm'],
    platform: 'browser',
    dts: true,
    sourcemap: true,
    minify: false,
    clean: true,
    deps: {
      alwaysBundle: [/#.*/],
      neverBundle: ['@calendar-tsx/core', 'temporal-polyfill', 'rrule-temporal'],
    },
  },
});
