# @calendar-tsx/solid

> [!WARNING]
> **Experimental.** `@calendar-tsx/solid` is an experiment. Its API can change or be removed in any release, without notice.

Solid bindings for [`@calendar-tsx/core`](../core): `useCalendar`, `CalendarProvider`, and unstyled parts for the
month (`MonthView*`), time-grid (`TimeGridView*`), list (`ListView*`) and timeline (`TimelineView*`) layouts. Part names, props, data
attributes and `--cal-*` variables match [`@calendar-tsx/react`](../react).

## Quick example

```tsx
import { For, Show } from 'solid-js';
import {
  MonthViewDay,
  MonthView,
  MonthViewWeek,
  MonthViewWeekEvent,
  CalendarProvider,
  useCalendar,
  useCalendarSelector,
} from '@calendar-tsx/solid';

const Month = () => {
  const layout = useCalendarSelector(state => state.layout);
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
                  {segment => <MonthViewWeekEvent segment={segment}>{segment.event.id}</MonthViewWeekEvent>}
                </For>
              </MonthViewWeek>
            )}
          </For>
        </MonthView>
      )}
    </Show>
  );
};

const App = () => {
  const calendar = useCalendar(() => ({/* same options as createCalendar, including views.views and features */}));

  return (
    <CalendarProvider value={calendar}>
      <Month />
    </CalendarProvider>
  );
};
```

The context does not carry the instance's types, so `useCalendarSelector` returns the widest state. To narrow it to
your views and features, annotate the selector with `Calendar_StateOf` from `@calendar-tsx/core`:
`useCalendarSelector((state: Calendar_StateOf<typeof calendar>) => …)`.

## Differences from the React bindings

- `useCalendar` takes an accessor, `() => options`. It re-syncs whenever a signal read inside it changes;
  `Calendar` takes the options as props and does the same.
- `useCalendarSelector` and `useCalendarEventStore().events` return accessors.
- `render` is a function only: `render={(props, state) => <button {...props({ onClick })} />}`. Call `props()` to get
  the part's props, passing your own to merge them (handlers and refs chain, `class` joins, `style` merges). `state`
  is an accessor. Solid has no elements to clone, so there is no `render={<El />}` form.
- Parts take `class`, not `className`, and `ref` as in any Solid component.

## Server rendering

The package renders with `renderToString` and hydrates with `hydrate`; no separate entry is needed. Pass the same
`initialNow` (a `Temporal.Instant` chosen once per request) to the calendar on the server and on the client, or the now
indicator and `data-today` can differ and hydration fails.

Parts render no styles: position them with CSS reading `--cal-*` custom properties (for example
`left: calc(var(--cal-col-start) / 7 * 100%)`).
