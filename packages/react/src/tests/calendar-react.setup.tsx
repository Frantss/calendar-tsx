import type { ReactNode } from 'react';
import { Temporal } from 'temporal-polyfill';
import type { Mock } from 'vitest';
import { vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { tests_withDefault } from '#tests/utils/with-default';

import { iife } from '#tests/utils/iife';

import type {
  Calendar_BackgroundLayer,
  Calendar_EventInput,
  Calendar_Options,
  Calendar_Resource,
  Calendar_Views,
} from '@calendar-tsx/core';
import {
  backgroundFeature,
  fixedClock,
  listView,
  dayGridView,
  timeGridView,
  calendarViews,
  calendarFeatures,
} from '@calendar-tsx/core';
import type { Fixtures_EventData } from '#tests/calendar.fixtures';
import { fixtures_timeZone } from '#tests/calendar.fixtures';
import { CalendarProvider, useCalendar } from '#use-calendar';

const calendarReactSetup_defaults = iife(() => ({
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

export type CalendarReactSetup_Overrides = Partial<typeof calendarReactSetup_defaults>;

/**
 * Renders `children` inside a calendar driven by local controlled state, the way an app drives it
 * from the URL (D5). `onNavigate` is a spy that also applies the navigation.
 */
export const calendarReactSetup_render = async (children: ReactNode, overrides: CalendarReactSetup_Overrides = {}) => {
  const onNavigate: Mock<Calendar_Options<Fixtures_EventData, null, Calendar_Views>['onNavigate']> = vi.fn();
  const viewsFeatures = calendarFeatures({
    backgroundFeature: backgroundFeature(
      tests_withDefault(overrides, 'backgrounds', calendarReactSetup_defaults.backgrounds),
    ),
  });
  const views = calendarViews({
    features: viewsFeatures,
    views: tests_withDefault(overrides, 'views', calendarReactSetup_defaults.views),
  });
  const resolved = {
    views: views,
    features: viewsFeatures,
    view: tests_withDefault(overrides, 'view', calendarReactSetup_defaults.view),
    date: tests_withDefault(overrides, 'date', calendarReactSetup_defaults.date),
    events: tests_withDefault(overrides, 'events', calendarReactSetup_defaults.events),
    resources: tests_withDefault(overrides, 'resources', calendarReactSetup_defaults.resources),
    locale: tests_withDefault(overrides, 'locale', calendarReactSetup_defaults.locale),
    clock: fixedClock(tests_withDefault(overrides, 'now', calendarReactSetup_defaults.now)),
  };
  const { locale, ...options } = resolved;

  const Harness = () => {
    const calendar = useCalendar<Fixtures_EventData, null>({
      ...options,
      timeZone: fixtures_timeZone,
      onNavigate,
      firstDayOfWeek: 7,
    });

    return (
      <CalendarProvider value={calendar} locale={locale}>
        {children}
      </CalendarProvider>
    );
  };

  const screen = await render(<Harness />);

  return { screen, mocks: { onNavigate } };
};
