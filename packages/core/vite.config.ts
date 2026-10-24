import { defineConfig } from 'vite-plus';
import { base } from '../../vite.config';

export default defineConfig({
  ...base,
  pack: {
    entry: {
      index: 'export/index.ts',
      background: 'export/background.ts',
      recurrence: 'export/recurrence.ts',
    },
    format: ['esm'],
    platform: 'browser',
    dts: true,
    sourcemap: true,
    minify: false,
    clean: true,
    deps: {
      alwaysBundle: [/#.*/],
      neverBundle: ['temporal-polyfill'],
    },
  },
});
