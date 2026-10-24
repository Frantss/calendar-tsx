import { getCalendarNavigation } from '@calendar-tsx/core';
import { createFileRoute } from '@tanstack/react-router';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Temporal } from 'temporal-polyfill';

import { baseOptions } from '@/lib/layout.shared';
import type {
  PlaygroundConfig,
  PlaygroundDataSet,
  PlaygroundDensity,
  PlaygroundFirstDayOfWeek,
  PlaygroundLocale,
  PlaygroundScheme,
  PlaygroundSlotMinutes,
  PlaygroundTheme,
} from '@/playground/config';
import {
  defaultPlaygroundConfig,
  parsePlaygroundConfig,
  playgroundDataSets,
  playgroundLocales,
  playgroundThemes,
  serializePlaygroundConfig,
} from '@/playground/config';
import { ContrastReadout } from '@/playground/contrast-readout';
import {
  buttonClass,
  Checkbox,
  Field,
  iconButtonClass,
  inputClass,
  Section,
  Segmented,
  SegmentedButtons,
} from '@/playground/controls';
import { EventEditor } from '@/playground/event-editor';
import type { Measurement } from '@/playground/measure';
import type { PlaygroundToPreview, PreviewToPlayground } from '@/playground/messages';
import { postPlaygroundMessage, readPlaygroundMessage } from '@/playground/messages';
import { TokenEditor } from '@/playground/token-editor';
import type { PlaygroundView } from '@/playground/views';
import { createPlaygroundViews } from '@/playground/views';

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

const slotOptions: { value: PlaygroundSlotMinutes; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
];

const clockOptions = [
  { value: 'live', label: 'Live' },
  { value: 'frozen', label: 'Frozen' },
] as const;

const weekdays: { value: PlaygroundFirstDayOfWeek; label: string }[] = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

const today = () => Temporal.Now.plainDateISO().toString();

const toUtcDate = (date: Temporal.PlainDate) => new Date(Date.UTC(date.year, date.month - 1, date.day));

/** The toolbar title: the month, the day, or the span of days the view shows. */
const periodTitle = (config: PlaygroundConfig) => {
  const { period } = getCalendarNavigation(
    createPlaygroundViews(config).views,
    config.view,
    Temporal.PlainDate.from(config.date),
    {
      firstDayOfWeek: config.firstDayOfWeek,
    },
  );

  if (config.view === 'month') return period.start.toLocaleString(config.locale, { month: 'long', year: 'numeric' });

  const format = new Intl.DateTimeFormat(config.locale, { timeZone: 'UTC', dateStyle: 'medium' });

  return period.start.equals(period.end)
    ? format.format(toUtcDate(period.start))
    : format.formatRange(toUtcDate(period.start), toUtcDate(period.end));
};

type PreviewStatus = 'loading' | 'ready' | 'failed';

function Playground() {
  // read on the client only: the config lives in the hash, and "today" must be the viewer's
  const [config, setConfig] = useState<PlaygroundConfig | null>(null);
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [measurement, setMeasurement] = useState<Measurement | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  // a newly added event opens, so its fields are ready to edit
  const [openEvent, setOpenEvent] = useState<string | null>(null);
  // the first config goes in the iframe's URL, so the preview renders before the first message arrives
  const [initialSrc, setInitialSrc] = useState<string | null>(null);
  const [timeZones] = useState(() =>
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [],
  );
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
      if (message?.type === 'measure') setMeasurement(message.measurement);
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

  const addEvent = (current: PlaygroundConfig) => {
    const id = `event-${Date.now().toString(36)}`;

    setOpenEvent(id);

    update({
      events: [
        ...current.events,
        { id, title: 'New event', date: current.date, allDay: false, start: '10:00', end: '11:00', days: 1, room: '' },
      ],
    });
  };

  const actionDisabled = status !== 'ready';

  return (
    <HomeLayout {...baseOptions()}>
      <main className='mx-auto flex w-full max-w-[90rem] flex-col gap-4 px-4 py-4 lg:px-6'>
        <header className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
          <h1 className='text-xl font-semibold'>Playground</h1>
          <p className='text-[13px] text-fd-muted-foreground'>
            The React parts with only the chosen theme loaded. The address bar keeps every setting.
          </p>
        </header>

        {!config ? (
          <p className='text-fd-muted-foreground'>Loading the playground…</p>
        ) : (
          <div className='grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]'>
            <form aria-label='Playground settings' className='order-last flex flex-col gap-2 self-start lg:order-none'>
              <div className='flex items-center gap-1.5'>
                <button type='button' onClick={copyLink} className={buttonClass}>
                  Copy link
                </button>
                <button
                  type='button'
                  onClick={() => setConfig(defaultPlaygroundConfig(today()))}
                  className={buttonClass}
                >
                  Reset all
                </button>
              </div>
              <p role='status' className='text-[11px] text-fd-muted-foreground empty:hidden'>
                {copyStatus}
              </p>

              <div className='rounded-lg border border-fd-border px-2'>
                <Section title='Calendar' open>
                  <Field label='Date'>
                    <input
                      type='date'
                      required
                      value={config.date}
                      onChange={event => event.target.value && update({ date: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label='Time zone'>
                    <select
                      value={config.timeZone}
                      onChange={event => update({ timeZone: event.target.value })}
                      className={inputClass}
                    >
                      <option value=''>Yours ({Temporal.Now.timeZoneId()})</option>
                      {timeZones.map(zone => (
                        <option key={zone} value={zone}>
                          {zone}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label='Week starts'>
                    <select
                      value={config.firstDayOfWeek}
                      onChange={event =>
                        update({ firstDayOfWeek: Number(event.target.value) as PlaygroundFirstDayOfWeek })
                      }
                      className={inputClass}
                    >
                      {weekdays.map(day => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label='Locale'>
                    <select
                      value={config.locale}
                      onChange={event => update({ locale: event.target.value as PlaygroundLocale })}
                      className={inputClass}
                    >
                      {playgroundLocales.map(locale => (
                        <option key={locale} value={locale}>
                          {locale}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label='Bar rows' hint='Per day in the month view; more hide behind "more".'>
                    <input
                      type='number'
                      min={1}
                      max={6}
                      value={config.maxEventsPerDay}
                      onChange={event => {
                        const rows = Number(event.target.value);

                        if (Number.isInteger(rows) && rows >= 1 && rows <= 6) update({ maxEventsPerDay: rows });
                      }}
                      className={inputClass}
                    />
                  </Field>
                  <Segmented
                    label='Time slot'
                    options={slotOptions}
                    value={config.slotMinutes}
                    onChange={slotMinutes => update({ slotMinutes })}
                  />
                  <Field label='Min column (px)' hint='Time grids only. Zero lets columns fit the preview.'>
                    <input
                      type='number'
                      min={0}
                      step={1}
                      required
                      value={config.minColumnWidth}
                      onChange={event => {
                        const width = event.target.valueAsNumber;
                        if (Number.isSafeInteger(width) && width >= 0) update({ minColumnWidth: width });
                      }}
                      className={inputClass}
                    />
                  </Field>
                  <Field label='Visible from' hint='Time grids only, in the calendar’s time zone.'>
                    <input
                      type='time'
                      step={60}
                      required
                      value={config.visibleStart}
                      onChange={event => event.target.value && update({ visibleStart: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field
                    label='Visible until'
                    hint='An end at or before the start is on the next day. Equal times show 24 hours.'
                  >
                    <input
                      type='time'
                      step={60}
                      required
                      value={config.visibleEnd}
                      onChange={event => event.target.value && update({ visibleEnd: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <fieldset aria-describedby='hidden-weekdays-hint' className='min-w-0'>
                    <legend className='text-[13px] text-fd-muted-foreground'>Hidden weekdays</legend>
                    <div className='grid grid-cols-2 gap-x-2'>
                      {weekdays.map(day => (
                        <label
                          key={day.value}
                          className='flex h-8 cursor-pointer items-center gap-2 text-[13px] has-[:disabled]:cursor-default pointer-coarse:h-11'
                        >
                          <input
                            type='checkbox'
                            checked={config.hiddenDays.includes(day.value)}
                            disabled={!config.hiddenDays.includes(day.value) && config.hiddenDays.length === 6}
                            onChange={event =>
                              update({
                                hiddenDays: event.target.checked
                                  ? [...config.hiddenDays, day.value].sort((a, b) => a - b)
                                  : config.hiddenDays.filter(value => value !== day.value),
                              })
                            }
                            className='size-4 accent-fd-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fd-ring'
                          />
                          {day.label}
                        </label>
                      ))}
                    </div>
                    <p id='hidden-weekdays-hint' className='text-[11px] leading-snug text-fd-muted-foreground'>
                      Keep at least one weekday visible. Overnight hours belong to their starting date.
                    </p>
                  </fieldset>
                  <Checkbox label='All-day row' checked={config.allDay} onChange={allDay => update({ allDay })} />
                  <Segmented
                    label='Clock'
                    options={clockOptions}
                    value={config.now ? 'frozen' : 'live'}
                    onChange={mode => update({ now: mode === 'frozen' ? `${config.date}T14:30` : '' })}
                  />
                  {config.now && (
                    <Field label='Frozen at' hint='In the calendar’s time zone.'>
                      <input
                        type='datetime-local'
                        required
                        value={config.now}
                        onChange={event => event.target.value && update({ now: event.target.value.slice(0, 16) })}
                        className={inputClass}
                      />
                    </Field>
                  )}
                </Section>

                <Section title='Theme' open>
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
                  {(config.theme === 'shadcn' || config.theme === 'material-ui') && (
                    <p className='text-[11px] text-fd-muted-foreground'>
                      Reads your app's variables; the preview stands in their default palettes.
                    </p>
                  )}
                  <Segmented
                    label='Density'
                    options={densityOptions}
                    value={config.density}
                    onChange={density => update({ density })}
                  />
                  <Segmented
                    label='Scheme'
                    options={schemeOptions}
                    value={config.scheme}
                    onChange={scheme => update({ scheme })}
                  />
                </Section>

                <Section title='Data'>
                  <Field label='Events' hint='Generated around the date, so every month has some.'>
                    <select
                      value={config.data}
                      onChange={event => update({ data: event.target.value as PlaygroundDataSet })}
                      className={inputClass}
                    >
                      {playgroundDataSets.map(set => (
                        <option key={set.id} value={set.id}>
                          {set.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <h3 className='mt-1 text-[13px] font-medium'>Your events</h3>
                  {config.events.length === 0 && (
                    <p className='text-[11px] text-fd-muted-foreground'>
                      None yet. Added events appear in the preview.
                    </p>
                  )}
                  {config.events.map(event => (
                    <EventEditor
                      key={event.id}
                      event={event}
                      open={event.id === openEvent}
                      onChange={next =>
                        update({ events: config.events.map(item => (item.id === event.id ? next : item)) })
                      }
                      onRemove={() => update({ events: config.events.filter(item => item.id !== event.id) })}
                    />
                  ))}
                  <button type='button' onClick={() => addEvent(config)} className={buttonClass}>
                    Add an event on{' '}
                    {Temporal.PlainDate.from(config.date).toLocaleString(config.locale, { dateStyle: 'medium' })}
                  </button>
                </Section>

                <Section title='Tokens'>
                  <TokenEditor
                    tokens={config.tokens}
                    measurement={measurement}
                    usesColors={config.theme !== 'base'}
                    onChange={tokens => update({ tokens })}
                  />
                </Section>
              </div>
            </form>

            <div className='flex min-w-0 flex-col gap-4'>
              <section aria-labelledby='playground-period' className='flex flex-col gap-2'>
                <div className='flex flex-wrap items-center gap-1.5'>
                  <button
                    type='button'
                    disabled={actionDisabled}
                    onClick={() => send({ type: 'action', action: 'prev' })}
                    className={iconButtonClass}
                    aria-label='Previous'
                    title='Previous'
                  >
                    <ChevronLeft aria-hidden className='size-4' />
                  </button>
                  <button
                    type='button'
                    disabled={actionDisabled}
                    onClick={() => send({ type: 'action', action: 'today' })}
                    className={buttonClass}
                  >
                    Today
                  </button>
                  <button
                    type='button'
                    disabled={actionDisabled}
                    onClick={() => send({ type: 'action', action: 'next' })}
                    className={iconButtonClass}
                    aria-label='Next'
                    title='Next'
                  >
                    <ChevronRight aria-hidden className='size-4' />
                  </button>
                  <h2 id='playground-period' className='ms-1 me-auto text-[15px] font-medium'>
                    {periodTitle(config)}
                  </h2>
                  <SegmentedButtons
                    name='playground-view'
                    label='View'
                    options={viewOptions}
                    value={config.view}
                    onChange={view => update({ view })}
                  />
                </div>
                <div className='relative overflow-hidden rounded-lg border border-fd-border'>
                  {initialSrc && (
                    <iframe
                      ref={frame}
                      src={initialSrc}
                      title='Calendar preview'
                      className='block h-[70dvh] w-full lg:h-[calc(100dvh-10rem)] lg:min-h-[36rem]'
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
              <ContrastReadout measurement={measurement} loading={status === 'loading'} />
            </div>
          </div>
        )}
      </main>
    </HomeLayout>
  );
}
