# @calendar-tsx/core

> [!WARNING]
> **Experimental.** `@calendar-tsx/core` is an experiment. Its API can change or be removed in any release, without notice.

Framework-agnostic calendar engine that powers [`@calendar-tsx/react`](../react). It derives day-grid, time-grid,
list and timeline layouts from controlled view/date options and event input, in a single time zone.

Calendar APIs, built-in features, helpers and public types use the same entry point:

```ts
import {
  backgroundFeature,
  createBackgroundLayer,
  createWeeklyRanges,
  recurrenceFeature,
  createRecurringEvent,
} from '@calendar-tsx/core';
```

Configure features with their factories, register them with
`calendarFeatures`, and bind views with `calendarViews`. See the
[factory assembly API](../../docs/calendar-assembly.md) and
[core feature organization and exports](../../docs/core-features.md) for module ownership and the public entry.

## Quick example

```ts
import { dayGridView, timeGridView, calendarFeatures, calendarViews, createCalendar } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';

// module scope: views and features are compared by reference
const features = calendarFeatures({});
const views = calendarViews({
  features,
  views: {
    month: dayGridView({ period: 'month', maxEventsPerDay: 4 }),
    week: timeGridView({ days: 7 }),
  },
});

const calendar = createCalendar({
  timeZone: 'America/New_York',
  views,
  features,
  view: 'week',
  date: Temporal.PlainDate.from('2026-03-11'),
  events: [],
  onNavigate: next => {
    // store next.view / next.date, then pass them back in through `~update`
  },
});

calendar.store.state.layout; // dayGrid | timeGrid: the layouts the views register
calendar.api.next(); // emits onNavigate; never writes state
```

Adapters drive the instance through `'~mount'` (starts the clock) and `'~update'(options)` (writes only when a tracked
input changed).

Until `'~mount'`, the state derives "now" from `initialNow` when given, otherwise from the clock. To render on a server
and hydrate on the client, pass the same `initialNow` to both.

## DST and axis positions

Time grids and timelines use a fixed 24-hour clock axis in `timeZone`: 09:00 aligns with the 09:00 slot on DST days,
and timeline dates keep equal widths. The two occurrences of a repeated hour share clock positions; visually
overlapping events receive separate lanes or stack rows. A transition-crossing bar encloses the clock positions
visited by its real interval. Actual event timestamps and durations remain available on `segment.event`.

Backgrounds, availability and the now indicator use the same axis. All-day spans follow date boundaries even when
midnight is skipped. Minimum and short event lengths measure displayed clock minutes (design D40).
Timed shading can split into separate bands at a DST transition; inverse layers retain the gaps between them.

Timeline rows expose `backgroundEvents` independently of foreground `segments`. Register `backgroundFeature(layers)` in the feature registry and bind it with
`calendarViews` to add `row.backgrounds` for fixed, weekly or inverse layers. Both use fractions of the visible
track and take no stack rows. Unassigned background events shade every resource; scoped layers require a matching
resource row. All-day shading follows anchor dates; timed shading uses exact projected coverage.

## Hidden weekdays and visible hours

Core exports the `DayOfWeek` const object with ISO values (`DayOfWeek.Monday` is `1`, `DayOfWeek.Sunday` is `7`).
Use it for `firstDayOfWeek`, `hiddenDays` and weekly background rules' `daysOfWeek`. Numeric literals remain valid.

All built-in views accept `hiddenDays`. Time grids and timelines
also accept a `timeWindow` in nominal clock minutes:

```ts
import { DayOfWeek, timeGridView, timelineView } from '@calendar-tsx/core';

timeGridView({
  days: 7,
  hiddenDays: [DayOfWeek.Saturday, DayOfWeek.Sunday],
  timeWindow: { startMinutes: 480, endMinutes: 1080 },
});
timelineView({ days: 1, timeWindow: { startMinutes: 1320, endMinutes: 1800 } }); // 22:00–06:00
```

Defaults show every weekday and `[0, 1440)`. Window bounds are integers: `0 <= startMinutes < 1440` and
`startMinutes < endMinutes <= startMinutes + 1440`. A positive integer `slotMinutes` need not divide the window;
the final slot has its actual proportional size. Slot models expose `dayOffset`, `start` and `span` for labels.

An overnight window belongs to its starting date. Hiding Tuesday leaves Monday's Tuesday-morning portion visible.
All-day items retain their anchor dates. Month rows keep their calendar-week boundaries; bars and overflow only
occupy visible cells. Hiding all seven weekdays is invalid. When hidden weekdays would leave the range without a date, as a one-day view on
a hidden weekday would, the range shows its dates anyway.

Navigation exposes `inputRange` alongside `range` and `period`. Fetch events for `inputRange`: it includes the
following morning when an overnight window needs it. `range` remains the inclusive anchor envelope, and `period`
keeps its navigation meaning. Input filtering is coarse; layouts clip to actual visible windows afterward.

Layout models expose their shared `coordinates`. Timed segments retain exact `fragments`, including offsets and
occurrences, separately from D40's enclosing rectangle. Resource, event and clock changes reuse timed plans for a
stable view definition. Coordinate helper functions remain internal.

## Events

Events are plain objects (design D2, D7, D8), discriminated by `kind`: `'timed'` events take `ZonedDateTime` bounds,
`'allDay'` events take `PlainDate` bounds. `createEvent` returns its argument unchanged; use it to type an event where
it is written, with `data` inferring the payload type:

```ts
const yoga = createEvent({ id: 'yoga', kind: 'timed', start, end, data: { title: 'Yoga' } }); // Calendar_TimedEventInput<{ title: string }>
const fair = createEvent<EventData>({ id: 'fair', kind: 'allDay', start: Temporal.PlainDate.from('2026-03-11'), data });
```

Core exports `createRecurringEvent` and `recurrenceFeature` for [native daily/weekly schedules](recurrence.md).
Recurring definitions share `events` with one-off inputs. Use the optional
[`@calendar-tsx/rrule`](../rrule/readme.md) for more capable rules. `Calendar_EventDefinition<TData, TFeatures>` includes inputs
contributed by registered features; `Calendar_EventInput<TData>` remains the concrete timed/all-day union used by
layouts. Stores retain definitions, and generated events expose `occurrence.seriesId` and `occurrence.originalStart`.

## Background events

An event with `display: 'background'` is shaded under the other events instead of laid out as one (design D37). It
takes no lane or row and skips `eventOrder`; `day.events` and the list leave it out. Use it for dated items from your
data; use background layers for rules such as business hours:

```ts
createCalendar({
  ...options,
  events: [
    ...events,
    { id: 'holiday', kind: 'allDay', display: 'background', start: Temporal.PlainDate.from('2026-03-17'), data },
    { id: 'lunch', kind: 'timed', display: 'background', start: lunchStart, end: lunchEnd, data },
  ],
});
```

- Time grid: `column.backgroundEvents` segments (all-day ones cover the whole column) and `allDay.backgroundEvents`
  spans.
- Day grid: `section.rows[].backgroundEvents` spans, for all-day background events only.
- List: left out.
- Without `resourceIds`, a background event shades every resource column.

## Brief event sizes

`timeGridView` lays out timed events shorter than half a slot as half a slot long, with their own lane if they would
otherwise cover the next event. The event's actual start and end are unchanged. Set `minEventMinutes` to override the
minimum, or `0` to use exact durations.

## Timeline event sizes

`timelineView` lays out short timed events with a minimum display duration of half a slot. Stacking uses that enlarged span, so neighboring brief events stay separate. The event's actual start and end are unchanged. Set `minEventMinutes` to override the minimum, or `0` to use exact durations. Bars clip at the visible range's end; all-day events keep their date spans.

For coarse timelines, combine daily slots with `minSlotWidth`, for example `timelineView({ period: 'quarter', slotMinutes: 1440, minSlotWidth: '6rem' })`. The default minimum then occupies half a daily column instead of a one-pixel sliver.

## Resource agendas

List agendas can group resources and dates with the same factory:

```ts
import { listView } from '@calendar-tsx/core';

listView({ weeks: 1, groupBy: 'resource' });
listView({ weeks: 1, groupBy: ['date', 'resource'] });
```

`layout.sections` contains the outer resource or date groups and their event-bearing days. `layout.days` indexes the same days in render order. Resource agendas include only events assigned to known resources, in resource input order; shared events appear under each assigned resource. Ordinary lists continue to include unassigned events.

## Features

Feature factories return reusable configuration definitions (design D54). Register each definition under a
consumer-chosen key, then pass the registry into `calendarViews` and `createCalendar`:

```ts
const features = calendarFeatures({ background: backgroundFeature(defaultBackgrounds) });
const views = calendarViews({
  features,
  views: {
    week: timeGridView({ weeks: 1 }),
    day: timeGridView({ days: 1, features: { background: dayBackgrounds } }),
  },
});

createCalendar({ ...options, features, views });
```

Every view inherits the registered features. Overrides use the factory's configuration input shape. Objects
shallow-merge with defaults; arrays replace them. An empty background array clears that view's layers. Omitted
entries inherit defaults, and adding an override to one view does not change another view's participation.

- Hooks can contribute initial state, actions, source resolution, event stages and layout decoration.
- Feature hooks read their resolved configuration from `context.config`. The runtime includes it in stage cache
  dependencies. State and actions belong to the calendar instance and are shared across views.
- Sources carry a stable `~source` identity. Resolver lookup uses the configured definition's `~id`, so registry
  aliases preserve event-input types and runtime resolution. Resolution remains calendar-wide and is cached by
  input reference, input range and display zone.
- State can be internal, controlled through `state`, or kept in external `atoms`.
- Features extend the `Calendar_*_FeatureMap` interfaces using their stable identities. Registry aliases preserve
  state, action, event-input and model contributions. Layout feature maps receive canonical identities.
- Duplicate feature identities and registry keys that conflict with a view's layout are rejected.
- Feature definitions and factory defaults are fixed at creation. Pass a new `views` reference to update view
  overrides. Changing registered definitions through `~update` throws; create a new instance instead.
- Views supply their layout features. Consumers do not register layouts in the feature registry.

See [feature organization and exports](../../docs/core-features.md) for the module layout and public entry.

`Calendar_Api_FeatureMap<TData, TResourceData>` receives the same event and resource payload types as the options
map. Use them in an action's parameters or return type; `createCalendar` and the adapters infer them from the calendar
input. Existing declarations without type parameters remain valid. Explicit API annotations use
`Calendar_Api<TViews, TFeatures, TData, TResourceData>`; omitted payload parameters default to `unknown`.

## Background layers

`backgroundFeature(layers)` shades time in the time-grid, day-grid and timeline views (design D33). Each layer passed to the
factory is one kind of shading: fixed ranges, a function of the visible range, or the gaps they leave
(`inverse`), optionally limited to some resources.

```ts
import { backgroundFeature, createBackgroundLayer, createWeeklyRanges } from '@calendar-tsx/core';

// module scope: layers and their ranges functions are compared by reference
const backgrounds = [
  createBackgroundLayer({
    id: 'business-hours',
    kind: 'closed',
    inverse: true,
    ranges: createWeeklyRanges([
      {
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: Temporal.PlainTime.from('09:00'),
        endTime: Temporal.PlainTime.from('17:00'),
      },
    ]),
  }),
  createBackgroundLayer({
    id: 'holidays',
    kind: 'holiday',
    ranges: [{ allDay: true, start: Temporal.PlainDate.from('2026-12-25') }],
  }),
];

const features = calendarFeatures({ background: backgroundFeature(backgrounds) });
const views = calendarViews({
  features,
  views: {
    week: timeGridView({ days: 7 }),
    month: dayGridView({ period: 'month', maxEventsPerDay: 4 }),
  },
});

createCalendar({ ...options, views, features });
```

Time-grid columns get `backgrounds: { key, layer, kind, start, span }[]`, as fractions of the day. Day-grid cells get
`backgrounds: { key, layer, kind }[]` from all-day ranges, and from inverse layers on the days none of their ranges
touch. Render them with `TimeGridViewBackground` and `DayGridViewDayBackground`.

## Interaction operations

Selection, movement and resizing are independent programmatic features (D58):

```ts
import {
  createCalendar,
  calendarFeatures,
  calendarViews,
  timeGridView,
  interactionFeature,
  eventResizeFeature,
} from '@calendar-tsx/core';

const features = calendarFeatures({ interactions: interactionFeature(), resize: eventResizeFeature() });
const views = calendarViews({ features, views: { day: timeGridView({ days: 1 }) } });
const calendar = createCalendar({
  ...options,
  features,
  views,
  view: 'day',
  onEventResize: proposal => save(proposal.after),
});
const session = calendar.api.resize.begin('appointment', 'end');
if (session.status === 'active') {
  session.session.update({ kind: 'timed', at: newEnd });
  session.session.commit();
}
```

Register `dateSelectionFeature` for `selection.begin/evaluate` and persistent `selectedRange`; register
`eventMoveFeature` for `move.begin/evaluate`. `resize.begin/evaluate` requires neither of those. Shared controls expose `store`, `locate`, `project` and `refresh`. An active start returns `session`, with
`update(target)`, `commit()`, `cancel(reason?)`, `unavailable(reason)` and `isActive()`. The handle retains its
operation's target and event-data types. Commands return discriminated results; valid updates and committed
results contain their typed proposal. `isActive()` checks the runtime lease while controlled acknowledgment is pending.
Callbacks and evaluation results also retain the consumer's event data. Events change only when the application applies a proposal. Selection writes through D29's
internal/controlled/external state ownership and reports `onSelectionChange`.

The [React guide](../../apps/docs/content/docs/react/features/interactions.mdx) and
[Solid guide](../../apps/docs/content/docs/solid/features/interactions.mdx) show complete setup, source refs and
preview rendering using the public exports. Core-only consumers use the same feature registry and operation APIs.

`constraintsFeature` checks concrete supplied events, including timed/all-day/background overlap. Optional
`allowedRanges`, `businessHours`, `resourceIds` and `resourceAvailability` constrain the entire proposed interval.
Recurring definitions and generated occurrence IDs remain outside editing and conflict expansion. `allow` adds a
synchronous predicate for built-in scheduling proposals. Rules run during preview and again at commit.

Registering `constraintsFeature()` prevents overlap by default. Set `preventOverlap: false` to enforce other rules
while permitting overlap. Keep rule arrays and predicates stable until their contents change; reference changes
trigger draft revalidation. See the [policy guide](../../apps/docs/content/docs/react/features/editing-policies.mdx).

Moves preserve elapsed timed duration or inclusive all-day length. Opt into `movement.allowConversion` to reset
conversion to one all-day date or one timed hour; `defaultTimedMinutes` and `conversionDuration: 'preserve'` override
that policy. Resource moves replace the entire list by default. `resourceMode: 'replace-source'` replaces only the
assignment passed to `move.begin/evaluate`; `allowResourceChange: false` preserves assignments. Use `canMove`,
`resizing.canResize` and `resizing.fromStart` for editing permissions. Resize never converts event kinds.

Drafts live in a separate store and do not derive the base layout. `interactionOwnership` chooses internal,
controlled (`read` / `onChange`) or external (`atom`) ownership. Mode and atom are fixed at creation. Controlled
owners acknowledge the requested snapshot object; pending writes return `awaiting-owner`. `~update` refreshes
sessions, current callbacks and settings; changed sources or navigation cancel them. Mounted subscribable external
atoms refresh automatically; other atoms require `interactions.refresh()`. Final unmount cancels pending leases.

Third-party features extend `Calendar_OperationMap<TData>` with intent/target/proposal types and contribute
`interaction: { operation: createInteractionOperation({ ... }) }`, plus their D29 options/API map entries. Targets can
be non-date values. Descriptors own activation, source identity, equality, evaluation, API binding and completion;
validators and `deps` are optional interaction contributions. Dependency values compare by reference; return primitive
setting fields when callers may recreate their setting objects. Declare `requires: ['interactionFeature'] as const`.
The constructor validates prerequisites by stable feature identity before installing APIs. See the
[public extension fixture](tests/types/third-party/public-feature.ts).

A feature's `constructApi` context also exposes resolved `features` and current `state`. Register
`context.onOptionsChange(callback)` and `context.onMount(() => cleanup)` during construction to own per-instance
resources. Option callbacks run even when layout inputs are unchanged. Mount callbacks run once per active lifetime;
cleanup runs in reverse order on the last release and supports remount.

## Layout interaction capabilities

Day-grid, time-grid and timeline layouts provide optional `locate` and `project` methods (D59). `interactionFeature` dispatches
through the active resolved layout, including replacements and third-party layouts:

```ts
const hit = calendar.api.interactions.locate({
  kind: 'timeGrid',
  surface: { kind: 'column', key: 'all:2026-03-11' },
  fraction: 9 / 24,
});
if (hit.status === 'valid') {
  // Pass hit.target to the owning operation's begin/evaluate, or session.update(hit.target).
}
const preview = calendar.api.interactions.store.state.preview;
if (preview?.status === 'valid' && preview.kind === 'timeGrid') {
  preview.geometry; // surface identifiers and axis fractions for separate overlays
}
```

Positions are fractions of a measured surface, with no DOM objects. Time-grid surfaces are `{ kind: 'column', key }`
or `{ kind: 'allDay' }`; timeline surfaces are `{ kind: 'lane', key }`. Timed positions snap to the view's
`slotMinutes`, defaulting to 30 in time grids and 60 in timelines. `dateKind: 'allDay'` selects dates in timeline
lanes. Fractions follow the visible dates and clock window. Fraction 1 is the final visible window end for timed targets, and the final displayed date for all-day targets.

Hits retain their local `clock` and distinct instant `candidates`. Nonexistent local times return `unavailable`;
repeated times preserve a matching supplied `offset`, otherwise use the earlier occurrence. Both use D40's fixed
clock axis. Supplying a point for another layout returns `different-layout`.

The readonly transient store derives `preview` from accepted candidates and the current base model. Invalid or
absent candidates produce `null`; unsupported projection produces an `unavailable` result. Ownership snapshots
remain semantic: controlled and external owners do not store derived geometry. Draft changes do not rebuild or
notify the base model. Previews use separate overlays without repacking neighboring events. Event previews reuse
the layout math, including minimum lengths, clipping, resources and inclusive all-day ends; selection previews
carry no fabricated event or payload. `interactions.project(proposal)` also projects a semantic proposal without
starting a session. Projection does not apply or commit the proposal.

Third-party layouts add a `Calendar_LayoutInteractionMap` entry keyed by their layout kind, specifying `point`,
`target` and `geometry`. Annotate their descriptor with
`Calendar_LayoutFeature<'myKind', MySettings, MyModel>` and implement either capability as needed. Each receives the
current decorated model, the actual normalized/staged layout input, and active view settings. Points, targets and
geometry may have their own shapes. The runtime contains no builtin-kind dispatch. Missing capabilities return
`locate-unsupported` or `project-unsupported`; semantic operations remain usable. See the
[public layout fixture](tests/types/third-party/public-layout.ts).

## Browser bindings and transfers

Register `pointerFeature` with `interactionFeature` and the desired operations, then mount
`createCalendarInteractionHost(calendar)` from `@calendar-tsx/core`. Register elements with `host.surface` and
`host.source`; `host.mount(root)` returns cleanup. Source descriptors contain `eventId`, an optional resize `edge`
and dragged `resourceId`. Use `timeGridSurface(column.key)`, `timeGridSurface()` for an all-day track,
`timelineSurface(row.key)` or `dayGridSurface(section.key, row.key)`. Measure only the date/time track, excluding
axis labels and gutters. Coordinates account for RTL and clipping; previews remain consumer-rendered overlays.

`touchFeature` enables hold activation (`touch.delay`, default 500 ms; `tolerance`, default eight pixels).
`autoScrollFeature` enables nested/window edge scrolling (`edge`, default 40 pixels; `speed`, default 600 px/s).
Mouse activation uses `pointer.distance`, default four pixels. Touch movement before activation yields to scrolling.
Each driver reads active per-view settings. Without a mounted host, feature registration adds no browser listeners.

External palettes attach `createExternalDraggable(element, () => ({ event, metadata }), { scope, pointer: {} })` and release its returned
cleanup. Receivers register `externalDropFeature`; `onExternalDrop` receives `{ kind: 'create', after, metadata }`.
`externalDrop.accept` can reject sources, and `externalDrop.placement` configures conversion/resources independently
of movement. Duplicate destination IDs are rejected. Events retain their consumer payload type.

Register `crossCalendarFeature` and a unique `crossCalendar.id` on both hosts; the source also needs movement.
`onEventTransfer` fires once on the source with `{ kind: 'transfer', sourceId, destinationId, before, after }`.
Apply both sides in your application transaction. The library changes neither input array. Receivers validate their
own constraints. Programmatic coordination uses `transfer.prepare(eventId, resourceId?)`, then the receiver's
`transfer.begin/evaluate`; always call the prepared handle's `release()` when abandoning a transfer.

Third-party operations bind `createCalendarDomOperation({ acceptsTarget, begin, target? })` through `host.source`; they need no event/date shape. Custom surface
resolvers return their own `Calendar_LayoutPoint` variant. Missing layout capabilities remain unavailable.

The DOM adapter stays in `@calendar-tsx/core`. `createCalendarInteractionScope()` creates an explicit drag group.
Pass the same `{ scope }` to participating hosts or framework binding hooks and external draggables. Omitted host
scopes are isolated. External draggables own their `pointer` and optional `touch` activation settings; receiving
calendars provide their own scrolling policy. Programmatic creation and transfer require no pointer feature.
Receiver placement uses `crossCalendar.placement`, independently of movement settings.

`createCalendarDomHost` accepts only pointer settings and interaction controls. It binds custom operations without
requiring events or a time zone. `createCalendarInteractionHost` adds built-in event and selection bindings.
React/Solid expose `useCalendarInteractionBindings`; the hook owns mounting and returns refs, cancel and preview.
Subscribe directly to `interactions.store` to observe programmatic edits without browser input.

An operation's optional `scheduling(proposal)` describes either `{ kind: 'range', range }` or
`{ kind: 'event', event, excludeEventId? }`. Constraints validate this description; built-in layouts project it.
Custom layouts still receive the original proposal and may use their own geometry. Operations without scheduling
participation remain independent of built-in date policies. The typed descriptor is public; registry erasure stays
inside the runtime.
