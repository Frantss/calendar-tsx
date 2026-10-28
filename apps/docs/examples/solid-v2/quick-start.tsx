// #region app
import type { Calendar_EventInput, Calendar_State } from '@calendar-tsx/core';
import { calendarFeatures, calendarViews, listView } from '@calendar-tsx/core';
import {
  CalendarProvider,
  ListView,
  ListViewDay,
  ListViewDayHeader,
  ListViewEmpty,
  ListViewEvent,
  useCalendar,
  useCalendarSelector,
} from '@calendar-tsx/solid/v2';
import { createSignal, For } from 'solid-js';
import { Temporal } from 'temporal-polyfill';

export type Booking = { title: string };

export const features = calendarFeatures({});
export const views = calendarViews({ features, views: { week: listView({ days: 7 }) } });
type State = Calendar_State<Booking, unknown, typeof views, typeof features>;

export const App = (props: { events: Calendar_EventInput<Booking>[] }) => {
  const [date, setDate] = createSignal(Temporal.Now.plainDateISO('UTC'));
  const calendar = useCalendar(() => ({
    timeZone: 'UTC',
    features,
    views,
    view: 'week',
    date: date(),
    events: props.events,
    onNavigate: next => setDate(next.date),
  }));

  return (
    <CalendarProvider value={calendar}>
      <button onClick={() => calendar.api.prev()}>Previous</button>
      <button onClick={() => calendar.api.today()}>Today</button>
      <button onClick={() => calendar.api.next()}>Next</button>
      <Agenda />
    </CalendarProvider>
  );
};

const Agenda = () => {
  const model = useCalendarSelector((state: State) => state.layout);
  return (
    <ListView model={model()}>
      <For each={model().days}>
        {day => (
          <ListViewDay day={day}>
            <ListViewDayHeader day={day}>{day.date.toString()}</ListViewDayHeader>
            <For each={day.events}>{event => <ListViewEvent event={event}>{event.data.title}</ListViewEvent>}</For>
          </ListViewDay>
        )}
      </For>
      <ListViewEmpty>No events this week</ListViewEmpty>
    </ListView>
  );
};
// #endregion app
