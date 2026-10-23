import { Temporal } from 'temporal-polyfill';

import type { TokenOverrides } from './tokens';
import { emptyTokenOverrides, hasTokenOverrides, sanitizeTokenOverrides } from './tokens';
import type { PlaygroundView } from './views';
import { playgroundViews } from './views';

export const playgroundThemes = [
  { id: 'default', label: 'Default' },
  { id: 'high-contrast', label: 'High contrast' },
  { id: 'shadcn', label: 'shadcn/ui' },
  { id: 'material-ui', label: 'Material UI' },
  { id: 'revenuecat', label: 'RevenueCat' },
  { id: 'stripe', label: 'Stripe' },
  { id: 'base', label: 'Base only (positioning)' },
] as const;

export const playgroundDataSets = [
  { id: 'sample', label: 'Sample week' },
  { id: 'busy', label: 'Busy weeks' },
  { id: 'empty', label: 'Only my events' },
] as const;

export const playgroundLocales = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'pt-BR', 'ja-JP'] as const;

export const playgroundRooms = [
  { id: 'room-a', label: 'Room A' },
  { id: 'room-b', label: 'Room B' },
  { id: 'room-c', label: 'Room C' },
] as const;

export type PlaygroundTheme = (typeof playgroundThemes)[number]['id'];
export type PlaygroundDataSet = (typeof playgroundDataSets)[number]['id'];
export type PlaygroundLocale = (typeof playgroundLocales)[number];
export type PlaygroundRoom = (typeof playgroundRooms)[number]['id'];
export type PlaygroundDensity = 'regular' | 'compact';
export type PlaygroundScheme = 'light' | 'dark' | 'system';
export type PlaygroundSlotMinutes = 15 | 30 | 60;
export type PlaygroundFirstDayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** An event added in the playground. Times are wall-clock times in the calendar's time zone. */
export type PlaygroundEvent = {
  id: string;
  title: string;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  allDay: boolean;
  /** `HH:MM`; an end at or before the start ends the next day. Ignored for all-day events. */
  start: string;
  end: string;
  /** Days covered by an all-day event. */
  days: number;
  room: PlaygroundRoom | '';
};

export type PlaygroundConfig = {
  view: PlaygroundView;
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  theme: PlaygroundTheme;
  density: PlaygroundDensity;
  scheme: PlaygroundScheme;
  /** IANA zone; empty for the viewer's own. */
  timeZone: string;
  firstDayOfWeek: PlaygroundFirstDayOfWeek;
  locale: PlaygroundLocale;
  maxEventsPerDay: number;
  slotMinutes: PlaygroundSlotMinutes;
  allDay: boolean;
  /** `YYYY-MM-DDTHH:MM` in the calendar's zone to freeze the clock there; empty for the live clock. */
  now: string;
  data: PlaygroundDataSet;
  events: PlaygroundEvent[];
  tokens: TokenOverrides;
};

export const defaultPlaygroundConfig = (today: string): PlaygroundConfig => ({
  view: 'week',
  date: today,
  theme: 'default',
  density: 'regular',
  scheme: 'system',
  timeZone: '',
  firstDayOfWeek: 7,
  locale: 'en-US',
  maxEventsPerDay: 3,
  slotMinutes: 30,
  allDay: true,
  now: '',
  data: 'sample',
  events: [],
  tokens: emptyTokenOverrides(),
});

const oneOf =
  <T extends string | number>(values: readonly T[]) =>
  (value: unknown): value is T =>
    values.includes(value as T);

const isView = (value: string | null): value is PlaygroundView => value !== null && value in playgroundViews.views;
const isTheme = oneOf(playgroundThemes.map(theme => theme.id));
const isDataSet = oneOf(playgroundDataSets.map(set => set.id));
const isLocale = oneOf(playgroundLocales);
const isRoom = oneOf<PlaygroundRoom | ''>(['', ...playgroundRooms.map(room => room.id)]);
const isScheme = oneOf<PlaygroundScheme>(['light', 'dark', 'system']);
const isDensity = oneOf<PlaygroundDensity>(['regular', 'compact']);
const isSlotMinutes = oneOf<PlaygroundSlotMinutes>([15, 30, 60]);
const isFirstDayOfWeek = oneOf<PlaygroundFirstDayOfWeek>([1, 2, 3, 4, 5, 6, 7]);
const isTime = (value: unknown): value is string =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const isDate = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;

  try {
    return Temporal.PlainDate.from(value).toString() === value;
  } catch {
    return false;
  }
};

const isDateTime = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;

  try {
    Temporal.PlainDateTime.from(value);

    return true;
  } catch {
    return false;
  }
};

const isTimeZone = (value: unknown): value is string => {
  if (typeof value !== 'string' || value === '') return false;

  try {
    Temporal.Now.zonedDateTimeISO(value);

    return true;
  } catch {
    return false;
  }
};

const parseJson = (value: string | null): unknown => {
  if (!value) return undefined;

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const sanitizeEvents = (input: unknown): PlaygroundEvent[] => {
  if (!Array.isArray(input)) return [];

  return input.flatMap((item, index): PlaygroundEvent[] => {
    if (typeof item !== 'object' || item === null) return [];

    const event = item as Record<string, unknown>;

    if (!isDate(event['date'])) return [];

    return [
      {
        id: typeof event['id'] === 'string' && event['id'] ? event['id'] : `event-${index + 1}`,
        title: typeof event['title'] === 'string' ? event['title'].slice(0, 80) : 'Event',
        date: event['date'],
        allDay: event['allDay'] === true,
        start: isTime(event['start']) ? event['start'] : '10:00',
        end: isTime(event['end']) ? event['end'] : '11:00',
        days: typeof event['days'] === 'number' ? Math.min(Math.max(Math.round(event['days']), 1), 14) : 1,
        room: isRoom(event['room']) ? event['room'] : '',
      },
    ];
  });
};

/** Reads a config from a URL hash; anything missing or invalid falls back to the default. */
export const parsePlaygroundConfig = (hash: string, today: string): PlaygroundConfig => {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const fallback = defaultPlaygroundConfig(today);
  const view = params.get('view');
  const date = params.get('date');
  const theme = params.get('theme');
  const density = params.get('density');
  const scheme = params.get('scheme');
  const timeZone = params.get('tz');
  const firstDayOfWeek = Number(params.get('fdow'));
  const locale = params.get('locale');
  const maxEventsPerDay = Number(params.get('max'));
  const slotMinutes = Number(params.get('slot'));
  const now = params.get('now');
  const data = params.get('data');

  return {
    view: isView(view) ? view : fallback.view,
    date: isDate(date) ? date : fallback.date,
    theme: isTheme(theme) ? theme : fallback.theme,
    density: isDensity(density) ? density : fallback.density,
    scheme: isScheme(scheme) ? scheme : fallback.scheme,
    timeZone: isTimeZone(timeZone) ? timeZone : fallback.timeZone,
    firstDayOfWeek: isFirstDayOfWeek(firstDayOfWeek) ? firstDayOfWeek : fallback.firstDayOfWeek,
    locale: isLocale(locale) ? locale : fallback.locale,
    maxEventsPerDay:
      Number.isInteger(maxEventsPerDay) && maxEventsPerDay >= 1 && maxEventsPerDay <= 6
        ? maxEventsPerDay
        : fallback.maxEventsPerDay,
    slotMinutes: isSlotMinutes(slotMinutes) ? slotMinutes : fallback.slotMinutes,
    allDay: params.get('allday') !== 'off',
    now: isDateTime(now) ? now : fallback.now,
    data: isDataSet(data) ? data : fallback.data,
    events: sanitizeEvents(parseJson(params.get('events'))),
    tokens: sanitizeTokenOverrides(parseJson(params.get('tokens'))),
  };
};

/** The config as a hash; settings left at their default are omitted, so shared links stay short. */
export const serializePlaygroundConfig = (config: PlaygroundConfig) => {
  const fallback = defaultPlaygroundConfig(config.date);
  const params = new URLSearchParams({ view: config.view, date: config.date });
  const add = (key: string, value: string | number, base: string | number) => {
    if (value !== base) params.set(key, String(value));
  };

  add('theme', config.theme, fallback.theme);
  add('density', config.density, fallback.density);
  add('scheme', config.scheme, fallback.scheme);
  add('tz', config.timeZone, fallback.timeZone);
  add('fdow', config.firstDayOfWeek, fallback.firstDayOfWeek);
  add('locale', config.locale, fallback.locale);
  add('max', config.maxEventsPerDay, fallback.maxEventsPerDay);
  add('slot', config.slotMinutes, fallback.slotMinutes);
  if (!config.allDay) params.set('allday', 'off');
  add('now', config.now, fallback.now);
  add('data', config.data, fallback.data);
  if (config.events.length > 0) params.set('events', JSON.stringify(config.events));
  if (hasTokenOverrides(config.tokens)) params.set('tokens', JSON.stringify(config.tokens));

  return params.toString();
};
