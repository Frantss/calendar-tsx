import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Temporal } from 'temporal-polyfill';
import { calendarFeatures, calendarViews, listView } from '@calendar-tsx/core';
import type { Calendar_EventInput, Calendar_StateOf } from '@calendar-tsx/core';
import {
  Calendar,
  CalendarProvider,
  ListViewEvent,
  TimeGridViewColumnTrigger,
  useCalendar,
  useCalendarEventStore,
  useCalendarInteractionBindings,
  useCalendarSelector,
} from '@calendar-tsx/solid/v2';

const options = {
  views: calendarViews({ features: calendarFeatures({}), views: { list: listView({ days: 1 }) } }),
  features: {},
  date: Temporal.PlainDate.from('2026-10-27'),
  timeZone: 'UTC',
  view: 'list' as const,
  events: [{ id: 'a', kind: 'allDay' as const, start: Temporal.PlainDate.from('2026-10-27'), data: { title: 'A' } }],
  onNavigate: () => {},
};

export const Consumer = (): JSX.Element => {
  const calendar = useCalendar<{ title: string }, unknown, typeof options.views, typeof options.features>(
    () => options,
  );
  const events = useCalendarEventStore(options.events);
  const value: Accessor<Calendar_EventInput<{ title: string }>[]> = events.events;
  const layout = useCalendarSelector((state: Calendar_StateOf<typeof calendar>) => state.layout);
  calendar.api.setView('list');
  // @ts-expect-error Interaction bindings require registered interaction features.
  useCalendarInteractionBindings(calendar);
  // @ts-expect-error View names come from the calendar registry.
  calendar.api.setView('missing');
  // @ts-expect-error Locale belongs on the provider.
  useCalendar(() => ({ ...options, locale: 'en-US' }));
  // @ts-expect-error The trigger must use a registered view.
  const invalid = <TimeGridViewColumnTrigger calendar={calendar} column={null!} view='missing' />;
  void invalid;
  void value;
  const event = () => layout().days[0]?.events[0];
  return (
    <CalendarProvider value={calendar}>
      <Calendar {...options} locale='en-US'>
        <ListViewEvent<{ title: string }>
          event={event()!}
          render={(props, state) => <button {...props()}>{state().data.title}</button>}
        />
      </Calendar>
    </CalendarProvider>
  );
};
