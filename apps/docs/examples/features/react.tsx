import { createCalendarViews, timeGridView } from '@calendar-tsx/core';
import type { Calendar_State } from '@calendar-tsx/core';
import { CalendarProvider, useCalendar, useCalendarSelector } from '@calendar-tsx/react';
import { Temporal } from 'temporal-polyfill';

import { highlightFeature } from './highlight-feature';
import { bookings, timeZone } from '../core/setup';

// #region register
const views = createCalendarViews({
  week: timeGridView({ days: 7, features: { highlightFeature } }),
  day: timeGridView({ days: 1, features: { highlightFeature }, highlight: { only: true } }),
  plain: timeGridView({ days: 1 }), // highlightFeature does not run here
});

export const HighlightedCalendar = () => {
  const calendar = useCalendar({
    timeZone,
    views: views.views,
    features: { ...views.features },
    view: 'week',
    date: Temporal.Now.plainDateISO(),
    events: bookings,
    onNavigate: () => {},
    highlight: { only: false }, // calendar-wide setting from highlightFeature
  });

  return (
    <CalendarProvider value={calendar}>
      <button onClick={() => calendar.api.highlight('standup')}>Highlight the standup</button>
      <Highlighted />
    </CalendarProvider>
  );
};

type State = Calendar_State<unknown, unknown, typeof views.views, typeof views.features>;

const Highlighted = () => {
  const highlighted = useCalendarSelector((state: State) => state.highlighted);

  return <p>Highlighted: {highlighted ?? 'none'}</p>;
};
// #endregion register
