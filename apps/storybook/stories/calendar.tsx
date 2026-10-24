import { useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { fixedClock } from '@calendar-tsx/core';
import { CalendarProvider, useCalendar } from '@calendar-tsx/react';
import { bookings, features, rooms, timeZone, views } from '../../docs/examples/core/setup';
import type { ViewKey } from '../../docs/examples/core/setup';
import { DayGrid } from '../../docs/examples/react/day-grid-view';
import { Week } from '../../docs/examples/react/week-view';
import { Agenda } from '../../docs/examples/react/list-view';
import { Timeline } from '../../docs/examples/react/timeline-view';

const clock = fixedClock(Temporal.Instant.from('2026-03-11T14:40:00Z'));
const ignoreOverflow = () => {};

export const CalendarStory = ({
  view = 'month',
  empty = false,
  colorScheme = 'light',
}: {
  view?: ViewKey;
  empty?: boolean;
  colorScheme?: 'light' | 'dark';
}) => {
  const [navigation, setNavigation] = useState({ view, date: Temporal.PlainDate.from('2026-03-11') });
  const calendar = useCalendar({
    ...navigation,
    views,
    features,
    events: empty ? [] : bookings,
    resources: rooms,
    timeZone,
    firstDayOfWeek: 7,
    clock,
    onNavigate: next => setNavigation({ view: next.view, date: next.date }),
  });

  return (
    <div style={{ maxWidth: 960, colorScheme, background: 'Canvas', color: 'CanvasText' }}>
      <CalendarProvider value={calendar} locale='en-US'>
        <DayGrid calendar={calendar} onOverflow={ignoreOverflow} />
        <Week calendar={calendar} />
        <Agenda />
        <Timeline calendar={calendar} />
      </CalendarProvider>
    </div>
  );
};
