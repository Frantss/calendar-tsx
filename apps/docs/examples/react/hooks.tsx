import { Calendar, useCalendarSelector } from '@calendar-tsx/react';
import { Temporal } from 'temporal-polyfill';

import type { State } from '../core/setup';
import { bookings, timeZone, views } from '../core/setup';

// #region calendar
export const Embedded = () => (
  <Calendar
    timeZone={timeZone}
    views={views.views}
    features={{ ...views.features }}
    view='agenda'
    date={Temporal.Now.plainDateISO()}
    events={bookings}
    onNavigate={() => {}}
    locale='en-GB'
  >
    <Count />
  </Calendar>
);
// #endregion calendar

// #region selector
const Count = () => {
  // select the smallest slice you need; a new object from the selector re-renders on every change
  const count = useCalendarSelector((state: State) =>
    state.layout.kind === 'list' ? state.layout.days.reduce((sum, day) => sum + day.events.length, 0) : 0,
  );

  return <p>{count} events this week</p>;
};
// #endregion selector
