import { calendarViews, calendarFeatures, timeGridView } from '@calendar-tsx/core';
import type { Calendar_State } from '@calendar-tsx/core';
import { CalendarProvider, useCalendar, useCalendarSelector } from '@calendar-tsx/react';
import { Temporal } from 'temporal-polyfill';

import { highlightFeature } from './highlight-feature';
import { bookings, timeZone } from '../core/setup';

// #region register
const features = calendarFeatures({ highlight: highlightFeature({ only: false }) });
const views = calendarViews({
  features: features,
  views: {
    week: timeGridView({ days: 7 }),
    day: timeGridView({ days: 1, features: { highlight: { only: true } } }),
    plain: timeGridView({ days: 1 }), // inherits the registered feature defaults
  },
});

export const HighlightedCalendar = () => {
  const calendar = useCalendar({
    timeZone,
    views,
    features,
    view: 'week',
    date: Temporal.Now.plainDateISO(),
    events: bookings,
    onNavigate: () => {},
  });

  return (
    <CalendarProvider value={calendar}>
      <button onClick={() => calendar.api.highlight('standup')}>Highlight the standup</button>
      <Highlighted />
    </CalendarProvider>
  );
};

type State = Calendar_State<unknown, unknown, typeof views, typeof features>;

const Highlighted = () => {
  const highlighted = useCalendarSelector((state: State) => state.highlighted);

  return <p>Highlighted: {highlighted ?? 'none'}</p>;
};
// #endregion register
