import { createStore } from '@tanstack/store';
import { Temporal } from 'temporal-polyfill';
import { createCalendarViews, timeGridView, timelineView, listView } from '../../../src/calendar-views';
import { timeGridLayout, timelineLayout } from '../../../src/calendar-layouts';
import { fixedClock } from '../../../src/calendar-clock';
import type { Calendar_EventInput, Calendar_Instance, Calendar_Options } from '../../../src/calendar.types';
import { constraintsFeature, dateSelectionFeature, eventMoveFeature, interactionFeature, idle } from '../runtime';
import type { Selection } from '../runtime';
import type {} from '../feature-types';

export type Data = { title: string };
export const presets = {
  ordinary: { date: '2026-10-23', timeZone: 'UTC' },
  spring: { date: '2026-03-08', timeZone: 'America/New_York' },
  autumn: { date: '2026-11-01', timeZone: 'America/New_York' },
  lordHowe: { date: '2026-10-04', timeZone: 'Australia/Lord_Howe' },
} as const;
export type Preset = keyof typeof presets;

export const createSetup = (preset: Preset) => {
  const spec = presets[preset];
  const date = Temporal.PlainDate.from(spec.date);
  const z = (local: string, offset?: string) =>
    Temporal.ZonedDateTime.from(`${spec.date}T${local}${offset ?? ''}[${spec.timeZone}]`);
  const timed = (
    id: string,
    start: Temporal.ZonedDateTime,
    end: Temporal.ZonedDateTime,
    resource = 'a',
  ): Calendar_EventInput<Data> => ({ id, kind: 'timed', start, end, resourceIds: [resource], data: { title: id } });
  const events: Calendar_EventInput<Data>[] = [
    timed('Appointment', z('09:00'), z('10:00')),
    timed('Overlapping', z('09:15'), z('09:45')),
    timed('Short', z('11:00'), z('11:02'), 'b'),
    timed('Midnight', z('23:30'), z('23:30').add({ hours: 1 })),
    {
      id: 'Fair',
      kind: 'allDay',
      start: date,
      end: date.add({ days: 1 }),
      resourceIds: ['a'],
      data: { title: 'Fair' },
    },
  ];
  if (preset === 'spring') events.push(timed('Transition', z('01:30'), z('03:30')));
  if (preset === 'autumn')
    events.push(
      timed('Transition', z('01:30', '-04:00'), z('01:15', '-05:00')),
      timed('First fold', z('01:15', '-04:00'), z('01:45', '-04:00')),
      timed('Second fold', z('01:15', '-05:00'), z('01:45', '-05:00')),
    );
  if (preset === 'lordHowe') events.push(timed('Transition', z('01:30'), z('03:00')));
  const operations = {
    interactionFeature,
    dateSelectionFeature: {
      ...dateSelectionFeature,
      getInitialState: () => ({ selectedRange: null as Selection | null }),
    },
    eventMoveFeature,
    constraintsFeature,
  };
  const views = createCalendarViews({
    grid: timeGridView({
      days: 2,
      groupBy: 'resource',
      groupOrder: 'date-first',
      slotMinutes: 15,
      minColumnWidth: '170px',
      features: operations,
    }),
    timeline: timelineView({
      days: 2,
      groupBy: 'resource',
      slotMinutes: 15,
      minSlotWidth: '8px',
      features: operations,
    }),
    list: listView({ days: 2 }),
  });
  const counts = {
    baseBuilds: 0,
    baseNotifications: 0,
    previewBuilds: 0,
    listeners: 0,
    surfaces: 0,
    connections: 0,
    emissions: 0,
    lastDraftBuilds: 0,
  };
  const features = {
    ...views.features,
    timeGridLayout: {
      ...timeGridLayout,
      build: (...args: Parameters<typeof timeGridLayout.build>) => {
        counts.baseBuilds++;
        return timeGridLayout.build(...args);
      },
    },
    timelineLayout: {
      ...timelineLayout,
      build: (...args: Parameters<typeof timelineLayout.build>) => {
        counts.baseBuilds++;
        return timelineLayout.build(...args);
      },
    },
  };
  return {
    date,
    timeZone: spec.timeZone,
    events,
    views: views.views,
    features,
    counts,
    resources: ['a', 'b'].map(id => ({
      id,
      title: `Room ${id.toUpperCase()}`,
      availability: [
        { start: date.toZonedDateTime(spec.timeZone), end: date.add({ days: 2 }).toZonedDateTime(spec.timeZone) },
      ],
      data: null,
    })),
    clock: fixedClock(date.toZonedDateTime(spec.timeZone).toInstant()),
    atom: createStore(idle()),
  };
};
export type Setup = ReturnType<typeof createSetup>;
export type View = keyof Setup['views'];
export type Options = Calendar_Options<Data, null, Setup['views'], Setup['features']>;
export type Instance = Calendar_Instance<Data, null, Setup['views'], Setup['features']>;
export const optionsFor = (
  setup: Setup,
  view: View,
  events: Calendar_EventInput<Data>[],
  selectedRange: Selection | null,
  onNavigate: Options['onNavigate'],
): Options => ({
  timeZone: setup.timeZone,
  date: setup.date,
  views: setup.views,
  features: setup.features,
  resources: setup.resources,
  clock: setup.clock,
  events,
  view,
  onNavigate,
  state: { selectedRange },
});
