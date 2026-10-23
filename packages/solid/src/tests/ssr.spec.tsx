import { hydrate } from 'solid-js/web';
import type { Temporal } from 'temporal-polyfill';
import { afterEach, expect, it, onTestFinished, vi } from 'vitest';
import { commands } from 'vitest/browser';

import type { SsrApp_Props } from '#tests/ssr.app';
import { SsrApp, ssrApp_defaults as defaults } from '#tests/ssr.app';

declare module 'vitest/browser' {
  interface BrowserCommands {
    calendarSolid_renderToString: (props: SsrApp_Props) => Promise<{ html: string; script: string }>;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

/** Renders on a "server" clock in Node; `hydrateClient` then takes the markup over on a later "client" clock. */
const setup = async ({ initialNow }: { initialNow?: Temporal.Instant }) => {
  const consoleError = vi.spyOn(console, 'error');
  const consoleWarn = vi.spyOn(console, 'warn');
  const shared = { initialNow: initialNow?.toString() };
  const server = await commands.calendarSolid_renderToString({ now: defaults.serverNow.toString(), ...shared });
  const container = document.createElement('div');

  // `generateHydrationScript` sets up the `_$HY` global that `hydrate` expects
  const script = document.createElement('script');
  script.textContent = new DOMParser().parseFromString(server.script, 'text/html').querySelector('script')?.textContent ?? '';
  document.head.append(script);

  container.innerHTML = server.html;
  document.body.append(container);

  const serverRoot = container.querySelector('[data-part="time-grid-root"]');
  const columns = () => [...container.querySelectorAll('[data-part="time-grid-column"]')];
  const ui = {
    html: server.html,
    todayIndex: () => columns().findIndex(column => column.hasAttribute('data-today')),
    serverTodayIndex: columns().findIndex(column => column.hasAttribute('data-today')),
    /** True when hydration adopted the server's root node instead of rendering a new one. */
    keptServerRoot: () => container.querySelector('[data-part="time-grid-root"]') === serverRoot,
  };

  let dispose = () => {};

  onTestFinished(() => {
    dispose();
    container.remove();
    script.remove();
  });

  const hydrateClient = () => {
    dispose = hydrate(() => <SsrApp now={defaults.clientNow.toString()} {...shared} />, container);
  };

  return { ui, hydrateClient, errors: () => [...consoleError.mock.calls, ...consoleWarn.mock.calls] };
};

it('renders the parts on the server with hydration keys and the server day as today', async () => {
  const { ui } = await setup({ initialNow: defaults.serverNow });

  expect(ui.html).toContain('data-part="time-grid-root"');
  expect(ui.html).toContain('data-part="time-grid-now"');
  expect(ui.html).toContain('data-hk=');
  // Wednesday 2026-03-11 in a Sunday-first week
  expect(ui.serverTodayIndex).toBe(3);
});

it('hydrates server markup in place when both sides share initialNow', async () => {
  const { ui, hydrateClient, errors } = await setup({ initialNow: defaults.serverNow });

  hydrateClient();

  // the mount tick moves "today" to the client's day, so this waits for hydration and effects
  await vi.waitFor(() => expect(ui.todayIndex()).toBe(ui.serverTodayIndex + 1));
  expect(ui.keptServerRoot()).toBe(true);
  expect(errors()).toEqual([]);
});

it('fails to hydrate when the server and client derive different now values', async () => {
  const { hydrateClient } = await setup({});

  expect(hydrateClient).toThrow('Hydration Mismatch');
});
