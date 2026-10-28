import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';
import type { BrowserCommand } from 'vite-plus/test/node';
import solid from '@solidjs/vite-plugin';
import { base } from '../../../vite.config';

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const alias = [
  { find: 'solid-js/web', replacement: '@solidjs/web' },
  { find: '#calendar/calendar', replacement: local('./src/calendar.tsx') },
  { find: '#events/use-calendar-event-store', replacement: local('./src/event-store.ts') },
  { find: '#interactions/use-calendar-interaction-bindings', replacement: local('./src/interactions.ts') },
  { find: '#rendering/solid', replacement: local('./src/solid.ts') },
  { find: /^#(.*)$/, replacement: `${local('../src/')}$1` },
];

const calendarSolidV2_renderToString: BrowserCommand = async context => {
  const server = await context.project.vite.ssrLoadModule('/src/ssr-server.tsx');
  return server['ssr_render']();
};

export default defineConfig({
  ...base,
  plugins: [solid({ ssr: true })],
  resolve: { alias, dedupe: ['solid-js', '@solidjs/web'] },
  test: {
    ...base.test,
    environment: 'node',
    include: ['src/**/*.spec.tsx', '../src/views/**/*.spec.tsx'],
    browser: { ...base.test?.browser, commands: { calendarSolidV2_renderToString } },
  },
  optimizeDeps: { include: ['solid-js', '@solidjs/web', '@tanstack/store', 'temporal-polyfill'] },
  pack: {
    tsconfig: '../tsconfig.v2.json',
    entry: { index: 'export/index.ts' },
    outDir: '../dist/v2',
    format: ['esm'],
    platform: 'browser',
    dts: true,
    sourcemap: true,
    minify: false,
    clean: true,
    plugins: [solid()],
    alias: Object.fromEntries(
      alias.filter(entry => typeof entry.find === 'string').map(entry => [entry.find, entry.replacement]),
    ),
    deps: {
      alwaysBundle: [/#.*/],
      neverBundle: ['@calendar-tsx/core', '@tanstack/store', 'solid-js', '@solidjs/web', 'temporal-polyfill'],
    },
  },
});
