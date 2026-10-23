import type { CSSProperties, ReactNode } from 'react';
import { Temporal } from 'temporal-polyfill';
import { render } from 'vitest-browser-react';

import { iife } from '#tests/utils/iife';

import type { Calendar_AllDayEventInput, Calendar_TimedEventInput, Calendar_Views } from '@calendar-tsx/core';
import { calendarClock_fixed, calendarView_month, calendarView_timeGrid } from '@calendar-tsx/core';
import { Calendar_RootProvider, useCalendar } from '@calendar-tsx/react';

export type ThemesSetup_EventData = { title: string };

type ThemesSetup_Event =
  | Calendar_TimedEventInput<ThemesSetup_EventData>
  | Calendar_AllDayEventInput<ThemesSetup_EventData>;

const themesSetup_timeZone = 'America/New_York';

const themesSetup_defaults = iife(() => ({
  views: {
    month: calendarView_month({ maxEventsPerDay: 3 }),
    week: calendarView_timeGrid({ days: 7 }),
    day: calendarView_timeGrid({ days: 1 }),
  } as Calendar_Views,
  view: 'day',
  events: [] as ThemesSetup_Event[],
  colorScheme: 'light' as CSSProperties['colorScheme'],
  className: undefined as string | undefined,
}));

export const themesSetup_timed = (id: string, { date, start, end }: { date: string; start: string; end: string }) => ({
  id,
  start: Temporal.ZonedDateTime.from(`${date}T${start}[${themesSetup_timeZone}]`),
  end: Temporal.ZonedDateTime.from(`${date}T${end}[${themesSetup_timeZone}]`),
  data: { title: id },
});

export const themesSetup_allDay = (id: string, { start, end }: { start: string; end: string }) => ({
  id,
  allDay: true as const,
  start: Temporal.PlainDate.from(start),
  end: Temporal.PlainDate.from(end),
  data: { title: id },
});

/** Renders `children` at a fixed width so geometry is deterministic; each spec imports the stylesheets it tests. */
export const themesSetup_render = async (children: ReactNode, overrides: Partial<typeof themesSetup_defaults> = {}) => {
  const { views, view, events, colorScheme, className } = { ...themesSetup_defaults, ...overrides };

  const Harness = () => {
    const calendar = useCalendar<ThemesSetup_EventData, null>({
      views,
      view,
      events,
      date: Temporal.PlainDate.from('2026-03-11'),
      timeZone: themesSetup_timeZone,
      firstDayOfWeek: 7,
      clock: calendarClock_fixed(Temporal.ZonedDateTime.from(`2026-03-11T10:40[${themesSetup_timeZone}]`).toInstant()),
      onNavigate: () => {},
    });

    return (
      <div className={className} style={{ inlineSize: 700, colorScheme }}>
        <Calendar_RootProvider value={calendar}>{children}</Calendar_RootProvider>
      </div>
    );
  };

  return render(<Harness />);
};

export const themesSetup_part = (name: string, selector = '') => [
  ...document.querySelectorAll<HTMLElement>(`[data-part="${name}"]${selector}`),
];

export const themesSetup_rect = (element: Element | undefined) => {
  if (!element) throw new Error('[themes] element not rendered');

  return element.getBoundingClientRect();
};
