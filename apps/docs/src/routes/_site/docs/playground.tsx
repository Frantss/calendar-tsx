import { getCalendarNavigation } from '@calendar-tsx/core';
import { createFileRoute } from '@tanstack/react-router';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Temporal } from 'temporal-polyfill';

import { baseOptions } from '@/lib/layout.shared';
import type { PlaygroundConfig, PlaygroundDensity, PlaygroundScheme, PlaygroundTheme } from '@/playground/config';
import {
  defaultPlaygroundConfig,
  parsePlaygroundConfig,
  playgroundThemes,
  serializePlaygroundConfig,
} from '@/playground/config';
import type { PlaygroundToPreview, PreviewToPlayground } from '@/playground/messages';
import { postPlaygroundMessage, readPlaygroundMessage } from '@/playground/messages';
import type { PlaygroundView } from '@/playground/views';
import { playgroundViews } from '@/playground/views';

export const Route = createFileRoute('/_site/docs/playground')({
  head: () => ({ meta: [{ title: 'Playground · calendar-tsx' }] }),
  component: Playground,
});

const viewOptions: { value: PlaygroundView; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
  { value: 'rooms', label: 'Rooms' },
  { value: 'agenda', label: 'Agenda' },
];

const densityOptions: { value: PlaygroundDensity; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'compact', label: 'Compact' },
];

const schemeOptions: { value: PlaygroundScheme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const today = () => Temporal.Now.plainDateISO().toString();

const toUtcDate = (date: Temporal.PlainDate) => new Date(Date.UTC(date.year, date.month - 1, date.day));

/** The toolbar title: the month, the day, or the span of days the view shows. */
const periodTitle = (config: PlaygroundConfig) => {
  const { period } = getCalendarNavigation(playgroundViews.views, config.view, Temporal.PlainDate.from(config.date));

  if (config.view === 'month') return period.start.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const format = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', dateStyle: 'medium' });

  return period.start.equals(period.end)
    ? format.format(toUtcDate(period.start))
    : format.formatRange(toUtcDate(period.start), toUtcDate(period.end));
};

type PreviewStatus = 'loading' | 'ready' | 'failed';

function Playground() {
  // read on the client only: the config lives in the hash, and "today" must be the viewer's
  const [config, setConfig] = useState<PlaygroundConfig | null>(null);
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [copyStatus, setCopyStatus] = useState('');
  // the first config goes in the iframe's URL, so the preview renders before the first message arrives
  const [initialSrc, setInitialSrc] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef<PlaygroundConfig | null>(null);

  useEffect(() => {
    const initial = parsePlaygroundConfig(window.location.hash, today());

    setConfig(initial);
    setInitialSrc(`/playground/preview#${serializePlaygroundConfig(initial)}`);

    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;

      const message = readPlaygroundMessage<PreviewToPlayground>(event);

      if (message?.type === 'ready') {
        setStatus('ready');
        if (latest.current) send({ type: 'config', config: latest.current });
      }
      if (message?.type === 'navigate') {
        setConfig(current => (current ? { ...current, view: message.view, date: message.date } : current));
      }
    };

    // a pasted link or an edited address on an open page; `replaceState` below does not fire this
    const onHashChange = () => setConfig(parsePlaygroundConfig(window.location.hash, today()));

    window.addEventListener('message', onMessage);
    window.addEventListener('hashchange', onHashChange);

    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  useEffect(() => {
    if (status !== 'loading') return;

    const timeout = window.setTimeout(() => setStatus('failed'), 10_000);

    return () => window.clearTimeout(timeout);
  }, [status]);

  // keep the URL and the preview in step with the controls
  useEffect(() => {
    latest.current = config;
    if (!config) return;

    window.history.replaceState(null, '', `#${serializePlaygroundConfig(config)}`);
    if (status === 'ready') send({ type: 'config', config });
  }, [config, status]);

  function send(message: PlaygroundToPreview) {
    const target = frame.current?.contentWindow;

    if (target) postPlaygroundMessage(target, message);
  }

  const update = (patch: Partial<PlaygroundConfig>) =>
    setConfig(current => (current ? { ...current, ...patch } : current));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus('Link copied.');
    } catch {
      setCopyStatus("Couldn't copy the link. Copy it from the address bar instead.");
    }
  };

  return (
    <HomeLayout {...baseOptions()}>
      <main className='mx-auto flex w-full max-w-[90rem] flex-col gap-6 px-4 py-6 lg:px-6'>
        <header className='flex flex-col gap-1'>
          <h1 className='text-2xl font-semibold'>Playground</h1>
          <p className='text-fd-muted-foreground'>
            Change the view, the date and the theme. The preview runs the React parts with only the chosen theme loaded,
            and the address bar keeps every setting, so you can share what you see.
          </p>
        </header>

        {!config ? (
          <p className='text-fd-muted-foreground'>Loading the playground…</p>
        ) : (
          <div className='grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]'>
            <form aria-label='Playground settings' className='grid content-start gap-5 sm:grid-cols-2 lg:grid-cols-1'>
              <Segmented
                legend='View'
                name='view'
                options={viewOptions}
                value={config.view}
                onChange={view => update({ view })}
              />
              <Field label='Date'>
                <input
                  type='date'
                  required
                  value={config.date}
                  onChange={event => event.target.value && update({ date: event.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label='Theme'>
                <select
                  value={config.theme}
                  onChange={event => update({ theme: event.target.value as PlaygroundTheme })}
                  className={inputClass}
                >
                  {playgroundThemes.map(theme => (
                    <option key={theme.id} value={theme.id}>
                      {theme.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Segmented
                legend='Density'
                name='density'
                options={densityOptions}
                value={config.density}
                onChange={density => update({ density })}
              />
              <Segmented
                legend='Color scheme'
                name='scheme'
                options={schemeOptions}
                value={config.scheme}
                onChange={scheme => update({ scheme })}
              />
              {(config.theme === 'shadcn' || config.theme === 'material-ui') && (
                <p className='text-sm text-fd-muted-foreground sm:col-span-2 lg:col-span-1'>
                  These themes read your app's variables. The preview stands in their default palettes.
                </p>
              )}
              <div className='flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-1'>
                <button type='button' onClick={copyLink} className={buttonClass}>
                  Copy link
                </button>
                <button
                  type='button'
                  onClick={() => setConfig(defaultPlaygroundConfig(today()))}
                  className={buttonClass}
                >
                  Reset
                </button>
                <p role='status' className='basis-full text-sm text-fd-muted-foreground'>
                  {copyStatus}
                </p>
              </div>
            </form>

            <section aria-labelledby='playground-period' className='flex min-w-0 flex-col gap-3'>
              <div className='flex flex-wrap items-center gap-2'>
                <button
                  type='button'
                  disabled={status !== 'ready'}
                  onClick={() => send({ type: 'action', action: 'prev' })}
                  className={buttonClass}
                >
                  Previous
                </button>
                <button
                  type='button'
                  disabled={status !== 'ready'}
                  onClick={() => send({ type: 'action', action: 'today' })}
                  className={buttonClass}
                >
                  Today
                </button>
                <button
                  type='button'
                  disabled={status !== 'ready'}
                  onClick={() => send({ type: 'action', action: 'next' })}
                  className={buttonClass}
                >
                  Next
                </button>
                <h2 id='playground-period' className='ms-1 text-lg font-medium'>
                  {periodTitle(config)}
                </h2>
              </div>
              <div className='relative overflow-hidden rounded-xl border border-fd-border'>
                {initialSrc && (
                  <iframe
                    ref={frame}
                    src={initialSrc}
                    title='Calendar preview'
                    className='block h-[70dvh] w-full lg:h-[calc(100dvh-12rem)] lg:min-h-[36rem]'
                  />
                )}
                {status !== 'ready' && (
                  <p className='absolute inset-0 grid place-items-center bg-fd-background p-6 text-center text-fd-muted-foreground'>
                    {status === 'loading'
                      ? 'Loading the preview…'
                      : "The preview didn't load. Reload the page to try again."}
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </HomeLayout>
  );
}

const inputClass =
  'min-h-11 w-full rounded-lg border border-fd-border bg-fd-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-fd-ring';

const buttonClass =
  'min-h-11 rounded-lg border border-fd-border bg-fd-secondary px-4 text-sm font-medium text-fd-secondary-foreground hover:bg-fd-accent disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-fd-ring';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className='flex flex-col gap-1.5 text-sm font-medium'>
      {label}
      {children}
    </label>
  );
}

function Segmented<TValue extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: { value: TValue; label: string }[];
  value: TValue;
  onChange: (value: TValue) => void;
}) {
  return (
    <fieldset className='flex flex-col gap-1.5'>
      <legend className='mb-1.5 text-sm font-medium'>{legend}</legend>
      <div className='flex flex-wrap gap-1 rounded-lg border border-fd-border p-1'>
        {options.map(option => (
          <label
            key={option.value}
            className='flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md px-3 text-sm hover:bg-fd-accent has-[:checked]:bg-fd-primary has-[:checked]:text-fd-primary-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-fd-ring'
          >
            <input
              type='radio'
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className='sr-only'
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
