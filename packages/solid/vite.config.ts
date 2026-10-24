import { defineConfig } from 'vite-plus';
import type { BrowserCommand } from 'vite-plus/test/node';
import solid from 'vite-plugin-solid';
import { base } from '../../vite.config';

/** Renders `src/tests/ssr.server.tsx` through Vite's SSR pipeline, so it runs the server-compiled parts in Node (D32). */
const calendarSolid_renderToString: BrowserCommand<[props: Record<string, string | undefined>]> = async (
  context,
  props,
) => {
  const server = await context.project.vite.ssrLoadModule('/src/tests/ssr.server.tsx');

  return server['ssrServer_render'](props);
};

export default defineConfig({
  ...base,
  // hydratable output on the client, `generate: 'ssr'` for modules loaded through SSR
  plugins: [solid({ ssr: true })],
  test: {
    ...base.test,
    // tests run in the browser; without an explicit environment vite-plugin-solid injects jsdom
    environment: 'node',
    browser: {
      ...base.test?.browser,
      commands: { calendarSolid_renderToString },
    },
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
    format: ['esm'],
    platform: 'browser',
    dts: true,
    sourcemap: true,
    minify: false,
    clean: true,
    // the parts compile to `createComponent` calls only, so one build serves both sides: `solid-js/web`'s own
    // conditions pick the server or client runtime (D32)
    plugins: [solid()],
    deps: {
      alwaysBundle: [/#.*/],
      neverBundle: ['temporal-polyfill'],
    },
  },
});
