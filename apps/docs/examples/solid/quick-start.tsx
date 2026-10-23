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
} from '@calendar-tsx/solid';
import '@calendar-tsx/themes/default.css';
import { createSignal, For, Show } from 'solid-js';
import { Temporal } from 'temporal-polyfill';

type Booking = { title: string };

// module scope: views and features are compared by reference
const views = createCalendarViews({
  month: monthView({ maxEventsPerDay: 3 }),
  week: timeGridView({ days: 7 }),
});

export const App = (props: { events: Calendar_EventInput<Booking>[] }) => {
  const [view, setView] = createSignal<keyof typeof views.views>('month');
  const [date, setDate] = createSignal(Temporal.Now.plainDateISO());

  // an accessor: the calendar re-syncs when a signal read inside it changes
  const calendar = useCalendar(() => ({
    timeZone: 'America/New_York',
    views: views.views,
    features: { ...views.features },
    view: view(),
    date: date(),
    events: props.events,
    onNavigate: next => {
      setView(next.view);
      setDate(next.date);
    },
  }));

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
  const month = () => {
    const current = layout();

    return current.kind === 'month' ? current : undefined;
  };

  return (
    <Show when={month()}>
      {month => (
        <MonthView model={month()}>
          <For each={month().weeks}>
            {week => (
              <MonthViewWeek week={week}>
                <For each={week.days}>{day => <MonthViewDay day={day}>{day.date.day}</MonthViewDay>}</For>
                <For each={week.segments}>
                  {segment => <MonthViewWeekEvent segment={segment}>{segment.event.data.title}</MonthViewWeekEvent>}
                </For>
              </MonthViewWeek>
            )}
          </For>
        </MonthView>
      )}
    </Show>
  );
};
// #endregion app
