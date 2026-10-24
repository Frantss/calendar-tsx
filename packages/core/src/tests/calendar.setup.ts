import { Temporal } from 'temporal-polyfill';
import type { Mock } from 'vitest';
import { vi } from 'vitest';
import { tests_withDefault } from '#tests/utils/with-default';

import { iife } from '#tests/utils/iife';

import { createCalendar } from '#calendar';
import { fixedClock } from '#calendar-clock';
import { listView, dayGridView, timeGridView, createCalendarViews } from '#calendar-views';
import type {
  Calendar_Clock,
  Calendar_EventInput,
  Calendar_Options,
  Calendar_Resource,
  Calendar_Views,
} from '#calendar.types';
import type { Fixtures_EventData } from '#tests/calendar.fixtures';
import { fixtures_timeZone } from '#tests/calendar.fixtures';

export const calendarSetup_defaults = iife(() => {
  const views = {
    month: dayGridView({ period: 'month', maxEventsPerDay: 4 }),
    week: timeGridView({ days: 7 }),
    day: timeGridView({ days: 1 }),
    resources: timeGridView({ days: 1, groupBy: 'resource', allDay: false }),
    list_week: listView({ days: 7 }),
  } satisfies Calendar_Views;

  return {
    timeZone: fixtures_timeZone,
    views: views as Calendar_Views,
    view: 'month',
    // Wednesday
    date: Temporal.PlainDate.from('2026-03-11'),
    now: Temporal.ZonedDateTime.from('2026-03-11T10:40[America/New_York]').toInstant(),
    events: [] as Calendar_EventInput<Fixtures_EventData>[],
    resources: [] as Calendar_Resource<null>[],
    firstDayOfWeek: 7 as const,
    eventOrder: undefined as Calendar_Options<Fixtures_EventData, null, Calendar_Views>['eventOrder'],
    clock: undefined as Calendar_Clock | undefined,
    initialNow: undefined as Temporal.Instant | undefined,
  };
});

type Defaults = typeof calendarSetup_defaults;

export type CalendarSetup_Overrides = Partial<Defaults>;

export const calendarSetup_create = async (overrides: CalendarSetup_Overrides = {}) => {
  const onNavigate: Mock<Calendar_Options<Fixtures_EventData, null, Calendar_Views>['onNavigate']> = vi.fn();
  const now = tests_withDefault(overrides, 'now', calendarSetup_defaults.now);

  const views = createCalendarViews(tests_withDefault(overrides, 'views', calendarSetup_defaults.views));

  const options: Calendar_Options<Fixtures_EventData, null, Calendar_Views> = {
    timeZone: tests_withDefault(overrides, 'timeZone', calendarSetup_defaults.timeZone),
    views: views.views,
    features: views.features,
    view: tests_withDefault(overrides, 'view', calendarSetup_defaults.view),
    date: tests_withDefault(overrides, 'date', calendarSetup_defaults.date),
    events: tests_withDefault(overrides, 'events', calendarSetup_defaults.events),
    resources: tests_withDefault(overrides, 'resources', calendarSetup_defaults.resources),
    firstDayOfWeek: tests_withDefault(overrides, 'firstDayOfWeek', calendarSetup_defaults.firstDayOfWeek),
    eventOrder: tests_withDefault(overrides, 'eventOrder', calendarSetup_defaults.eventOrder),
    clock: tests_withDefault(overrides, 'clock', calendarSetup_defaults.clock) ?? fixedClock(now),
    initialNow: tests_withDefault(overrides, 'initialNow', calendarSetup_defaults.initialNow),
    onNavigate,
  };

  const instance = createCalendar(options);

  return {
    instance,
    options,
    state: () => instance.store.state,
    update: (next: Partial<Calendar_Options<Fixtures_EventData, null, Calendar_Views>>) =>
      instance['~update']({ ...instance.options, ...next }),
    mocks: { onNavigate },
  };
};
