import { expect, it } from 'vitest';
import { commands } from 'vitest/browser';

declare module 'vitest/browser' {
  interface BrowserCommands {
    calendarSolidV2_renderToString: () => Promise<string>;
  }
}

it('renders shared parts on the server without mounting the clock', async () => {
  const html = await commands.calendarSolidV2_renderToString();
  expect(html).toContain('data-part="list-root"');
  expect(html).toContain('data-part="list-empty"');
  expect(html).toContain('No events');
});
