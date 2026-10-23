# @calendar-tsx/react

> [!WARNING]
> **Experimental.** `@calendar-tsx/react` is an experiment. Its API can change or be removed in any release, without notice.

React bindings for [`@calendar-tsx/core`](../core): `useCalendar`, `Calendar_RootProvider`, and unstyled parts for the
month (`MonthView_*`), time-grid (`TimeGridView_*`) and list (`ListView_*`) layouts.

## Quick example

```tsx
import {
  MonthView_Day,
  MonthView_Root,
  MonthView_Week,
  MonthView_WeekEvent,
  Calendar_RootProvider,
  useCalendar,
  useCalendarSelector,
} from '@calendar-tsx/react';

const Month = () => {
  const layout = useCalendarSelector(state => state.layout);

  if (layout.kind !== 'month') return null;

  return (
    <MonthView_Root model={layout}>
      {layout.weeks.map(week => (
        <MonthView_Week key={week.key} week={week}>
          {week.days.map(day => (
            <MonthView_Day key={day.key} day={day}>
              {day.date.day}
            </MonthView_Day>
          ))}
          {week.segments.map(segment => (
            <MonthView_WeekEvent key={segment.key} segment={segment}>
              {segment.event.id}
            </MonthView_WeekEvent>
          ))}
        </MonthView_Week>
      ))}
    </MonthView_Root>
  );
};

const App = () => {
  const calendar = useCalendar({/* same options as calendar_create */});

  return (
    <Calendar_RootProvider value={calendar}>
      <Month />
    </Calendar_RootProvider>
  );
};
```

Parts render no styles: position them with CSS reading `--cal-*` custom properties (for example
`left: calc(var(--cal-col-start) / 7 * 100%)`). Every part accepts `render={<El />}` or
`render={(props, state) => …}` to swap its element.

## Server rendering

The parts render with `renderToString` and stream like any other component. For the markup to hydrate, the server and
the client must derive the same "now": pick an instant once per request, send it to the client as a string, and pass it
as `initialNow` on both sides. After mounting, the calendar reads its clock as usual.

```tsx
// server: const now = Temporal.Now.instant().toString(), sent with the page data
const calendar = useCalendar({ ...options, initialNow: Temporal.Instant.from(now) });
```

The entry is marked `'use client'`, so Server Components can import the parts, but options cannot cross that boundary
as props (`Temporal` values, `views`, `onNavigate`). Create the calendar inside a client component and pass it
strings to parse.
