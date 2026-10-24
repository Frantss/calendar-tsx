import type { JSX } from 'solid-js';
import { Temporal } from 'temporal-polyfill';
import type { Mock } from 'vitest';
import { vi } from 'vitest';
import { tests_withDefault } from '#tests/utils/with-default';

import { iife } from '#tests/utils/iife';
import { tests_render } from '#tests/utils/render';

import type {
  Calendar_BackgroundLayer,
  Calendar_EventInput,
  Calendar_Options,
  Calendar_Resource,
  Calendar_Views,
} from '@calendar-tsx/core';
import { createCalendarViews, fixedClock, listView, dayGridView, timeGridView } from '@calendar-tsx/core';
import type { Fixtures_EventData } from '#tests/calendar.fixtures';
import { fixtures_timeZone } from '#tests/calendar.fixtures';
import { CalendarProvider, useCalendar } from '#use-calendar';

const calendarSolidSetup_defaults = iife(() => ({
  views: {
    month: dayGridView({ period: 'month', maxEventsPerDay: 2 }),
    week: timeGridView({ days: 7 }),
    day: timeGridView({ days: 1 }),
    resources: timeGridView({ days: 1, groupBy: 'resource', allDay: false }),
    list_week: listView({ days: 7 }),
  } as Calendar_Views,
  view: 'month',
  date: Temporal.PlainDate.from('2026-03-11'),
  events: [] as Calendar_EventInput<Fixtures_EventData>[],
  resources: [] as Calendar_Resource<null>[],
  backgrounds: [] as Calendar_BackgroundLayer[],
  locale: 'en-US',
  now: Temporal.ZonedDateTime.from('2026-03-11T10:40[America/New_York]').toInstant(),
}));

export type CalendarSolidSetup_Overrides = Partial<typeof calendarSolidSetup_defaults>;

/**
 * Renders `children` inside a calendar driven by fixed controlled inputs, the way an app drives it
 * from the URL (D5). `onNavigate` is a spy.
 */
export const calendarSolidSetup_render = (
  children: () => JSX.Element,
  overrides: CalendarSolidSetup_Overrides = {},
) => {
  const onNavigate: Mock<Calendar_Options<Fixtures_EventData, null, Calendar_Views>['onNavigate']> = vi.fn();
  const views = createCalendarViews(tests_withDefault(overrides, 'views', calendarSolidSetup_defaults.views));
  const resolved = {
    views: views.views,
    features: views.features,
    view: tests_withDefault(overrides, 'view', calendarSolidSetup_defaults.view),
    date: tests_withDefault(overrides, 'date', calendarSolidSetup_defaults.date),
    events: tests_withDefault(overrides, 'events', calendarSolidSetup_defaults.events),
    resources: tests_withDefault(overrides, 'resources', calendarSolidSetup_defaults.resources),
    backgrounds: tests_withDefault(overrides, 'backgrounds', calendarSolidSetup_defaults.backgrounds),
    locale: tests_withDefault(overrides, 'locale', calendarSolidSetup_defaults.locale),
    clock: fixedClock(tests_withDefault(overrides, 'now', calendarSolidSetup_defaults.now)),
  };

  const Harness = () => {
    const calendar = useCalendar<Fixtures_EventData, null>(() => ({
      ...resolved,
      timeZone: fixtures_timeZone,
      onNavigate,
      firstDayOfWeek: 7,
    }));

    return (
      <CalendarProvider value={calendar} locale={resolved.locale}>
        {children()}
      </CalendarProvider>
    );
  };

  const screen = tests_render(() => <Harness />);

  return { screen, mocks: { onNavigate } };
};
