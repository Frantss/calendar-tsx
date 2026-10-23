import baseCss from '@calendar-tsx/themes/base.css?url';
import compactCss from '@calendar-tsx/themes/compact.css?url';
import defaultCss from '@calendar-tsx/themes/default.css?url';
import highContrastCss from '@calendar-tsx/themes/high-contrast.css?url';
import materialUiCss from '@calendar-tsx/themes/material-ui.css?url';
import revenuecatCss from '@calendar-tsx/themes/revenuecat.css?url';
import shadcnCss from '@calendar-tsx/themes/shadcn.css?url';
import stripeCss from '@calendar-tsx/themes/stripe.css?url';
import type { Calendar_Event } from '@calendar-tsx/core';
import { CalendarProvider, useCalendar } from '@calendar-tsx/react';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Temporal } from 'temporal-polyfill';

import type { PlaygroundConfig, PlaygroundTheme } from '@/playground/config';
import { parsePlaygroundConfig, serializePlaygroundConfig } from '@/playground/config';
import type { PlaygroundToPreview, PreviewToPlayground } from '@/playground/messages';
import { postPlaygroundMessage, readPlaygroundMessage } from '@/playground/messages';
import previewCss from '@/playground/preview.css?url';
import { describeEvent, PreviewLayout } from '@/playground/preview-views';
import type { Booking } from '@/playground/sample-data';
import { sampleEvents, sampleRooms } from '@/playground/sample-data';
import standInsCss from '@/playground/stand-ins.css?url';
import { playgroundViews } from '@/playground/views';

const themeCss: Record<PlaygroundTheme, string> = {
  default: defaultCss,
  'high-contrast': highContrastCss,
  shadcn: shadcnCss,
  'material-ui': materialUiCss,
  revenuecat: revenuecatCss,
  stripe: stripeCss,
  base: baseCss,
};

export const Route = createFileRoute('/playground/preview')({
  head: () => ({
    meta: [{ title: 'Calendar preview' }, { name: 'robots', content: 'noindex' }],
    links: [{ rel: 'stylesheet', href: previewCss }],
  }),
  component: Preview,
});

type Api = { prev: () => void; next: () => void; today: () => void };

const today = () => Temporal.Now.plainDateISO().toString();

/** Light or dark, resolving `system` from the media query and following it while it changes. */
const useEffectiveScheme = (scheme: PlaygroundConfig['scheme'] | undefined) => {
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(query.matches);

    update();
    query.addEventListener('change', update);

    return () => query.removeEventListener('change', update);
  }, []);

  return scheme === 'system' ? (systemDark ? 'dark' : 'light') : (scheme ?? 'light');
};

function Preview() {
  // read on the client only: the config lives in the hash, and "today" must be the viewer's
  const [config, setConfig] = useState<PlaygroundConfig | null>(null);
  const api = useRef<Api | null>(null);
  const embedded = useRef(false);

  useEffect(() => {
    embedded.current = window.parent !== window;
    setConfig(parsePlaygroundConfig(window.location.hash, today()));

    const onMessage = (event: MessageEvent) => {
      const message = readPlaygroundMessage<PlaygroundToPreview>(event);

      if (message?.type === 'config') setConfig(message.config);
      if (message?.type === 'action') api.current?.[message.action]();
    };
    const onHashChange = () => setConfig(parsePlaygroundConfig(window.location.hash, today()));

    window.addEventListener('message', onMessage);
    window.addEventListener('hashchange', onHashChange);
    if (embedded.current) postPlaygroundMessage(window.parent, { type: 'ready' } satisfies PreviewToPlayground);

    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const scheme = useEffectiveScheme(config?.scheme);

  // shadcn/ui and Material UI switch on a `.dark` class, the other themes on `color-scheme`
  useEffect(() => {
    document.documentElement.style.colorScheme = scheme;
    document.documentElement.classList.toggle('dark', scheme === 'dark');
  }, [scheme]);

  if (!config) return <p>Loading the calendar…</p>;

  const onNavigate = (view: PlaygroundConfig['view'], date: string) => {
    if (embedded.current) {
      // applied here at once, so a second click before the page echoes it back moves on from this date
      setConfig({ ...config, view, date });
      postPlaygroundMessage(window.parent, { type: 'navigate', view, date } satisfies PreviewToPlayground);
    } else {
      window.location.hash = serializePlaygroundConfig({ ...config, view, date });
    }
  };

  return (
    <>
      <link rel='stylesheet' href={themeCss[config.theme]} />
      {config.density === 'compact' && <link rel='stylesheet' href={compactCss} />}
      {(config.theme === 'shadcn' || config.theme === 'material-ui') && <link rel='stylesheet' href={standInsCss} />}
      <PreviewCalendar config={config} onApi={value => (api.current = value)} onNavigate={onNavigate} />
    </>
  );
}

function PreviewCalendar({
  config,
  onApi,
  onNavigate,
}: {
  config: PlaygroundConfig;
  onApi: (api: Api) => void;
  onNavigate: (view: PlaygroundConfig['view'], date: string) => void;
}) {
  const [timeZone] = useState(() => Temporal.Now.timeZoneId());
  const [selected, setSelected] = useState<Calendar_Event<Booking> | null>(null);
  const date = Temporal.PlainDate.from(config.date);
  const month = date.with({ day: 1 }).toString();
  // regenerated per month only, so the arrays keep their identity while the week or day changes
  const events = useMemo(() => sampleEvents(Temporal.PlainDate.from(month), timeZone), [month, timeZone]);
  const resources = useMemo(() => sampleRooms(Temporal.PlainDate.from(month), timeZone), [month, timeZone]);

  const calendar = useCalendar({
    timeZone,
    views: playgroundViews.views,
    features: { ...playgroundViews.features },
    view: config.view,
    date,
    events,
    resources,
    onNavigate: next => onNavigate(next.view, next.date.toString()),
  });

  useEffect(() => {
    onApi(calendar.api);
  }, [onApi, calendar]);

  // open the time grid at 7 AM, where the sample events start; it waits until the theme makes the grid scrollable
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-part='time-grid-root']");
    const body = root?.querySelector<HTMLElement>("[data-part='time-grid-body']");
    const header = root?.querySelector<HTMLElement>("[data-part='time-grid-header']");

    if (!root || !body) return;

    const observer = new ResizeObserver(() => {
      if (root.scrollHeight <= root.clientHeight) return;

      const bodyTop = body.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;

      // half an hour before 7, so the 7 AM label clears the sticky header
      root.scrollTop = bodyTop + (body.offsetHeight * 6.5) / 24 - (header?.offsetHeight ?? 0);
      observer.disconnect();
    });

    observer.observe(root);
    observer.observe(body);

    return () => observer.disconnect();
  }, [config.view]);

  return (
    <CalendarProvider value={calendar}>
      <PreviewLayout onSelect={setSelected} />
      <p role='status' style={{ marginBlock: '0.75rem 0', minBlockSize: '1.5em', fontSize: '0.875rem' }}>
        {selected ? describeEvent(selected) : 'Select an event to see its details.'}
      </p>
    </CalendarProvider>
  );
}
