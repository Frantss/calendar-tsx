// #region app
import type { Calendar_EventInput, Calendar_State } from '@calendar-tsx/core';
import { createCalendarViews, monthView, timeGridView } from '@calendar-tsx/core';
import {
  CalendarProvider,
  MonthView,
  MonthViewDay,
  MonthViewWeek,
  MonthViewWeekEvent,
  useCalendar,
  useCalendarSelector,
} from '@calendar-tsx/react';
import '@calendar-tsx/themes/default.css';
import { useState } from 'react';
import { Temporal } from 'temporal-polyfill';

type Booking = { title: string };

// module scope: views and features are compared by reference
const views = createCalendarViews({
  month: monthView({ maxEventsPerDay: 3 }),
  week: timeGridView({ days: 7 }),
});

export const App = ({ events }: { events: Calendar_EventInput<Booking>[] }) => {
  const [view, setView] = useState<keyof typeof views.views>('month');
  const [date, setDate] = useState(() => Temporal.Now.plainDateISO());

  const calendar = useCalendar({
    timeZone: 'America/New_York',
    views: views.views,
    features: { ...views.features },
    view,
    date,
    events,
    onNavigate: next => {
      setView(next.view);
      setDate(next.date);
    },
  });

  return (
    <CalendarProvider value={calendar}>
      <button onClick={() => calendar.api.prev()}>Previous</button>
      <button onClick={() => calendar.api.today()}>Today</button>
      <button onClick={() => calendar.api.next()}>Next</button>
      <Month />
    </CalendarProvider>
  );
};

// the context erases the instance's types; annotate the selector to get them back
type State = Calendar_State<Booking, unknown, typeof views.views>;

const Month = () => {
  const layout = useCalendarSelector((state: State) => state.layout);

  if (layout.kind !== 'month') return null;

  return (
    <MonthView model={layout}>
      {layout.weeks.map(week => (
        <MonthViewWeek key={week.key} week={week}>
          {week.days.map(day => (
            <MonthViewDay key={day.key} day={day}>
              {day.date.day}
            </MonthViewDay>
          ))}
          {week.segments.map(segment => (
            <MonthViewWeekEvent key={segment.key} segment={segment}>
              {segment.event.data.title}
            </MonthViewWeekEvent>
          ))}
        </MonthViewWeek>
      ))}
    </MonthView>
  );
};
// #endregion app
