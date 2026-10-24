# @calendar-tsx/solid

> [!WARNING]
> **Experimental.** `@calendar-tsx/solid` is an experiment. Its API can change or be removed in any release, without notice.

Solid bindings for [`@calendar-tsx/core`](../core): `useCalendar`, `CalendarProvider`, and unstyled parts for the
day-grid (`DayGridView*`), time-grid (`TimeGridView*`), list (`ListView*`) and timeline (`TimelineView*`) layouts. Part names, props, data
attributes and `--cal-*` variables match [`@calendar-tsx/react`](../react).

## Quick example

```tsx
import { For, Show } from 'solid-js';
import {
  DayGridViewDay,
  DayGridView,
  DayGridViewRow,
  DayGridViewRowEvent,
  CalendarProvider,
  useCalendar,
  useCalendarSelector,
  DayGridViewSection,
} from '@calendar-tsx/solid';

const Month = () => {
  const layout = useCalendarSelector(state => state.layout);
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
                        {segment => <DayGridViewRowEvent segment={segment}>{segment.event.id}</DayGridViewRowEvent>}
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

## Visible dates and hours

Configure `hiddenDays` on the core view factories and `timeWindow` on `timeGridView` or `timelineView`. The parts
consume the resulting geometry; callers keep mapping columns, slots and segments as usual. Slots expose
`dayOffset` to label after-midnight times, and a single event can appear in multiple date columns.

For custom CSS, use `--cal-columns` for day-grid widths, each axis label's `--cal-start`/`--cal-span` for its position,
and `--cal-slot-units` for time-grid height. Timeline headers use `--cal-slot-columns` so final partial slots keep
their proportional width. `--cal-slots-per-hour` and `--cal-hour-offset` place hour lines in a window that starts off
the hour. The bundled themes handle these values. Fetch events for navigation's `inputRange`.

## Timeline backgrounds

Timeline lanes can render `row.backgroundEvents` with `TimelineViewBackgroundEvent`. Views registering
`backgroundFeature` also expose `row.backgrounds` for `TimelineViewBackground`. Both take geometry from the core,
render `aria-hidden` divs, and sit beneath foreground events when using the bundled themes.

## Resource agendas

Resource agendas use `listView({ weeks: 1, groupBy: 'resource' })` or the ordered pairs `['resource', 'date']` and `['date', 'resource']`. Render `layout().sections` with `ListViewSection` and `ListViewSectionHeader`, then render each section's `days` with the existing day and event parts. Resource data stays typed in the section and day models. `layout().days` remains available as a flat index.

## Server rendering

The package renders with `renderToString` and hydrates with `hydrate`; no separate entry is needed. Pass the same
`initialNow` (a `Temporal.Instant` chosen once per request) to the calendar on the server and on the client, or the now
indicator and `data-today` can differ and hydration fails.

Parts render no styles: position them with CSS reading `--cal-*` custom properties (for example
`left: calc(var(--cal-col-start) / var(--cal-columns) * 100%)`).
