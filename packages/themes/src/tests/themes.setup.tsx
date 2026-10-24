import type { CSSProperties, ReactNode } from 'react';
import { Temporal } from 'temporal-polyfill';
import { render } from 'vitest-browser-react';

import { iife } from '#tests/utils/iife';

import type {
  Calendar_AllDayEventInput,
  Calendar_BackgroundLayer,
  Calendar_Resource,
  Calendar_TimedEventInput,
  Calendar_Views,
} from '@calendar-tsx/core';
import { fixedClock, dayGridView, timeGridView, createCalendarViews } from '@calendar-tsx/core';
import { CalendarProvider, useCalendar } from '@calendar-tsx/react';

export type ThemesSetup_EventData = { title: string };

type ThemesSetup_Event =
  | Calendar_TimedEventInput<ThemesSetup_EventData>
  | Calendar_AllDayEventInput<ThemesSetup_EventData>;

const themesSetup_timeZone = 'America/New_York';

const themesSetup_defaults = iife(() => ({
  views: {
    month: dayGridView({ period: 'month', maxEventsPerDay: 3 }),
    week: timeGridView({ days: 7 }),
    day: timeGridView({ days: 1 }),
  } as Calendar_Views,
  view: 'day',
  events: [] as ThemesSetup_Event[],
  backgrounds: [] as Calendar_BackgroundLayer[],
  resources: [] as Calendar_Resource<null>[],
  colorScheme: 'light' as CSSProperties['colorScheme'],
  className: undefined as string | undefined,
}));

export const themesSetup_timed = (
  id: string,
  { date, start, end, endDate = date }: { date: string; start: string; end: string; endDate?: string },
) => ({
  id,
  kind: 'timed' as const,
  start: Temporal.ZonedDateTime.from(`${date}T${start}[${themesSetup_timeZone}]`),
  end: Temporal.ZonedDateTime.from(`${endDate}T${end}[${themesSetup_timeZone}]`),
  data: { title: id },
});

export const themesSetup_allDay = (id: string, { start, end }: { start: string; end: string }) => ({
  id,
  kind: 'allDay' as const,
  start: Temporal.PlainDate.from(start),
  end: Temporal.PlainDate.from(end),
  data: { title: id },
});

/** The event, shaded under the others instead of laid out (D37). */
export const themesSetup_background = <TEvent extends ThemesSetup_Event>(event: TEvent): TEvent => ({
  ...event,
  display: 'background',
});

/** Renders `children` at a fixed width so geometry is deterministic; each spec imports the stylesheets it tests. */
export const themesSetup_render = async (children: ReactNode, overrides: Partial<typeof themesSetup_defaults> = {}) => {
  const { view, events, backgrounds, resources, colorScheme, className, ...rest } = {
    ...themesSetup_defaults,
    ...overrides,
  };
  const views = createCalendarViews(rest.views);

  const Harness = () => {
    const calendar = useCalendar<ThemesSetup_EventData, null>({
      views: views.views,
      features: views.features,
      view,
      events,
      backgrounds,
      resources,
      date: Temporal.PlainDate.from('2026-03-11'),
      timeZone: themesSetup_timeZone,
      firstDayOfWeek: 7,
      clock: fixedClock(Temporal.ZonedDateTime.from(`2026-03-11T10:40[${themesSetup_timeZone}]`).toInstant()),
      onNavigate: () => {},
    });

    return (
      <div className={className} style={{ inlineSize: 700, colorScheme }}>
        <CalendarProvider value={calendar}>{children}</CalendarProvider>
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
