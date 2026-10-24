# @calendar-tsx/react

> [!WARNING]
> **Experimental.** `@calendar-tsx/react` is an experiment. Its API can change or be removed in any release, without notice.

React bindings for [`@calendar-tsx/core`](../core): `useCalendar`, `CalendarProvider`, and unstyled parts for the
day-grid (`DayGridView*`), time-grid (`TimeGridView*`), list (`ListView*`) and timeline (`TimelineView*`) layouts.

See [the bindings structure](../../docs/bindings-structure.md) for source ownership and test locations.

## Quick example

```tsx
import {
  DayGridViewDay,
  DayGridView,
  DayGridViewRow,
  DayGridViewRowEvent,
  CalendarProvider,
  useCalendar,
  useCalendarSelector,
  DayGridViewSection,
} from '@calendar-tsx/react';

const Month = () => {
  const layout = useCalendarSelector(state => state.layout);

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
                  {segment.event.id}
                </DayGridViewRowEvent>
              ))}
            </DayGridViewRow>
          ))}
        </DayGridViewSection>
      ))}
    </DayGridView>
  );
};

const App = () => {
  const calendar = useCalendar({/* same options as createCalendar, including the views map and feature registry */});

  return (
    <CalendarProvider value={calendar}>
      <Month />
    </CalendarProvider>
  );
};
```

The context does not carry the instance's types, so `useCalendarSelector` returns the widest state. To narrow it to
your views and features, annotate the selector with `Calendar_StateOf` from `@calendar-tsx/core`: `useCalendarSelector((state: Calendar_StateOf<typeof calendar>) => …)`.

Parts render no styles: position them with CSS reading `--cal-*` custom properties (for example
`left: calc(var(--cal-col-start) / var(--cal-columns) * 100%)`). Every part accepts `render={<El />}` or
`render={(props, state) => …}` to swap its element.

Navigation triggers require `calendar={calendar}` and a `view` key checked against that typed instance. Pass the
instance returned by `useCalendar` down to your view parts; context erases the registered keys. Set accessible-label
`locale` on `CalendarProvider` or `Calendar`, rather than hook options.

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

Resource agendas use `listView({ weeks: 1, groupBy: 'resource' })` or the ordered pairs `['resource', 'date']` and `['date', 'resource']`. Render `layout.sections` with `ListViewSection` and `ListViewSectionHeader`, then render each section's `days` with the existing day and event parts. Resource data stays typed in the section and day models. `layout.days` remains available as a flat index.

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

## Interaction refs

Register `interactionFeature()`, `pointerFeature()` and the operations you need with `calendarFeatures`. Pass the
calendar to `useCalendarInteractionBindings(calendar)`. Attach `bindings.root` to the calendar container,
`bindings.surface(timeGridSurface(column.key))` to each measured track, and
`bindings.source(segment.key, { eventId: segment.event.id })` to event elements. A resize handle adds
`edge: 'start'` or `'end'` and a distinct ref key. Resizing works without movement or selection.

The hook owns driver mounting and cleanup. Refs remain stable while descriptors update. Use `bindings.operation`
for a typed third-party binding made with `createCalendarDomOperation`. Render the derived `bindings.preview` geometry as an overlay;
preview elements should not intercept pointer hits. All-day tracks, timeline lanes and day-grid rows use the exported
`timeGridSurface()`, `timelineSurface(row.key)` and `dayGridSurface(section.key, row.key)` helpers. Register track
bounds without axis labels or gutters. Touch and autoscroll remain separate opt-in features.

See the [core browser binding contract](../core/readme.md#browser-bindings-and-transfers) for activation settings,
external sources, transfers and scheduling policies. Display-only calendars do not mount interaction bindings.

The docs include a [React interaction setup and rendering guide](../../apps/docs/content/docs/react/features/interactions.mdx),
[editing policies](../../apps/docs/content/docs/react/features/editing-policies.mdx), and
[external drops and transfers](../../apps/docs/content/docs/react/features/drops-and-transfers.mdx).

Pass `{ scope: createCalendarInteractionScope() }` to group hosts for transfers or external sources; reuse that scope
across the participating calendars. The binding hook owns mounting. Programmatic interaction previews can use the
existing store selector without installing pointer input.
