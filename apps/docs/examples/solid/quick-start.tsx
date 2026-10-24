// #region app
import type { Calendar_EventInput, Calendar_State } from '@calendar-tsx/core';
import { calendarViews, calendarFeatures, dayGridView, timeGridView } from '@calendar-tsx/core';
import {
  CalendarProvider,
  DayGridView,
  DayGridViewDay,
  DayGridViewRow,
  DayGridViewRowEvent,
  useCalendar,
  useCalendarSelector,
  DayGridViewSection,
} from '@calendar-tsx/solid';
import '@calendar-tsx/themes/default.css';
import { createSignal, For, Show } from 'solid-js';
import { Temporal } from 'temporal-polyfill';

type Booking = { title: string };

// module scope: views and features are compared by reference
const features = calendarFeatures({});
const views = calendarViews({
  features: features,
  views: {
    month: dayGridView({ period: 'month', maxEventsPerDay: 3 }),
    week: timeGridView({ days: 7 }),
  },
});

export const App = (props: { events: Calendar_EventInput<Booking>[] }) => {
  const [view, setView] = createSignal<keyof typeof views>('month');
  const [date, setDate] = createSignal(Temporal.Now.plainDateISO());

  // an accessor: the calendar re-syncs when a signal read inside it changes
  const calendar = useCalendar(() => ({
    timeZone: 'America/New_York',
    views,
    features,
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
type State = Calendar_State<Booking, unknown, typeof views>;

const Month = () => {
  const layout = useCalendarSelector((state: State) => state.layout);
  const month = () => {
    const current = layout();

    return current.kind === 'dayGrid' ? current : undefined;
  };

  return (
    <Show when={month()}>
      {month => (
        <DayGridView model={month()}>
          <For each={month().sections}>
            {section => (
              <DayGridViewSection section={section}>
                <For each={section.rows}>
                  {week => (
                    <DayGridViewRow row={week}>
                      <For each={week.days}>{day => <DayGridViewDay day={day}>{day.date.day}</DayGridViewDay>}</For>
                      <For each={week.segments}>
                        {segment => (
                          <DayGridViewRowEvent segment={segment}>{segment.event.data.title}</DayGridViewRowEvent>
                        )}
                      </For>
                    </DayGridViewRow>
                  )}
                </For>
              </DayGridViewSection>
            )}
          </For>
        </DayGridView>
      )}
    </Show>
  );
};
// #endregion app
