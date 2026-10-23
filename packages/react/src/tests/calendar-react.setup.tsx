import type { ReactNode } from 'react';
import { Temporal } from 'temporal-polyfill';
import type { Mock } from 'vitest';
import { vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { tests_withDefault } from '#tests/utils/with-default';

import { iife } from '#tests/utils/iife';

import type { Calendar_EventInput, Calendar_Options, Calendar_Resource, Calendar_Views } from '@calendar-tsx/core';
import { calendarClock_fixed, calendarView_list, calendarView_month, calendarView_timeGrid } from '@calendar-tsx/core';
import type { Fixtures_EventData } from '#tests/calendar.fixtures';
import { fixtures_timeZone } from '#tests/calendar.fixtures';
import { Calendar_RootProvider, useCalendar } from '#use-calendar';

const calendarReactSetup_defaults = iife(() => ({
  views: {
    month: calendarView_month({ maxEventsPerDay: 2 }),
    week: calendarView_timeGrid({ days: 7 }),
    day: calendarView_timeGrid({ days: 1 }),
    resources: calendarView_timeGrid({ days: 1, groupBy: 'resource', allDay: false }),
    list_week: calendarView_list({ days: 7 }),
  } as Calendar_Views,
  view: 'month',
  date: Temporal.PlainDate.from('2026-03-11'),
  events: [] as Calendar_EventInput<Fixtures_EventData>[],
  resources: [] as Calendar_Resource<null>[],
  locale: 'en-US',
  now: Temporal.ZonedDateTime.from('2026-03-11T10:40[America/New_York]').toInstant(),
}));

export type CalendarReactSetup_Overrides = Partial<typeof calendarReactSetup_defaults>;

/**
 * Renders `children` inside a calendar driven by local controlled state, the way an app drives it
 * from the URL (D5). `onNavigate` is a spy that also applies the navigation.
 */
export const calendarReactSetup_render = async (children: ReactNode, overrides: CalendarReactSetup_Overrides = {}) => {
  const onNavigate: Mock<Calendar_Options<Fixtures_EventData, null, Calendar_Views>['onNavigate']> = vi.fn();
  const resolved = {
    views: tests_withDefault(overrides, 'views', calendarReactSetup_defaults.views),
    view: tests_withDefault(overrides, 'view', calendarReactSetup_defaults.view),
    date: tests_withDefault(overrides, 'date', calendarReactSetup_defaults.date),
    events: tests_withDefault(overrides, 'events', calendarReactSetup_defaults.events),
    resources: tests_withDefault(overrides, 'resources', calendarReactSetup_defaults.resources),
    locale: tests_withDefault(overrides, 'locale', calendarReactSetup_defaults.locale),
    clock: calendarClock_fixed(tests_withDefault(overrides, 'now', calendarReactSetup_defaults.now)),
  };

  const Harness = () => {
    const calendar = useCalendar<Fixtures_EventData, null>({
      ...resolved,
      timeZone: fixtures_timeZone,
      onNavigate,
      firstDayOfWeek: 7,
    });

    return (
      <Calendar_RootProvider value={calendar} locale={resolved.locale}>
        {children}
      </Calendar_RootProvider>
    );
  };

  const screen = await render(<Harness />);

  return { screen, mocks: { onNavigate } };
};
