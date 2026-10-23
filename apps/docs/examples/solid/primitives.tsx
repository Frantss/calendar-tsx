import { Calendar, useCalendarSelector } from '@calendar-tsx/solid';
import { createSignal } from 'solid-js';
import { Temporal } from 'temporal-polyfill';

import type { State, ViewKey } from '../core/setup';
import { bookings, timeZone, views } from '../core/setup';

// #region calendar
export const Embedded = () => {
  const [view, setView] = createSignal<ViewKey>('agenda');
  const [date, setDate] = createSignal(Temporal.Now.plainDateISO());

  return (
    <Calendar
      timeZone={timeZone}
      views={views.views}
      features={{ ...views.features }}
      view={view()}
      date={date()}
      events={bookings}
      onNavigate={next => {
        setView(next.view);
        setDate(next.date);
      }}
      locale='en-GB'
    >
      <Count />
    </Calendar>
  );
};
// #endregion calendar

// #region selector
const Count = () => {
  // an accessor; it updates when the selected value changes
  const count = useCalendarSelector((state: State) =>
    state.layout.kind === 'list' ? state.layout.days.reduce((sum, day) => sum + day.events.length, 0) : 0,
  );

  return <p>{count()} events this week</p>;
};
// #endregion selector
