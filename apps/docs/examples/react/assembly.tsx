import { useState, type ReactNode } from 'react';
import { Temporal } from 'temporal-polyfill';

import {
  backgroundFeature,
  calendarFeatures,
  calendarViews,
  createBackgroundLayer,
  createEvent,
  createWeeklyRanges,
  dayGridView,
  DayOfWeek,
  recurrenceFeature,
  timeGridView,
} from '@calendar-tsx/core';
import { CalendarProvider, useCalendar } from '@calendar-tsx/react';

const timeZone = 'America/Montevideo';

const defaultBackgrounds = [
  createBackgroundLayer({
    id: 'christmas',
    kind: 'holiday',
    ranges: [{ allDay: true, start: Temporal.PlainDate.from('2026-12-25') }],
  }),
];

const workWeekBackgrounds = [
  ...defaultBackgrounds,
  createBackgroundLayer({
    id: 'outside-business-hours',
    kind: 'closed',
    inverse: true,
    ranges: createWeeklyRanges([
      {
        daysOfWeek: [DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday],
        startTime: Temporal.PlainTime.from('09:00'),
        endTime: Temporal.PlainTime.from('17:00'),
      },
    ]),
  }),
];

const events = [
  createEvent({
    id: 'planning',
    kind: 'timed',
    start: Temporal.ZonedDateTime.from('2026-10-26T10:00-03:00[America/Montevideo]'),
    end: Temporal.ZonedDateTime.from('2026-10-26T11:00-03:00[America/Montevideo]'),
    data: { title: 'Planning' },
  }),
];

const features = calendarFeatures({
  background: backgroundFeature(defaultBackgrounds),
  recurrence: recurrenceFeature(),
});

const views = calendarViews({
  features,
  views: {
    month: dayGridView({
      period: 'month',
      maxEventsPerDay: 3,
    }),
    week: timeGridView({
      weeks: 1,
      hiddenDays: [DayOfWeek.Saturday, DayOfWeek.Sunday],
      timeWindow: { startMinutes: 480, endMinutes: 1080 },
      slotMinutes: 30,
      features: {
        background: workWeekBackgrounds,
      },
    }),
    day: timeGridView({
      days: 1,
      timeWindow: { startMinutes: 360, endMinutes: 1320 },
      slotMinutes: 15,
      features: {
        background: [],
      },
    }),
  },
});

type ViewKey = keyof typeof views;

export function Scheduler({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewKey>('week');
  const [date, setDate] = useState(() => Temporal.PlainDate.from('2026-10-26'));

  const calendar = useCalendar({
    features,
    views,
    events,
    timeZone,
    firstDayOfWeek: DayOfWeek.Monday,
    view,
    date,
    onNavigate: next => {
      setView(next.view);
      setDate(next.date);
    },
  });

  return (
    <CalendarProvider value={calendar} locale='en-US'>
      {children}
    </CalendarProvider>
  );
}
