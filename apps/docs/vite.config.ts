import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite-plus';
import { base } from '../../vite.config';

export default defineConfig(({ command, isPreview }) => ({
  ...base,
  server: {
    port: 3000,
  },
  ssr: {
    noExternal: ['@frantss/fumadocs-theme'],
  },
  plugins: [
    fumadocsMdx(),
    tailwindcss(),
    tanstackStart({
      // only reachable through the playground's iframe, which the crawler does not follow
      pages: [{ path: '/playground/preview' }],
      prerender: {
        enabled: true,
        // the crawler queues `/page#anchor` apart from `/page` but writes both to the same file; concurrent writes can
        // leave it empty, and the sidebar already links every page without a hash
        filter: ({ path }) => !path.includes('#'),
      },
    }),
    react(),
    // no preset: nitro detects the host at build time, and falls back to a node server
    nitro(),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: 'tslib', replacement: 'tslib/tslib.es6.js' },
      // Keep dev modules stable while package builds replace their dist output.
      ...(command === 'serve' && !isPreview
        ? [
            {
              find: /^@calendar-tsx\/core$/,
              replacement: fileURLToPath(new URL('../../packages/core/export/index.ts', import.meta.url)),
            },
            {
              find: /^@calendar-tsx\/react$/,
              replacement: fileURLToPath(new URL('../../packages/react/export/index.ts', import.meta.url)),
            },
          ]
        : []),
    ],
  },
}));
