import { useEffect, useRef, useState } from 'react';
import { Temporal } from 'temporal-polyfill';

import type { PlaygroundConfig, PlaygroundDensity, PlaygroundTheme } from '@/playground/config';
import { defaultPlaygroundConfig, playgroundThemes, serializePlaygroundConfig } from '@/playground/config';
import { Checkbox, Field, inputClass } from '@/playground/controls';
import type { PlaygroundToPreview, PreviewToPlayground } from '@/playground/messages';
import { postPlaygroundMessage, readPlaygroundMessage } from '@/playground/messages';
import type { PlaygroundView } from '@/playground/views';

const today = () => Temporal.Now.plainDateISO().toString();

// the docs switch themes with a `.dark` class on the root, not only with the media query
const pageScheme = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

// Day grids and agenda grow the frame to fit; time grids and timelines scroll inside a fixed frame.
const fitsContent = (view: PlaygroundView) =>
  [
    'month',
    'year',
    'grid_days',
    'grid_rooms',
    'month_rooms',
    'room_months',
    'agenda',
    'agenda_rooms',
    'agenda_dates_rooms',
  ].includes(view);

type PreviewStatus = 'loading' | 'ready' | 'failed';

/**
 * The playground's preview in a page: the React parts with sample events and one theme. `pickTheme` adds a theme and
 * density picker above it.
 */
export function CalendarPreview({
  view,
  theme = 'default',
  density = 'regular',
  pickTheme = false,
}: {
  view: PlaygroundView;
  theme?: PlaygroundTheme;
  density?: PlaygroundDensity;
  pickTheme?: boolean;
}) {
  // built on the client only: "today" and the page's color scheme are the viewer's
  const [config, setConfig] = useState<PlaygroundConfig | null>(null);
  const [initialSrc, setInitialSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  // the frame loads lazily, so the wait for the preview starts when its page has loaded
  const [loaded, setLoaded] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef<PlaygroundConfig | null>(null);
  const content = useRef<ResizeObserver | null>(null);

  function send(message: PlaygroundToPreview) {
    const target = frame.current?.contentWindow;

    if (target) postPlaygroundMessage(target, message);
  }

  useEffect(() => {
    const initial = { ...defaultPlaygroundConfig(today()), view, theme, density, scheme: pageScheme() } as const;

    setConfig(initial);
    setInitialSrc(`/playground/preview#${serializePlaygroundConfig(initial)}`);

    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;

      const message = readPlaygroundMessage<PreviewToPlayground>(event);

      if (message?.type === 'ready') {
        setStatus('ready');
        if (latest.current) send({ type: 'config', config: latest.current });
      }
      // kept here, so a theme change doesn't undo the reader's navigation
      if (message?.type === 'navigate') {
        setConfig(current => (current ? { ...current, view: message.view, date: message.date } : current));
      }
    };
    const observer = new MutationObserver(() =>
      setConfig(current => (current ? { ...current, scheme: pageScheme() } : current)),
    );

    window.addEventListener('message', onMessage);
    observer.observe(document.documentElement, { attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('message', onMessage);
      observer.disconnect();
    };
  }, [view, theme, density]);

  useEffect(() => {
    if (status !== 'loading' || !loaded) return;

    const timeout = window.setTimeout(() => setStatus('failed'), 10_000);

    return () => window.clearTimeout(timeout);
  }, [status, loaded]);

  useEffect(() => {
    latest.current = config;
    if (config && status === 'ready') send({ type: 'config', config });
  }, [config, status]);

  // same origin, so the frame's document is measured directly
  const onLoad = () => {
    setLoaded(true);

    const document = frame.current?.contentDocument;

    content.current?.disconnect();
    if (!document) return;

    content.current = new ResizeObserver(() => setContentHeight(document.body.offsetHeight));
    content.current.observe(document.body);
  };

  useEffect(() => () => content.current?.disconnect(), []);

  const update = (patch: Partial<PlaygroundConfig>) =>
    setConfig(current => (current ? { ...current, ...patch } : current));

  return (
    <figure className='not-prose my-6 flex flex-col gap-2'>
      {pickTheme && config && (
        <div className='grid gap-2 sm:grid-cols-2'>
          <Field label='Theme'>
            <select
              value={config.theme}
              onChange={event => update({ theme: event.target.value as PlaygroundTheme })}
              className={inputClass}
            >
              {playgroundThemes.map(option => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Checkbox
            label='Compact density'
            checked={config.density === 'compact'}
            onChange={compact => update({ density: compact ? 'compact' : 'regular' })}
          />
        </div>
      )}
      <div
        className='relative h-[34rem] overflow-hidden rounded-lg border border-fd-border'
        style={
          config && fitsContent(config.view) && contentHeight
            ? { height: contentHeight + 2 /* the border */ }
            : undefined
        }
      >
        {initialSrc && (
          <iframe
            ref={frame}
            src={initialSrc}
            title={`Live ${view} view preview`}
            loading='lazy'
            onLoad={onLoad}
            className='block size-full'
          />
        )}
        {status !== 'ready' && (
          <p className='absolute inset-0 grid place-items-center bg-fd-background p-6 text-center text-sm text-fd-muted-foreground'>
            {status === 'loading' ? 'Loading the preview…' : "The preview didn't load. Reload the page to try again."}
          </p>
        )}
      </div>
      <figcaption className='flex flex-wrap items-baseline justify-between gap-x-3 text-[13px] text-fd-muted-foreground'>
        <span>Live, with sample events. Click an event to see what it reports.</span>
        {config && (
          <a
            href={`/docs/playground#${serializePlaygroundConfig(config)}`}
            className='font-medium text-fd-foreground underline underline-offset-4 pointer-coarse:py-3'
          >
            Open in the playground
          </a>
        )}
      </figcaption>
    </figure>
  );
}
