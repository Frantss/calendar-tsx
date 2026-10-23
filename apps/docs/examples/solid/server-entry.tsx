import { generateHydrationScript, hydrate, renderToString } from 'solid-js/web';
import { Temporal } from 'temporal-polyfill';

import { Schedule } from './server-rendering';

// #region server
// server: render with the request's instant, and send the same instant to the client
export const render = (date: string) => {
  const now = Temporal.Now.instant().toString();
  const html = renderToString(() => (
    <Schedule now={now} date={date}>
      {null}
    </Schedule>
  ));

  return { html, head: generateHydrationScript(), data: { now, date } };
};
// #endregion server

// #region client
// client: hydrate with the instant the server used
export const start = (root: HTMLElement, data: { now: string; date: string }) =>
  hydrate(
    () => (
      <Schedule now={data.now} date={data.date}>
        {null}
      </Schedule>
    ),
    root,
  );
// #endregion client
