import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@calendar-tsx\/core$/,
        replacement: fileURLToPath(new URL('../../packages/core/export/index.ts', import.meta.url)),
      },
      {
        find: /^@calendar-tsx\/react$/,
        replacement: fileURLToPath(new URL('../../packages/react/export/index.ts', import.meta.url)),
      },
      {
        find: /^@calendar-tsx\/rrule$/,
        replacement: fileURLToPath(new URL('../../packages/rrule/export/index.ts', import.meta.url)),
      },
    ],
    dedupe: ['react', 'react-dom'],
  },
});
