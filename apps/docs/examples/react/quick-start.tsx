// #region app
import type { Calendar_EventInput, Calendar_State } from '@calendar-tsx/core';
import { createCalendarViews, dayGridView, timeGridView } from '@calendar-tsx/core';
import {
  CalendarProvider,
  DayGridView,
  DayGridViewDay,
  DayGridViewRow,
  DayGridViewRowEvent,
  useCalendar,
  useCalendarSelector,
  DayGridViewSection,
} from '@calendar-tsx/react';
import '@calendar-tsx/themes/default.css';
import { useState } from 'react';
import { Temporal } from 'temporal-polyfill';

type Booking = { title: string };

// module scope: views and features are compared by reference
const views = createCalendarViews({
  month: dayGridView({ period: 'month', maxEventsPerDay: 3 }),
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

  if (layout.kind !== 'dayGrid') return null;

  return (
    <DayGridView model={layout}>
      {layout.sections.map(section => (
        <DayGridViewSection key={section.key} section={section}>
          {section.rows.map(week => (
            <DayGridViewRow key={week.key} row={week}>
              {week.days.map(day => (
                <DayGridViewDay key={day.key} day={day}>
                  {day.date.day}
                </DayGridViewDay>
              ))}
              {week.segments.map(segment => (
                <DayGridViewRowEvent key={segment.key} segment={segment}>
                  {segment.event.data.title}
                </DayGridViewRowEvent>
              ))}
            </DayGridViewRow>
          ))}
        </DayGridViewSection>
      ))}
    </DayGridView>
  );
};
// #endregion app
