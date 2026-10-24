# Calendar — design spec

> Status: **core, React and Solid adapters implemented** (`packages/core`, `packages/react`, `packages/solid`)

> D40–D42 record fixed-clock coordinates, visible windows and timeline backgrounds; D44 records durations and grouping; D47 adds resource agendas. Earlier schemas remain as decision history.

> Moved from guildara-frontend (`lib/calendar`) to this repository. References to `lib/calendar/core` and
> `lib/calendar/react` now mean `packages/core` (`@calendar-tsx/core`) and `packages/react` (`@calendar-tsx/react`);
> "app R…" requirements refer to guildara-frontend's `docs/calendar-spec.md`, the calendar page this library was built for.

## Purpose & scope

A headless calendar library that satisfies `docs/calendar-spec.md` (R1–R11): a framework-agnostic core on TanStack Store, Temporal for all date math, a React adapter with Ark-style composable parts, and no styles.

- **In scope:** views, navigation and visible range, event layout, optional native and RRule recurrence (D50, D52), background events (D37), resources and availability shading, overflow, now indicator, click/focus targets, geometry exposed as CSS variables and data attributes.
- **Out of scope (consumer's job):** URL sync, header controls and selectors, data fetching, the drawer, drafts as data, colours and copy per event kind.
- **Not supported:** drag and resize, date selection. Recurrence was here until D50. Timeline views were here until D34.

### Working assumptions (from Stage 0, unconfirmed)

- ~~In-repo module with extractable boundaries~~ Settled by D21.
- Temporal through a polyfill; current browser support unverified.
- New dependencies: `@tanstack/store`, `@tanstack/react-store`.
- "Unstyled" still emits positional geometry (CSS variables), never visual styles.
- Must run on React 18.

## Capabilities

Library-level capabilities, each traced to the app spec. Draft; confirmed when the scope area closes.

- **C1 — Views:** day grids with ordered month/resource grouping; time grids, lists and timelines; day/week/month counts and calendar month/quarter/year periods; hidden weekdays (D41, D44). All four layouts support resources; lists support ordered date/resource grouping (D47). _(app R1.1–R1.4)_
- **C2 — Navigation:** current view and date, prev/next/today, go to date, change view; visible range and period derivable synchronously after any change. _(R2.3–R2.5, R3.2–R3.5, R8.1, R11.1)_
- **C3 — Change notification:** a single subscription that reports view/date changes, so the app can sync the URL. _(R2.1–R2.2)_
- **C4 — Time-grid layout:** overlapping timed events laid out side by side; rows do not stretch; slot labels formattable. _(R1.2, R1.7, R1.8)_
- **C5 — Event content:** consumer renders each event by kind and view; hiding is filtering the input (D16); consumer-defined order within a cell. _(R5.1–R5.8)_
- **C6 — Overflow:** a per-day row cap, an optional per-day overflow hint, and an overflow trigger the consumer handles (including async fill). _(R4.2, R6; D14, D17)_
- **C7 — Resources:** columns per resource in consumer order; events in every referenced column; per-resource availability ranges producing shaded "unavailable" segments; resource header state exposed. _(R7)_
- **C8 — Time zone:** all layout in a given time zone, independent of the host. _(R4.4)_
- **C9 — Now indicator.** _(R1.5)_
- **C10 — Day targets:** day cells and day headers addressable as interactive parts. _(R8.1)_
- **C11 — Min column width / horizontal scroll** for week and resource grids. _(R1.6, pending app Q1)_
- **C12 — Managed event state (opt-in):** a standalone event store with add/remove/update whose state feeds the calendar's `events` input. _(D2)_
- **C13 — Background events:** shaded date or time ranges (holidays, closures, blocked time) drawn under the events, per resource or across all of them. _(D37; FullCalendar parity, not an app requirement)_

## Composition

High-level shape after D1–D9; part lists per view are settled in the details pass.

**Core** (framework-agnostic, TanStack Store):

```ts
const calendar = calendar_create<Calendar_EventData>({
  timeZone: provider.timezone,
  views: {
    month: dayGridView({ period: 'month', maxEventsPerDay: 4 }),
    week: timeGridView({ days: 7 }),
    day: timeGridView({ days: 1 }),
    list_week: listView({ days: 7 }),
    list_day: listView({ days: 1 }),
    resources: timeGridView({ days: 1, groupBy: 'resource' }),
  },
  view: 'week',                                   // controlled (D5)
  date: Temporal.PlainDate.from('2026-03-02'),    // controlled (D5, D7)
  onNavigate: ({ view, date, range, period }) => {},
  events,                                         // input (D2)
  resources,
  firstDayOfWeek: 7,                              // Sunday
  eventOrder: (a, b, context) => …,               // context = active view snapshot (D16)
});

calendar.store.state;   // derived view model (D1), discriminated by layout kind
calendar.api.next();    // emits onNavigate; never writes state (D5)
calendar.api.goTo(date);
calendar.api.setView('day', date);
calendar.setOptions({ events });
```

**Managed events** (opt-in, D2):

```ts
const events = eventStore_create<Calendar_EventData>();
events.add(seeAll);
calendar_create({ events: events.store.state.events, … });
```

**React adapter:**

```tsx
const calendar = useCalendar<Calendar_EventData>({ timeZone, views, view, date, onNavigate, events, resources, clock });

<Calendar_RootProvider value={calendar}>
  <Header /> {/* useCalendarContext().api.next() */}
  <CalendarBody />
</Calendar_RootProvider>;

const CalendarBody = () => {
  const layout = useCalendarSelector(state => state.layout); // discriminated by kind (D10)

  return match(layout) // open union: prefer .otherwise() (D1)
    .with({ kind: 'dayGrid' }, month => (
      <DayGridView_Root model={month}>
        {month.weeks.map(week => (
          <DayGridView_Week key={week.key} week={week}>
            {week.days.map(day => (
              <DayGridView_Day key={day.key} day={day}>
                <DayGridView_DayTrigger day={day} />
                <DayGridView_Overflow day={day}>see all</DayGridView_Overflow>
              </DayGridView_Day>
            ))}
            {week.segments.map(segment => (
              <DayGridView_WeekEvent key={segment.key} segment={segment}>
                {segment.event.data.program.name}
              </DayGridView_WeekEvent>
            ))}
          </DayGridView_Week>
        ))}
      </DayGridView_Root>
    ))
    .with({ kind: 'timeGrid' }, grid => <TimeGridView_Root model={grid}>…</TimeGridView_Root>)
    .with({ kind: 'list' }, list => <ListView_Root model={list}>…</ListView_Root>)
    .otherwise(() => null);
};
```

`TimeGridView_*` and `ListView_*` follow the same pattern; geometry arrives as CSS variables (D9).

## Anatomy

Every part renders `data-scope="calendar"` and its `data-part`, accepts a `render` prop (D25), and carries no styles (D9). Model props (`week`, `day`, `column`, `segment`, `event`) come from the view model the consumer loops over (D10).

**Shared**

| Part                                      | Role                                                                                                  | Owns |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---- |
| `Calendar_Root` / `Calendar_RootProvider` | Provides the instance; `Root` creates it from props, `RootProvider` takes one from `useCalendar` (D6) | —    |

**Day grid** (`kind: 'dayGrid'`)

| Part                                            | Role                                                                                                                                                       | Owns |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `DayGridView_Root`                              | Receives the day-grid model; `role="grid"`                                                                                                                 | —    |
| `DayGridView_Header` / `DayGridView_HeaderCell` | Weekday header row                                                                                                                                         | —    |
| `DayGridView_Week`                              | One week row; `role="row"`; sets `--cal-rows`                                                                                                              | —    |
| `DayGridView_Day`                               | One day cell; `role="gridcell"`, `data-today`, `data-outside`                                                                                              | —    |
| `DayGridView_DayTrigger`                        | Button to go to the day (app R8.1)                                                                                                                         | —    |
| `DayGridView_WeekBackgroundEvent`               | An all-day background event across the week row, under the bars; `--cal-col-start`, `--cal-col-span`, `data-continues-before/after`; `aria-hidden` (D37)   | —    |
| `DayGridView_WeekEvent`                         | A bar in the week row; `--cal-col-start`, `--cal-col-span`, `--cal-row`, `data-continues-before/after`; button (D17)                                       | —    |
| `DayGridView_Overflow`                          | "See all" button inside a day; renders when `day.hasMore` (local hidden rows or the `dayOverflow` hint); `data-hidden-count` is the local count (D14, D17) | —    |

**Time grid** (`kind: 'timeGrid'`; days and resource columns, D4)

| Part                                                | Role                                                                                               | Owns |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---- |
| `TimeGridView_Root`                                 | Receives the time-grid model; labelled region                                                      | —    |
| `TimeGridView_Header` / `TimeGridView_ColumnHeader` | Column headers (date, or resource with `data-unavailable`)                                         | —    |
| `TimeGridView_ColumnTrigger`                        | Button inside a date header to go to the day (app R8.1)                                            | —    |
| `TimeGridView_AllDay` / `TimeGridView_AllDayCell`   | All-day row and its per-column cells; omitted by views with `allDay: false`                        | —    |
| `TimeGridView_AllDayBackgroundEvent`                | An all-day background event across every row of the all-day section (D37)                          | —    |
| `TimeGridView_AllDayEvent`                          | A bar in the all-day row, spanning columns (D17)                                                   | —    |
| `TimeGridView_Body`                                 | Scrollable body; sets `--cal-slots`                                                                | —    |
| `TimeGridView_Axis` / `TimeGridView_AxisLabel`      | Slot labels                                                                                        | —    |
| `TimeGridView_Column`                               | One day or resource column                                                                         | —    |
| `TimeGridView_BackgroundEvent`                      | Shaded segment from a background event; `--cal-start/span` (D37)                                   | —    |
| `TimeGridView_Unavailable`                          | Shaded segment from availability (D12)                                                             | —    |
| `TimeGridView_Event`                                | Positioned event; `--cal-start/span/lane/lanes/inline-start/inline-size` (D38); `data-short` (D39) | —    |
| `TimeGridView_NowIndicator`                         | Renders only in today's column (D11)                                                               | —    |

**List** (`kind: 'list'`)

| Part                                  | Role                                            | Owns |
| ------------------------------------- | ----------------------------------------------- | ---- |
| `ListView_Root`                       | Receives the list model; labelled region        | —    |
| `ListView_Day` / `ListView_DayHeader` | One day that has events, and its heading        | —    |
| `ListView_Event`                      | One event row; button                           | —    |
| `ListView_Empty`                      | Renders only when the range has no events (D18) | —    |

**Timeline** (`kind: 'timeline'`; D34, named after D30)

| Part                                               | Role                                                                                                      | Owns |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---- |
| `TimelineView`                                     | Receives the timeline model; labelled region; sets `--cal-slots`, `--cal-min-slot-width`                  | —    |
| `TimelineViewHeader`                               | Day and slot header rows                                                                                  | —    |
| `TimelineViewDayHeader` / `TimelineViewDayTrigger` | One day over its slots (`--cal-col-start`, `--cal-col-span`, `data-today`); button to go to the day (D22) | —    |
| `TimelineViewSlotLabel`                            | One slot label (`--cal-col-start`)                                                                        | —    |
| `TimelineViewBody`                                 | The rows; positions the now indicator                                                                     | —    |
| `TimelineViewRow`                                  | One resource, or the single row without resources; `--cal-rows`, `data-unavailable`                       | —    |
| `TimelineViewResource`                             | The row's resource cell                                                                                   | —    |
| `TimelineViewLane`                                 | The row's track, which positions events and shading                                                       | —    |
| `TimelineViewEvent`                                | A bar; `--cal-start`, `--cal-span`, `--cal-row`, `data-all-day`, `data-continues-before/after`; button    | —    |
| `TimelineViewUnavailable`                          | Shaded segment from availability (D12)                                                                    | —    |
| `TimelineViewNowIndicator`                         | Renders only when now is in the range (D11)                                                               | —    |

## State

The core owns no navigation or event state (D2, D5). Following oxform (D24), it keeps `options` as a plain value, a `persisted` store with the tracked inputs and `now` (D11), and a derived `store`. `useCalendar` creates the instance once, calls `'~mount'` once and `'~update'(options)` after every render through an isomorphic layout effect; `useCalendarSelector` reads slices through `useSelector`.

```ts
type Calendar_Options<TData, TResourceData, TViews extends Record<string, Calendar_ViewDefinition>> = {
  timeZone: string;
  locale?: string; // aria-label defaults only (D20)
  views: TViews; // D4
  view: keyof TViews & string; // controlled (D5)
  date: Temporal.PlainDate; // controlled (D5, D7)
  onNavigate: (next: Calendar_Navigation<TViews>) => void;
  events: Calendar_EventInput<TData>[]; // D2, D7, D8
  resources?: Calendar_Resource<TResourceData>[]; // D12
  eventOrder?: (a: Calendar_Event<TData>, b: Calendar_Event<TData>, context: Calendar_ViewContext<TViews>) => number; // D16
  firstDayOfWeek?: 1 | 2 | 3 | 4 | 5 | 6 | 7; // ISO; 7 = Sunday
  clock?: Calendar_Clock; // D11
  initialNow?: Temporal.Instant; // first derivation only, for hydration (D27)
};

type Calendar_Navigation<TViews> = {
  view: keyof TViews & string;
  date: Temporal.PlainDate;
  range: { start: Temporal.PlainDate; end: Temporal.PlainDate }; // visible, including padding days
  period: { start: Temporal.PlainDate; end: Temporal.PlainDate }; // nominal day, week or month
};

type Calendar_State<TData, TResourceData, TViews> = {
  context: Calendar_ViewContext<TViews>; // { view, kind, date, range, period }
  layout: Calendar_DayGridLayout<TData> | Calendar_TimeGridLayout<TData, TResourceData> | Calendar_ListLayout<TData>; // D10
  now: Temporal.ZonedDateTime;
};

type Calendar_Api<TViews> = {
  next: () => void; // all actions emit onNavigate only (D5)
  prev: () => void;
  today: () => void;
  goTo: (date: Temporal.PlainDate) => void;
  setView: (view: keyof TViews & string, date?: Temporal.PlainDate) => void; // shorthand for navigate
  navigate: (next: { view?: keyof TViews & string; date?: Temporal.PlainDate }) => void; // one emission per intent; calls do not compose (D5)
};

// Pure helper so the app can compute the fetch range for any view/date without an instance (app R2.5)
declare const calendar_navigation: <TViews>(
  views: TViews,
  view: keyof TViews,
  date: Temporal.PlainDate,
  options: { firstDayOfWeek?: number },
) => Calendar_Navigation<TViews>;
```

### State chart

The instance lifecycle. View and date never change inside the core: an action emits `onNavigate`, and the change arrives back as `setOptions`.

```mermaid
stateDiagram-v2
  [*] --> Created: calendar_create
  Created --> Mounted: mount / start clock
  Mounted --> Mounted: setOptions / re-derive layout
  Mounted --> Mounted: clock tick / re-derive now
  Mounted --> Mounted: action / emit onNavigate, no write
  Mounted --> Unmounted: unmount / stop clock
  Unmounted --> Mounted: mount
```

## Variants

Variation is expressed through view definitions (D4), never booleans on parts:

- `dayGridView({ period: 'month', maxEventsPerDay, dayOverflow?, fixedWeekCount? })` or `dayGridView({ weeks, maxEventsPerDay, dayOverflow? })`: a calendar month padded to whole weeks, or whole weeks from the week containing `date` (D35, D43). Only the month form accepts `fixedWeekCount`.
- `timeGridView({ days, groupBy?: 'resource', groupOrder?: 'resource-first' | 'date-first', allDay?, slotDuration?, minColumnWidth?, overlap?: 'side-by-side' | 'cascade', minEventMinutes?, shortEventMinutes? })`: day, week and resource views (D4, D19, D38, D39). `minColumnWidth` is emitted as `--cal-min-column-width` for the consumer's CSS (C11, D9).
- `listView({ days })` or `listView({ period: 'month' | 'year' })`: list day and list week, or a calendar month or year (D18, D36).
- `timelineView({ days, groupBy?: 'resource', slotMinutes?, minSlotWidth? })`: day, week and resource timelines (D34). `minSlotWidth` is emitted as `--cal-min-slot-width`.

## Props boundary

- **`calendar_create` / `useCalendar` / `Calendar_Root`:** the options above. Everything else is derived.
- **View roots** (`DayGridView_Root`, `TimeGridView_Root`, `ListView_Root`): `model`, the narrowed layout from the switch (D10).
- **Model parts** (`*_Week`, `*_Day`, `*_Column`, `*_Event`, `*_WeekEvent`, `*_AllDayEvent`, `*_Unavailable`, `*_AxisLabel`, `*_DayHeader`): one model prop (`week`, `day`, `column`, `segment`, `slot`) plus native element props and `render` (D25). They emit geometry and state attributes (D9) and no text unless children provide it (D20).
- **Triggers** (`DayGridView_DayTrigger`, `TimeGridView_ColumnTrigger`): `day`/`column` plus a typed `view` (D22).
- **`DayGridView_Overflow`:** `day`; renders when `day.hasMore` (D14, D17).
- **Managed events:** `eventStore_create<TData>()` / `useEventStore<TData>()` → `{ store, add, remove, update, reset }` (D2).

## Edge states & interactions

- **Keyboard and focus:** native buttons, DOM tab order, no roving focus (D15).
- **Overflow:** trigger plus data; the popover and async fill are the app's (D14).
- **Empty:** the month grid always renders its weeks; an empty resource grid has `columns.length === 0` and an empty list has `days.length === 0`, rendered by the consumer or `ListView_Empty` (D18, D23).
- **Loading:** app-owned (D23).
- **Time zone and DST:** layout runs in `timeZone` (D7). D40 keeps a fixed 24-hour clock axis on DST days.

## Decision log

### D1 — The core computes the full view model

**Serves:** constraint (framework-agnostic core); C1, C4, C6, C7, C8, C9

**Verified:** not verified — rewritten after a `reject`; re-run the panel

**Why:** The constraint is a framework-agnostic core. Layout (overlap lanes, row packing and caps, availability segments, time zone placement) is what makes this a calendar rather than a date stepper, so it belongs in the core as derived stores; if it lived in the adapter, the "core" would be navigation arithmetic and every future adapter would re-implement the calendar. These algorithms are new code, not a port: today's app hands FullCalendar `businessHours` objects and ordering comparators written to FullCalendar's semantics, and FullCalendar does the layout. Because the view model is public surface, `layout` is an open union. Consumers are documented to switch with `.otherwise()` rather than `.exhaustive()`, so adding a layout kind is not a breaking change. Revisit if a target framework needs layout tied to measured DOM sizes.

### D2 — Events are input with unique ids; managed event state is an opt-in helper

**Serves:** C5, C6, C12; app R4.5, R6.2, R10.3, R11

**Verified:** not verified — rewritten after an `escalate`; re-run the panel

**Why:** Apollo already owns fetched entries, so the calendar takes `events` and `resources` as input and only derives from them; "see all" results and drafts become array merges in the app, and "drafts only while editing" becomes a filter. The core does not de-duplicate: unique ids are a documented precondition of the `events` input. A duplicate id is a consumer bug, and the core reports it with a development-only warning. De-duplication is the job of whoever builds the array. In our app that is the "see all" merge (union by id with the day's entries, replacing today's `getEventById` filter in `calendar-api.tsx`). In the managed store, `add` upserts by id. The managed store (`eventStore_create` / `useEventStore`) ships for consumers without their own cache (Storybook, tests, standalone widgets). It is not meant to mirror Apollo: syncing query results into it would need an effect. No app requirement needs the store, so it stays small (`add`, `remove`, `update`, `reset`) and can be dropped without touching the calendar.

### D3 — A shared root plus one part family per view

**Serves:** C1, C5, C6, C7, C10

**Verified:** not verified — cheap to reverse or additive later

**Why:** A month cell (cap plus overflow), a time-grid column (slots, lanes, shading) and a list row have different anatomies. One generic part set would need mode switches inside its parts. Separate families (`DayGridView_*`, `TimeGridView_*`, `ListView_*`) under a common `Calendar_Root` keep each anatomy explicit, and consumers loop over core data inside the parts, Ark style. The cost is more exports, about 6–8 per view.

### D4 — Views are composable definitions over layout kinds

**Serves:** C1, C7, C11; app R1.1–R1.4, R2.1

**Verified:** not verified — cheap to reverse or additive later

**Why:** The original layouts were month, time grid and list. Duration and grouping are settings on them, not new views. Consumers register named views (`week: timeGridView({ days: 7 })`, `resources: timeGridView({ days: 1, groupBy: 'resource' })`), so the app's own keys (`list_week`) map one to one onto the URL `view_type`, and a weekly resource view (app Q4) needs no library change. Revisit if a fourth layout appears (for example, a timeline) that does not fit `days` plus `groupBy`. **Amended by D34:** the timeline is that fourth layout. **Amended by D35:** the month builder also serves week-based day grids. **Amended by D43:** one day-grid factory and layout cover calendar months and whole weeks.

### D5 — View and date are controlled only; navigation is one call per intent

**Serves:** C2, C3; app R2.1–R2.4, R3.2, R8.1

**Verified:** not verified — rewritten after a `reject`; re-run the panel

**Why:** Today FullCalendar owns view and date, and the URL only seeds and mirrors it (`initialView`/`initialDate`, then `datesSet` writes back). This design deliberately reverses that: the URL drives the calendar, so `view` and `date` are required inputs and the core never writes them. Every action emits `onNavigate({ view, date, range, period })` computed from the current controlled values. Because the values only change when `setOptions` comes back, two actions in one tick do not compose. Changing view and date together is therefore one call, `api.navigate({ view, date })` (with `setView(view, date)` as shorthand), and back-to-back calls are documented as last-wins. The two existing call sites (`FullCalendar_LinkToDay`, the header date picker) are rewritten as part of the migration. Pending composition inside the core was not chosen because it reintroduces core-held state that can drift from the app. Revisit if many consumers turn out to be stateless widgets.

### D6 — React offers both `Calendar_Root` and `Calendar_RootProvider`

**Serves:** C2, C3

**Verified:** not verified — cheap to reverse or additive later

**Why:** It is the pair Ark uses everywhere, so the codebase already knows it. Our page needs `useCalendar` plus `Calendar_RootProvider`, because the header, drawer and schedulers drive the calendar from outside the grid (today's `getApi` context). `Calendar_Root` takes the same options as props, `view`/`date` included per D5, for cases where nothing outside the grid needs the instance.

### D7 — Strict Temporal types, one conversion point, everything laid out in `timeZone`

**Serves:** C8; app R4.4, R5.4

**Verified:** not verified — rewritten after a `reject`; re-run the panel

**Why:** The input types make the timed/all-day split explicit. Timed events are `ZonedDateTime`. All-day events are a separate `PlainDate` shape, so no all-day event can be faked as a timed one; today `build-apc-event.ts` encodes all-day availability as `date + 1 minute`, while `build-apc-events-from-availability.ts` emits all-day events with real start times. The controlled `date` is a `PlainDate`. Time zone rules: the core converts every timed input with `withTimeZone(timeZone)` before layout; "now" and "today" resolve in `timeZone`; every time in the view model is in `timeZone`; the host zone is never read. String parsing stays at the app edge, in one mapper from API values. The rationale is the explicit shape plus a single conversion point, not a claim that strict input reduces bugs by itself. D40 settles the DST axis as fixed 24-hour clock time.

**Amended:** both shapes carry an explicit discriminant, `kind: 'timed'` or `kind: 'allDay'`, so `event.kind` narrows the union. Before, only all-day events had a field (`allDay: true`) and narrowing needed `'allDay' in event`. A string `kind` was chosen over a required `allDay: boolean` because it reads as a tag rather than a flag, matches the layout models' `kind`, and leaves room for another shape without a second boolean. Values are camelCase like the layout kinds (`'timeGrid'`).

### D8 — Events carry a generic `data: TData` payload

**Serves:** C5; app R5.1–R5.8

**Verified:** not verified — cheap to reverse or additive later

**Why:** The type parameter is inferred from `useCalendar<TData>` / `calendar_create<TData>` and flows into parts, the order comparator and the hidden predicate. That removes today's `as unknown as CalendarEventInput` casts in `calendar.tsx` and the comparators. The cost is a generic threaded through the core and every React part.

### D9 — Geometry is emitted as CSS custom properties and data attributes

**Serves:** C4, C7, C9, C11

**Verified:** not verified — cheap to reverse or additive later

**Why:** Parts set only fractional geometry (`--cal-start`, `--cal-span`, `--cal-lane`, `--cal-lanes`) and state attributes (`data-overlap`, `data-unavailable`, `data-today`, `data-outside`), never visual or layout styles. Consumers keep control of units, row height and scrolling (C11), and Tailwind can read the variables through arbitrary values. The same numbers are also on the view-model objects for non-DOM use. A reference stylesheet ships in Storybook docs so the roughly 20 lines of positioning CSS are not rediscovered per consumer.

### D10 — The consumer switches on the layout kind and passes the model into the view root

**Serves:** C1; app R1.1–R1.4

**Verified:** not verified — cheap to reverse or additive later

**Why:** The active view is explicit in consumer code: `useCalendarSelector(s => s.layout)` returns a union discriminated by `kind`, the consumer matches on it, and passes the narrowed model to `DayGridView_Root model={…}` / `TimeGridView_Root` / `ListView_Root`. Parts below a root read the model from that root's context. There are no render-function `*_Context` parts and no self-gating roots, so what renders is visible at the call site and type narrowing happens where the switch is written. The cost is that every consumer writes the switch, which is a few lines with `ts-pattern`. Revisit if many consumers end up with an identical switch.

### D11 — "Now" comes from an injectable clock

**Serves:** C9; app R1.5

**Verified:** not verified — cheap to reverse or additive later

**Why:** "Now" feeds core-derived state (`data-today`, the now-indicator offset), so it is a core input, not something a part owns. `clock_interval({ every })` ticks in the app; `clock_fixed(instant)` makes tests and stories deterministic. The clock starts and stops with the TanStack Store mount/unmount, which `useCalendar` drives, so there is no extra lifecycle API.

### D12 — Resource availability is absolute intervals

**Serves:** C7; app R7.1, Q4

**Verified:** not verified — cheap to reverse or additive later

**Why:** The backend already sends absolute periods. Each resource takes `availability: { start, end }[]` as `ZonedDateTime`s; the core clips the intervals to each column's day and emits the complement as `column.unavailable` segments, and an empty list shades the whole column. This replaces today's conversion to weekly business hours in `calendar.store.ts`, with its day-of-week trick, the `'23:59:99'` midnight hack and the TODO about weekly resource views. Periods crossing midnight split naturally. Recurring office hours, if ever needed, are expanded to intervals by the app.

### D13 — The time grid has structural parts only

**Serves:** C4, C7, C9; app R1.2, R1.5, R7.1

**Verified:** not verified — cheap to reverse or additive later

**Why:** The parts are header, column header, all-day row and cell, body, axis and axis label, column, event, unavailable segment and now indicator. There are no per-slot parts: date selection and empty-slot clicks are out of scope, and a resource day of 30-minute slots across 20 columns would add about 960 inert elements. Slot lines are a repeating CSS background built from `--cal-slots` (D9). Adding a `TimeGridView_Slot` later is non-breaking.

### D14 — Overflow is a trigger plus data; the popover belongs to the consumer

**Serves:** C6; app R6.1, R6.2

**Verified:** not verified — cheap to reverse or additive later

**Why:** `DayGridView_Overflow` is a button carrying `data-hidden-count` that can be composed with the design system's `PopoverTrigger` through `render` (D25). The day model exposes both `visible` and `events`, so the popover renders `day.events`. Lazy fill needs no library support under D2: the app fetches on open, merges into the `events` input, `day.events` grows, and the open popover re-renders. A library popover would duplicate positioning and focus handling the design system already has.

### D15 — v1 accessibility is semantic without roving focus

**Serves:** C10; app R8.1, R8.2

**Verified:** not verified — cheap to reverse or additive later

**Why:** Day triggers, events and overflow render as native buttons with accessible labels (for example "Go to Saturday, 14 March 2026"); the month root uses `grid`/`row`/`gridcell`, and the time grid and list are labelled regions. Tab order follows the DOM. The app spec has no keyboard requirement and today's FullCalendar setup is buttons only, so this is parity with better semantics. Full grid navigation would put focus state in the core, which per D5 would have to be another controlled value (`focusedDate`); that remains a non-breaking addition.

### D16 — `eventOrder` is a core option that receives the view context; hiding is filtering the input

**Serves:** C5, C6; app R5.6, R5.8, R6.1

**Verified:** not verified — cheap to reverse or additive later

**Why:** Order decides which events take the first rows of a month cell and how lanes and bars are packed, so it must run inside the core: `eventOrder(a, b, context)`. `context` is a read-only snapshot of the active view (`{ view, kind, date, range, period }`), because ordering can depend on it (today's `fullCalendar_sortEvents` takes the view type). It is a snapshot rather than the calendar `api`: the comparator runs during derivation, and calling a navigation action from inside it would emit `onNavigate` mid-render. Hiding (app R5.8) needs no option: under D2 the app filters the `events` input.

### D17 — Multi-day and overnight events render as spanning bars; the app can hint overflow per day

**Serves:** C4, C5, C6; app R4.2, R5.4, R6.1

**Verified:** not verified — rewritten after a `reject`; re-run the panel

**Why:** In the month view and the time grid's all-day row, an event spanning days is one bar across the day columns, placed by row packing, clipped at week boundaries and marked `data-continues-before`/`data-continues-after`. Bars belong to the week row (`DayGridView_WeekEvent` with `--cal-col-start`, `--cal-col-span`, `--cal-row`). The cap counts rows: rows beyond `maxEventsPerDay` are hidden, and each day's local `hiddenCount` counts the hidden segments that cross it. A bar counts toward every day it crosses. The core cannot know about entries the API truncated (app R4.2 sends at most 5 per day), so the month view takes an optional `dayOverflow(date) => boolean` hint. When the hint is true, the day reports `hasMore: true` and renders `DayGridView_Overflow` even when nothing is hidden locally; `hiddenCount` stays the local count and is not the true total. In time-grid columns a timed overnight event splits at midnight; in a single-day view this is the same as clipping. Known cost: a bar packed into a hidden row can hide an event on a day that still has free rows (recorded risk). The verification found no multi-day events in today's data, only overnight ones, so bars mainly pay off for future data.

### D18 — The list view shows only days with events, plus an explicit empty part

**Serves:** C1; app R1.3, R5.5

**Verified:** not verified — cheap to reverse or additive later

**Why:** This matches today's mobile list, which is FullCalendar's list behaviour. `ListView_Empty` renders only when the range has no events, so the empty case is a part rather than a boolean. Showing every day in the range is a later `listView({ showEmptyDays: true })` setting if a planning UI needs it.

### D19 — Resource grouping order is a view setting, resource-first by default

**Serves:** C7; app Q4

**Verified:** not verified — cheap to reverse or additive later

**Why:** `timeGridView({ days, groupBy: 'resource', groupOrder })` takes `'resource-first'` (default) or `'date-first'`. Resource-first is the only order where one resource's days are adjacent, so a multi-day bar (D17) stays one bar per resource. Date-first is the familiar "who is busy on Tuesday" layout, so it stays available, with bars split per day. Both are the same for today's single-day resource view; the setting matters only once a weekly resource view exists.

### D20 — The consumer formats all visible text; the core emits Temporal values

**Serves:** C1, C4, C10; app R1.2, R3.1

**Verified:** not verified — cheap to reverse or additive later

**Why:** The library is headless down to text: slot times, day numbers, weekday names and titles are Temporal values on the model, formatted by the app through `tempo`, which keeps quirks like `omitZeroMinute` and the header title logic app-side. The single exception is accessible labels (D15): parts need default text, so they use `Intl.DateTimeFormat` with a `locale` option, and consumers can override it through `aria-label`.

### D21 — The library lives in `lib/calendar/core` and `lib/calendar/react`

**Serves:** constraint (framework-agnostic core)

**Verified:** not verified — cheap to reverse or additive later

**Why:** `lib/` already holds framework-level modules (apollo, posthog, query-params), and the repo has no workspaces, so a package would add build tooling before there is a second consumer. A lint boundary enforces extractability: `core` may not import `react`, `lib/calendar/react` or app aliases (`~/…`), and `react` may import only `core`'s public entry. Revisit when a second app needs it.

### D22 — Day and column triggers navigate on their own, to a typed view key

**Serves:** C10; app R8.1

**Verified:** not verified — cheap to reverse or additive later

**Why:** Navigating is a trigger's whole job, and Ark's triggers act on their own too. `DayGridView_DayTrigger` and `TimeGridView_ColumnTrigger` take `view`, typed to the keys of the registered `views`, and on click call `api.setView(view, date)`, which emits `onNavigate` (D5). A consumer `onClick` runs first, and `event.preventDefault()` skips the built-in action. A renamed view breaks at compile time. Events and the overflow trigger stay action-free, because what they do is app logic (D14, app R8.2).

### D23 — The library has no loading concept; empty is data

**Serves:** C1, C7; app R3.11, R7.4

**Verified:** not verified — cheap to reverse or additive later

**Why:** Loading belongs to the app's queries (today, a header spinner). Emptiness is readable from the model: `grid.columns.length === 0` for a resource view with no resources, `list.days.length === 0` (with `ListView_Empty`, D18). Under D10's switch the consumer renders its own empty state, for example today's `CalendarResourcesEmptyState`. A `loading` input would be state the core passes through without using.

### D24 — Options sync and derived state follow oxform

**Serves:** constraint (TanStack Store core); C2, C3; D5

**Verified:** not verified — cheap to reverse inside the adapter

**Why:** The user asked to match oxform (`packages/core/src/form/form-core.ts`, `packages/react/src/use-form.ts`). The instance keeps `options` as a plain value, a writable `persisted` store holding only the **tracked** inputs (`timeZone`, `views`, `view`, `date`, `events`, `resources`, `firstDayOfWeek`, plus `now` from the clock), and a derived `store = createStore(() => …)` that reads `persisted.state`. The adapter hooks are internal, tilde-prefixed methods: `'~mount'` starts the clock and returns its cleanup; `'~update'(options)` replaces `options` and writes `persisted` only when a tracked input changed (references, plus `PlainDate.equals` and `Instant.equals`), so re-rendering with equal options costs nothing. React mirrors `useForm`: `useState(() => calendar_create(options))`, `useIsomorphicLayoutEffect(instance['~mount'], [instance])`, `useIsomorphicLayoutEffect(() => instance['~update'](options))`, and `useSelector(instance.store, selector)` for reads. Two consequences: tracked inputs are compared by reference, so `events`, `resources` and `views` must be referentially stable (memoised) or the layout re-derives on every render; and untracked options (`eventOrder`, `onNavigate`, `clock`, a view's `dayOverflow`) are read at derivation or call time, so changing them alone does not re-derive.

### D25 — Parts render through a local port of Ark v6's factory, with `render` and no `mergeProps`

**Serves:** D3, D9

**Verified:** not verified — cheap to reverse

**Why:** Ark's v6 direction (chakra-ui/ark#3616, closed in favour of discussion #3997; branch `v6`, `packages/react/src/components/factory.ts`) deprecates `asChild` in favour of `render`: it makes what is rendered explicit, drops the single-child limitation, and avoids `data-scope`/`data-part` clashes when composing with another library's part. Installed Ark (5.17) predates it and `6.0.0-next.0` is only a prerelease, so the library ports v6's `withRender` locally as `cal.*` (`cal.div`, `cal.button`, …): `memo` + `forwardRef` per tag, a `state` prop the part sets and the `render` function receives, Radix-style `getRef` plus ref composition, and the same branches. With no `render` the default element renders. A function `render(props, state)` applies the props itself and only the ref is composed. An element `render={<El />}` has the part's props merged into it, with element props winning. `asChild` is not ported, since nothing depends on it. Ark merges with `@zag-js/core`'s `mergeProps`; this port does not use it. A local `props_merge` keeps the same contract (handlers called in source order, `className` joined, `style` shallow-merged, later values win), so the library has no Zag dependency. Each part is a `forwardRef` component that builds its own props, merges the consumer's on top with `props_merge`, and renders `<cal.x {...merged} state={model} ref={ref} />`. Trigger actions are merged last so a consumer `onClick` calling `preventDefault()` skips them. One consequence: handlers on a `render` **element** run after the part's, so they cannot prevent the built-in action; pass `onClick` on the part instead.

### D26 — Themes ship as plain CSS in `@calendar-tsx/themes`: a positioning base plus one file per theme

**Serves:** D9; C4, C9, C11

**Verified:** not verified — cheap to reverse; the package is additive and experimental

**Why:** Parts already expose everything a stylesheet needs: `data-scope`/`data-part`, state attributes and `--cal-*` geometry (D9). So a theme needs no JavaScript and no adapter, and any future adapter that emits the same attributes gets it for free. `base.css` turns the geometry into layout (absolutely positioned day-grid bars, time-grid lanes, the now line, and a subgrid that shares one set of columns across the header, all-day row and body). It is theme-independent, so every theme imports it, and a consumer styling the calendar themselves can import it alone. This replaces D9's plan of a reference stylesheet in Storybook docs. `default.css` adds the visual layer. Both live in cascade layers (`calendar.base`, `calendar.theme`) and select through `:where()`, so unlayered consumer styles win without specificity fights. Layered frameworks place the theme by layer: Tailwind v4 imports it with `layer(components)`, between its preflight (which would otherwise reset the parts' buttons) and its utilities, which then override it. Tailwind v3 is unsupported, because its preflight is unlayered and beats the theme. Theme values are `--calendar-*` tokens: a separate prefix, because the parts own `--cal-*` geometry inline. The default theme declares them on `:root`, so overriding one on any ancestor re-themes everything below it. Colours use `light-dark()` and follow the inherited `color-scheme`: the theme never sets it, so an app opts in to dark mode with `color-scheme: light dark` and forces a mode with `light` or `dark` on any ancestor. The package ships the CSS sources with no build step. Rejected: CSS inside `@calendar-tsx/react` (it would make themes React-only and grow the adapter with each theme); CSS-in-JS (needs a build step or runtime, at odds with a headless library); a Tailwind preset (ties themes to Tailwind, though one could map onto the same tokens later); a single file per theme with no base (each theme would repeat the positioning). Known limits: the base assumes the composition the readmes show (a header, an optional all-day row and a body inside the time-grid root); the all-day row scrolls with the body rather than sticking under the header; and day-grid bars default to 22px, below a 44px touch target (`--calendar-bar-height` raises it).

Themes vary along two axes that combine. A look (`default.css`, `shadcn.css`) sets colours and shapes in `calendar.theme`; a density (`compact.css`) sets only size tokens in a third layer, `calendar.density`, so it applies on top of any look. `shadcn.css` is an adopting theme: it adds no rules and points the tokens at shadcn/ui's variables. Its events come from the default theme's accent tint rather than `--secondary`: in shadcn's neutral palette `--secondary`, `--muted` and `--accent` all sit at 1.09:1 against the light background. It declares that mapping on `:root` and on `.dark`, because a custom property resolves its `var()` where it is declared and would otherwise miss a `.dark` below the root. For the same reason, a token whose default is another token (`--calendar-event`, `--calendar-event-border`, `--calendar-event-text`, `--calendar-focus-ring`) is never declared by the default theme and falls back at the point of use. Events default to the accent tinted 16% (fill) and 24% (border) into the surface, so `--calendar-accent` alone recolors the calendar, as FullCalendar's palette `primary` does, without a palette file per colour; the percentages keep the old neutral fill's separation from the surface (1.26:1) and text above 12:1 in both modes. `revenuecat.css` is a brand look in RevenueCat's press-kit colors; it keeps the exact brand red, which is 3.39:1 on white, to fills and lines, and overrides the one default rule that sets small text in the accent. `stripe.css` takes its colours from the public `--hds-color-*` tokens on stripe.com and leaves events to the accent tint; Stripe's Marks Usage Terms cover design elements and trade dress, so shipping it under Stripe's name is a decision to revisit before publishing. `material-ui.css` is the same kind of adopting theme over the variables Material UI emits with `cssVariables: true` (`--mui-palette-*`, `--mui-shape-borderRadius`); it repeats its mapping on each of MUI's built-in color-scheme selectors (`.light`/`.dark`, `[data-light]`/`[data-dark]`, `[data-mui-color-scheme]`) for the same reason, maps `--calendar-surface-muted` to MUI's translucent `action.hover`, which always sits on the opaque surface, and leaves events to the accent tint. `high-contrast.css` is an opt-in look at WCAG AAA: outlined events, 2px event borders, 3px focus rings, and dashed edges for continuation instead of a flattened corner. It is separate from forced colours, where the browser picks the colours. Under `forced-colors: active` the browser drops fills, so the default theme restores the state that only a fill carried (today's marker, the now line, slot lines, unavailable time, outside-month dates) with system colours. It opts out of forced colours only on leaf elements, because `forced-color-adjust` inherits and would otherwise reach the events.

### D27 — Server rendering: a seeded first "now" and a client-module entry

**Serves:** D11, D24; C9, C10

**Verified:** not verified — additive; cheap to reverse

**Why:** The parts already render on the server: effects are skipped, `useSelector` passes its snapshot as the server snapshot, and layout never reads the host zone (D7). What breaks is hydration. `calendar_create` read the clock when it was created, so the server and the client derived different "now" values: `--cal-now` on the now indicator never matched, and near midnight `data-today` moved to another column. `initialNow?: Temporal.Instant` is the instant used for the first derivation. The app picks it once per request, serialises it (`instant.toString()`), and passes the same value on both sides. `'~mount'` already ticks the clock straight away, so the client moves to the real "now" right after hydration. The option is read once at creation and is not tracked. The React entry starts with `'use client'` (a build banner), so React Server Components can import the parts. The options themselves (`Temporal` values, `views`, `onNavigate`) cannot cross the server/client boundary as props, so the calendar lives in a client component that parses strings. Rejected: rendering the now indicator and `isToday` only after mount, because the server HTML would lose the now line and `data-today` would still move at midnight; asking apps to pass `calendarClock_fixed` on the server, because the client still needs the same instant, which is `initialNow` with worse ergonomics. Known gap: the hydration test runs the server render in the browser, so ICU differences between Node and the browser in the default accessible labels (D20) are not covered.

### D28 — View definitions carry their own navigation and layout builder; `layout` is inferred from `views` (superseded)

**Serves:** D1, D4, D10; C1

**Status:** superseded by D29, which implements its layout ownership and `layout` inference. Accepting it amends D1 (who can add a layout kind), D4 (the set of kinds), and the `Calendar_State` and `Calendar_ViewContext` types in [State](#state).

**Verified:** not verified — touches the public types; reversible while the packages are experimental

**Why:** Today the core decides how each kind of view behaves. `calendar_create` imports all three builders and picks one by `definition.kind` (`packages/core/src/calendar.ts:17-19`, `:79-96`). `calendar_navigation` and `calendarNavigation_step` branch on `kind` the same way (`packages/core/src/calendar-navigation.ts:34`, `:56`). This causes three problems:

- Every layout is bundled, even for a consumer that registers only list views.
- A fourth kind means editing the core. That includes the timeline that D4 names as its revisit trigger. D1 calls `layout` an open union, but nobody outside the core can add a member.
- `state.layout` is always the full three-way union, whatever `views` holds.

This is the shape TanStack Table v8 had. Its v9 rewrite moved to a "features" object the consumer passes in, so a feature is bundled and typed only when registered ([comparison](../reports/tanstack-table-comparison.md)).

The `views` record is already our equivalent of that object: its keys become typed literals (D22). So the proposal makes each view definition the unit of extension, with no separate feature registry:

- `calendarView_month(settings)` returns its `kind` and settings, plus four functions:
  - `period(date, { firstDayOfWeek })`, the nominal period around `date`;
  - `range(period, { firstDayOfWeek })`, the visible days, padding included;
  - `step(date, direction)`, the date one period before or after;
  - `build(input)`, the layout.
- `calendar_create` and `calendar_navigation` call these functions and contain no per-kind branches.
- The event pipeline (normalise, clip to `range`, sort with `eventOrder`) stays in the core, because every layout needs it (D16). `build` receives the result.

Types are where this gets hard. `build` must be generic in `TData` and `TResourceData`, because definitions are created before the calendar and know nothing about its data (D8). The return type of a generic function cannot be read back with a concrete `TData`, so `ReturnType` inference does not work. Instead, a kind-to-layout interface maps each kind to its layout type, applied to the calendar's own generics. `TViews` then selects from the map. This is v9's feature-map pattern (`Table_FeatureMap` keyed by feature name, filtered by `keyof TFeatures`):

```ts
/** Kind → layout. Third-party kinds extend it by declaration merging. */
interface Calendar_LayoutMap<TData, TResourceData> {
  month: Calendar_DayGridLayout<TData>;
  timeGrid: Calendar_TimeGridLayout<TData, TResourceData>;
  list: Calendar_ListLayout<TData>;
}

type Calendar_ViewKind = keyof Calendar_LayoutMap<unknown, unknown>;

type Calendar_LayoutInput<TData, TResourceData> = {
  range: Calendar_Range;
  period: Calendar_Range;
  /** Normalised to `timeZone`, clipped to `range`, sorted by `eventOrder`. */
  events: Calendar_Event<TData>[];
  resources: Calendar_Resource<TResourceData>[];
  timeZone: string;
  now: Temporal.ZonedDateTime;
};

type Calendar_ViewDefinition<TKind extends Calendar_ViewKind = Calendar_ViewKind> = {
  kind: TKind;
  period: (date: Temporal.PlainDate, options: { firstDayOfWeek: Calendar_FirstDayOfWeek }) => Calendar_Range;
  range: (period: Calendar_Range, options: { firstDayOfWeek: Calendar_FirstDayOfWeek }) => Calendar_Range;
  step: (date: Temporal.PlainDate, direction: 1 | -1) => Temporal.PlainDate;
  build: <TData, TResourceData>(
    input: Calendar_LayoutInput<TData, TResourceData>,
  ) => Calendar_LayoutMap<TData, TResourceData>[TKind];
};

type Calendar_Views = Record<string, Calendar_ViewDefinition>;

/** The kinds `views` actually registers; with the default `Calendar_Views`, every kind. */
type Calendar_ViewsKind<TViews extends Calendar_Views> = TViews[keyof TViews]['kind'];

type Calendar_LayoutOf<TData, TResourceData, TViews extends Calendar_Views> = Calendar_LayoutMap<
  TData,
  TResourceData
>[Calendar_ViewsKind<TViews>];

type Calendar_State<TData, TResourceData, TViews extends Calendar_Views> = {
  context: Calendar_ViewContext<TViews>; // `kind: Calendar_ViewsKind<TViews>`
  layout: Calendar_LayoutOf<TData, TResourceData, TViews>;
  now: Temporal.ZonedDateTime;
};

// The settings stay readable on the definition; `build` closes over them.
const calendarView_month = (
  settings: Calendar_DayGridViewSettings,
): Calendar_ViewDefinition<'month'> & Calendar_DayGridViewSettings => ({
  kind: 'dayGrid',
  ...settings,
  period: monthNavigation_period,
  range: monthNavigation_range,
  step: monthNavigation_step,
  build: input => layoutDayGrid_build({ settings, ...input, today: input.now.toPlainDate() }),
});
```

With `views: { list_day: calendarView_list({ days: 1 }), list_week: calendarView_list({ days: 7 }) }`, `state.layout` is `Calendar_ListLayout<TData>`. The D10 switch then needs no other branches, and `.otherwise()` is still the documented default.

Builders stay `layoutDayGrid_build` and the others, imported only by their own `calendarView_*` factory. A consumer that never calls `calendarView_month` therefore does not bundle the month layout. That also depends on the core entry being side-effect free, and on the export map. Neither is verified.

A third-party kind is a new factory plus one declaration merge into `Calendar_LayoutMap`. The merge is global, but it is keyed by kind and filtered by `TViews`. So the new layout only shows up in the types of calendars that register it, which matches v9 behaviour. The React view roots keep their concrete `model` types. A third-party kind brings its own parts (D3).

Consequences:

- View definitions hold functions and are no longer plain data. D24 already compares `views` by reference and requires it memoised, so the sync rule does not change.
- A hand-written definition literal (`{ kind: 'dayGrid', maxEventsPerDay: 4 }`) stops type-checking. The factories become the only supported way to create a definition.
- Week alignment moves out of the core into the `timeGrid` and `list` navigation functions. Today the core aligns a `days: 7` view to `firstDayOfWeek`.
- `useCalendarSelector` defaults `TViews` to `Calendar_Views`, which keeps the full union. Narrowing reaches consumers only when they pass `TViews` or read from a typed instance.

Rejected:

- **`ReturnType<TViews[K]['build']>`.** It loses `TData` because `build` is generic.
- **A higher-kinded "phantom type" carried on each definition.** It avoids declaration merging, but every kind author would need a type-level encoding the codebase does not use elsewhere.
- **A full feature map for state, options and APIs, as in v9 `features`.** No stateful feature is in scope, and it would reopen D5.
- **Leaving kinds closed and only narrowing `layout`.** That fixes the types but neither bundling nor extension.

### D29 — Functionality is added through a feature map; views declare the features they use

**Serves:** D1, D4, D10, D28; C1; future stateful features (D15's focus, drag, resize, selection)

**Status:** accepted and implemented (see **Implementation** at the end). Supersedes D28: it keeps D28's per-view layout ownership and `layout` inference, and adds features beyond layouts. Amends D1, D4, D5 (for feature state only), D24 and the [State](#state) types. It is a mechanism only. Drag and resize stay under "Not supported" until a separate decision moves them; drag appears below only as the worked example.

**Verified:** type sketch compiled with TypeScript 7.0.2 against stand-in types (checks listed at the end); runtime not prototyped

**Why:** D28 makes layouts pluggable, but anything that cuts across views has nowhere to go. That includes interaction state, options, actions, extra model fields and parts. TanStack Table hit the same limit and moved, in v9, to a `features` object that the consumer passes in. Each feature is bundled and typed only when registered ([comparison](../reports/tanstack-table-comparison.md)). This decision adopts that model, with three changes for a calendar:

- Layouts arrive with the views that use them.
- Features are constants, and all configuration lives in options.
- Each view declares which features it takes part in.

**Concepts**

- **Feature:** a constant object with no arguments. It can contribute:
  - state slices;
  - calendar options and per-view settings;
  - API;
  - an event-pipeline stage;
  - fields on the layout model.
- **Layout feature:** a feature that also supplies a view kind. It provides `kind`, `period`, `range`, `step` and `build`, plus optional capabilities such as `locate` (layout position → slot). Built in: `dayGridLayout`, `timeGridLayout`, `listLayout`.
- **Core features:** navigation, the event pipeline (normalise → clip → sort) and the clock. They are always on and never listed.
- **View:** plain settings plus `'~features'`, the features the view uses. Its factory adds the view's layout feature. A feature runs in a view only if that view lists it. A feature listed only in the calendar's `features` runs in every view.
- **`createCalendarViews(views)`:** returns `{ views, features }`, where `features` is the merge of every view's `'~features'`.

**Consumer**

```ts
// module scope, so references stay stable (D24)
const views = createCalendarViews({
  week: timeGridView({ days: 7, features: { eventDragFeature } }),
  day: timeGridView({ days: 1, features: { eventDragFeature }, drag: { snap: { minutes: 5 } } }),
  resources: timeGridView({ days: 1, groupBy: 'resource' }),
  list_week: listView({ days: 7 }),
});

const calendar = createCalendar<EventData>({
  views: views.views,
  features: { focusFeature, ...views.features },
  view,
  date,
  onNavigate,
  events,
  timeZone, // core, controlled only (D5)
  drag: { snap: { minutes: 15 } }, // calendar-wide setting from eventDragFeature
  onEventDrop: ({ event, slot }) => moveEntry(event.id, slot),
});

calendar.store.state.layout; // TimeGrid | List: the kinds the views register
calendar.api.drag.cancel(); // exists because eventDragFeature is registered
```

**Configuration.** Features take no arguments. Settings resolve for the active view as feature defaults, then calendar options, then view settings, with a shallow merge per layer. In the example, `week` snaps to 15 minutes, `day` to 5, and `resources` has no drag. Every view that lists a feature lists the same constant, so instances cannot conflict. Defaults shared by several views of one kind start as plain JS (`const timeGrid = s => timeGridView({ slotMinutes: 30, ...s })`). A calendar-level layout option is added only if consumers keep writing that wrapper.

**Replacing an implementation.** The calendar's `features` object is the source of truth at runtime. Views declare which keys they use and supply defaults; the calendar resolves each key from `options.features`. So spread order replaces one implementation everywhere: `{ ...views.features, eventDragFeature: myDrag }`. Types require the replacement to be assignable to the declared feature.

**Feature interface**

```ts
type Calendar_Feature = {
  /** State slices. Each resolves as options.atoms[key] ?? options.state[key] ?? an internal atom, as in v9. */
  getInitialState?: (initial) => Partial<Calendar_FeatureState>;
  getDefaultOptions?: (instance) => Partial<Calendar_FeatureOptions>;
  /** Merged onto `instance.api`. */
  constructApi?: (instance) => void;
  /** Runs after the core sort, in registration order, only in views that list the feature. */
  events?: { deps: (instance) => unknown[]; run: (events, instance) => typeof events };
  /** Adds the feature's model fields to the built layout, only in views that list the feature. */
  decorate?: { deps: (instance) => unknown[]; run: (layout, instance) => typeof layout };
};

type Calendar_LayoutFeature<TKind extends string, TSettings> = Calendar_Feature & {
  kind: TKind;
  period: (date, settings: TSettings, options) => Calendar_Range;
  range: (period, settings: TSettings, options) => Calendar_Range;
  step: (date, settings: TSettings, direction: 1 | -1) => Temporal.PlainDate;
  build: <TData, TResourceData>(input: Calendar_LayoutInput<TData, TResourceData>, settings: TSettings) => unknown;
  /** Capability that cross-cutting features call through stubs; a kind without it makes them no-ops. */
  locate?: (layout, point: Calendar_LayoutPoint) => Calendar_Slot | undefined;
};
```

**Types.** Contributions are typed through feature maps keyed by the feature's export name. Each map is filtered by the registered keys, as in v9. Third-party features extend the maps by declaration merging.

```ts
interface Calendar_Options_FeatureMap<TData> {
  eventDragFeature: { drag?: Calendar_DragSettings; onEventDrop: (drop: Calendar_Drop<TData>) => void };
}
interface Calendar_ViewSettings_FeatureMap { eventDragFeature: { drag?: Calendar_DragSettings } }
interface Calendar_State_FeatureMap { eventDragFeature: { drag: Calendar_DragState | null } }
interface Calendar_Api_FeatureMap { eventDragFeature: { drag: { start; move; nudge; drop; cancel } } }
interface Calendar_Segment_FeatureMap { eventDragFeature: { isDragging: boolean; isPreview: boolean } }
interface Calendar_Layout_FeatureMap<TData, TResourceData, TViewFeatures> {
  dayGridLayout: Calendar_DayGridLayout<TData, TViewFeatures>;
  timeGridLayout: Calendar_TimeGridLayout<TData, TResourceData, TViewFeatures>;
  listLayout: Calendar_ListLayout<TData, TViewFeatures>;
}

type Calendar_PickFeatures<TMap, TFeatures> = UnionToIntersectionOrEmpty<TMap[Extract<keyof TFeatures, keyof TMap>]>;

// Views: settings gain the per-view settings of the features they list.
// NoInfer is required: without it, views nested in createCalendarViews infer their features from the
// surrounding Record constraint, and a string index leaks into `keyof views.features`.
declare const timeGridView: <const TFeatures extends Calendar_Features = {}>(
  settings: Calendar_TimeGridSettings & { features?: TFeatures } & Calendar_PickFeatures<Calendar_ViewSettings_FeatureMap, TFeatures>,
) => Calendar_View<'timeGrid', …, NoInfer<TFeatures> & { timeGridLayout: typeof timeGridLayout }>;

type Calendar_FeaturesOf<TViews> = UnionToIntersection<TViews[keyof TViews]['~features']>;

// Layout: one entry per view, each shaped by that view's own features
type Calendar_Layout<TData, TResourceData, TViews> = {
  [K in keyof TViews]: Calendar_Layout_FeatureMap<TData, TResourceData, TViews[K]['~features']>[LayoutKeyOf<TViews[K]>];
}[keyof TViews];

// createCalendar: options and API from the registered features; `features` must cover every view's features
// with compatible implementations, or it becomes a template-literal error type.
type Calendar_Options<TData, TResourceData, TViews, TFeatures> = Calendar_CoreOptions<TData, TResourceData, TViews> &
  Calendar_PickFeatures<Calendar_Options_FeatureMap<TData>, TFeatures> & { features: ValidateFeatures<TViews, TFeatures> };
type Calendar_Api<TViews, TFeatures> = Calendar_CoreApi<TViews> & Calendar_PickFeatures<Calendar_Api_FeatureMap, TFeatures>;
```

**Runtime**

```ts
const features = { ...coreFeatures, ...options.features }; // keys resolved here, so replacements apply everywhere
for (const feature of Object.values(features)) {
  feature.getInitialState && registerAtoms(instance, feature.getInitialState(options.initialState));
  feature.constructApi?.(instance);
}

const store = createStore(() => {
  const view = options.views[options.view];
  const active = activeFeatures(features, view); // the view's '~features' plus calendar-only features
  const layout = active.layout;
  const { period, range } = navigate(layout, view, options);

  let events = coreEvents(input, range, options.eventOrder);
  for (const f of active.list) if (f.events) events = memo(f.events)(events, instance);

  let model = layout.build({ range, period, events, resources, timeZone, now }, view);
  for (const f of active.list) if (f.decorate) model = memo(f.decorate)(model, instance);

  return { context, layout: model, now, ...featureState(instance) };
});
```

**React.** `useCalendar(options)` is unchanged. `useCalendarSelector` cannot recover the feature types from context, so it takes the instance type: `useCalendarSelector<typeof calendar>(state => state.layout)`. Features that need parts ship them from their own entry point (for example `@calendar-tsx/react/event-drag`). They compose through `render` (D25) and read their API from context. View roots keep their concrete `model` types, now generic over the view's features.

**Bundling.** Each layout and feature lives in its own module, and only the views and features a consumer imports are bundled. This assumes a core entry with no side effects and a matching export map. That is not verified.

**Effect on other decisions**

- **D1:** `layout` becomes genuinely open, because any layout feature adds a kind.
- **D4:** kinds come from layout features. Settings remain composable view definitions.
- **D5:** unchanged for `view` and `date`. A feature's own state slices may be uncontrolled, controlled (`state` + `onXChange`) or external (`atoms`). This is the first state the core owns. Pointer-rate state (drag) defaults to uncontrolled, because controlling it from the app at that rate is impractical.
- **D10:** the switch is unchanged and narrower. `.otherwise()` stays the default.
- **D24:** tracked inputs become the core inputs plus each feature's state slices and `deps`. `views.views` and `features` are tracked by reference and must be stable.
- **D28:** superseded. Layout ownership per view and the inference of `layout` from `views` carry over.

**Costs**

- `TFeatures` and per-view feature types thread through every model type, every part and the selector. v9 notes this as a type-check hot spot.
- Feature order matters for event stages and `decorate` passes. Prerequisites need type-level checks.
- Forgetting `...views.features` is guarded only by the type error.
- Hand-written view literals and the current `views` shape break, which is acceptable while the packages are experimental.
- More entry points to publish.

**Rejected**

- **D28 alone:** extends layouts only, with nowhere for cross-cutting features to go.
- **Layouts registered in `features` and named by views:** two sources of truth, plus a "view needs a missing layout" error that model B (views bring their layout) removes.
- **`createCalendar({ views })` merging features implicitly:** removes the forgotten-spread error but hides the active feature set; the explicit object follows v9's `tableFeatures`.
- **Config on feature instances:** which view's instance wins would depend on key order in `views`.
- **Per-view feature instances:** they would split calendar-wide state, since only one drag can happen at a time.
- **Deep-merging settings:** shallow merges per layer are predictable.
- **Typing feature fields per view kind through capabilities** (no `isDragging` on list layouts): heavy for little gain. Fields follow the features the view lists.
- **A higher-kinded "phantom type" carried on views:** an encoding the codebase does not use elsewhere.

**Verified in the type sketch:**

- a view setting such as `drag` requires the view to list the feature;
- calendar options such as `drag` and `onEventDrop` exist, and are required, only once the feature is registered;
- `api.drag` is absent without the feature;
- `layout` is the union of the registered views' kinds, and an unregistered kind is an error;
- segments carry `isDragging` only in views that list drag;
- forgetting `...views.features` is a template-literal error;
- replacing an implementation under a declared key requires a compatible one.

**Not yet sketched:**

- prerequisite checks between features;
- state-slice ownership types;
- the React parts' generics.

**Implementation** (`packages/core/src/calendar.ts`, `calendar-views.ts`, `calendar-layouts.ts`, `calendar.types.ts`; tests in `src/tests/calendar-features.spec.ts`). Where it differs from the sketch above:

- **Core features are not feature objects.** Navigation, the event pipeline and the clock stay built into `createCalendar`; nothing could replace or reorder them, so wrapping them added no capability.
- **No `locate` capability yet.** No feature consumes it; it belongs to whichever decision brings drag or selection into scope.
- **Feature hooks receive a context, not the instance.** It holds `options`, the active `view`, `api`, `getState`, `setState`, and `settings(key, defaults)`, which applies the defaults → calendar → view layering. `constructApi` returns its actions instead of mutating `api`.
- **Controlled slices report nothing by themselves.** `setState` writes an uncontrolled slice or an external atom and leaves a controlled one alone. A feature calls its own `onXChange` option, as the test feature does.
- **`useCalendarSelector` is typed by annotating its selector** (`(state: Calendar_StateOf<typeof calendar>) => …`). An explicit `useCalendarSelector<typeof calendar>` would disable inference of the selected type, because TypeScript has no partial type-argument inference.
- **`features` and `atoms` are read once, at creation.** That is when state slices and actions are registered. A view that declares a feature the `features` object lacks still gets the view's own implementation at runtime, but the types reject it.
- **`getCalendarNavigation` (the instance-free helper) uses each view's own layout feature**, not a replacement passed to a calendar.
- **Model fields follow the active view's features.** Code that reads a field across views narrows with `'field' in model`. The React parts keep their core model types and accept the extended models structurally.

### D30 — Exports are verb-first functions, noun-suffixed constants and shadcn-style components

**Serves:** D29

**Verified:** not verified — a rename; cheap to reverse while the packages are experimental

**Why:** The scope-prefix names (`calendar_create`, `calendarView_month`, `DayGridView_Root`) came from guildara-frontend's naming rule. This repository does not enforce that rule. Under D29 the names also became feature-map keys, because features are passed with shorthand properties, so `calendarLayout_month` turned into a long key. The exports now follow the conventions of the libraries the API is modelled on:

- **TanStack-style functions and constants in core.** Instances come from `create*`, a pure query is `get*`, a factory is named after what it returns, and a feature constant ends in `Feature`, like v9's `rowSortingFeature`.
- **shadcn-style components in React.** A root part takes the component's name, subparts concatenate onto it (shadcn's `Card`, `CardHeader`), and the provider is `CalendarProvider` (shadcn's `SidebarProvider`).

| Before                                         | After                                                                         |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `calendar_create`                              | `createCalendar`                                                              |
| `calendarViews_create`                         | `createCalendarViews`                                                         |
| `calendarView_month` / `_timeGrid` / `_list`   | `dayGridView` / `timeGridView` / `listView`                                   |
| `calendarLayout_month` / `_timeGrid` / `_list` | `dayGridLayout` / `timeGridLayout` / `listLayout` (also the feature-map keys) |
| `calendarFeature_<x>`                          | `<x>Feature`                                                                  |
| `calendar_navigation`                          | `getCalendarNavigation`                                                       |
| `calendarClock_fixed` / `_interval`            | `fixedClock` / `intervalClock`                                                |
| `calendarEventStore_create`                    | `createEventStore`                                                            |
| `Calendar_Root` / `Calendar_RootProvider`      | `Calendar` / `CalendarProvider`                                               |
| `DayGridView_Root`, `DayGridView_Week`, …      | `DayGridView`, `DayGridViewWeek`, … (same for `TimeGridView*`, `ListView*`)   |

What stays:

- **Types:** they keep the `Calendar_*` prefix, including the feature maps and `Calendar_HTMLProps`.
- **React hooks:** they were already verb-first.
- **Internal helpers:** `calendarNavigation_days`, `layoutDayGrid_build` and `calendarProps_merge` are not exported, so they are unchanged.
- **Rendering:** `data-scope`/`data-part` are untouched. shadcn's `data-slot` attributes were not adopted.

Decisions before D29 keep the names they were written with.

Rejected:

- **`createDayGridView`:** too wordy for something written once per view.
- **`createViews`:** too generic for auto-import.
- **Renaming the types in the same pass:** about 60 renames with no gain at runtime. That is still open.

### D31 — The Solid adapter mirrors the React one with Solid's reactivity and Ark v6's Solid factory

**Serves:** constraint (framework-agnostic core); D3, D6, D24, D25, D29, D30

**Verified:** not verified — additive; the core is unchanged

**Why:** A second adapter is the test of the core's framework independence, so `@calendar-tsx/solid` reuses the React adapter's part names (D30), props, data attributes and `--cal-*` variables, and its D29 typing (`TFeatures` with `Calendar_ValidateFeatures`, an erased instance in context, a selector typed by annotating its state with `Calendar_StateOf`), and differs only where Solid requires it. `useCalendar` takes an accessor, as TanStack's Solid adapters do: it creates the instance once from `untrack(options)`, starts the clock in `onMount` with `onCleanup`, and pushes `options()` through `'~update'` in a `createRenderEffect`, which re-runs whenever a signal read inside the accessor changes. D24's reference comparison still decides whether the store re-derives. `Calendar` passes its props through the same accessor. `useCalendarSelector` is `@tanstack/solid-store`'s `useSelector` and returns an accessor. Parts port Ark v6's Solid `withRender` (`@ark-ui/solid@6.0.0-next.0`): `render(props, state)` is a function only, where `props(userProps?)` returns the part's props merged with the consumer's and `state` is an accessor. Solid has no virtual elements to clone, so the element form of D25 does not exist. Unlike Ark, the part's `ref` stays in `props()` and chains with a `ref` passed to it, so a ref reaches the node with and without `render`. A local `calendarProps_merge` replaces `@zag-js/solid`'s `mergeProps` with the D25 contract (`class` instead of `className`, `ref` chained like handlers); every key is a getter and a source may be a function, so merged props stay reactive. Conditional parts (`DayGridViewOverflow`, `TimeGridViewNowIndicator`, `ListViewEmpty`) use `<Show>`. The package builds with `vite-plugin-solid` as the pack plugin; the same build serves server rendering (D32).

### D32 — Solid server rendering: one build for both runtimes, hydration through `initialNow`

**Serves:** D27, D31; C9, C10

**Verified:** not verified — no API change; cheap to reverse

**Why:** The parts contain no DOM templates: every element renders through `<Dynamic>`, so the compiled package only calls `createComponent` and `mergeProps` and imports `solid-js/web`. The DOM and SSR compiles produce the same code, and `solid-js/web`'s own export conditions (`node`, `worker`, `deno` versus `browser`) pick the server or client runtime, which owns the hydration keys. On the server, `onMount` never runs, so the clock is not started; `createRenderEffect` runs `'~update'` once; and `renderToString` disposes the root, so `useSelector`'s store subscription is released. D27's `initialNow` already keeps the first derivation identical on both sides. Without it, Solid's `hydrate` throws `Hydration Mismatch` when the now indicator lands in another column. Solid has no Server Components, so there is no `'use client'` banner. Rejected: `tsup-preset-solid`'s layout (a `solid` condition with preserved JSX plus separate `server` and hydratable DOM builds). It was built and diffed: all three builds were the same code, so it would only add files and export conditions, and a `solid` condition would make `vite-plugin-solid` bundle the package into SSR output instead of externalising it. Revisit if a part ever renders a literal element instead of `<Dynamic>`, because templates differ between DOM and SSR compiles. The test renders on Node through a Vitest browser command (`ssrLoadModule`, so the parts are compiled with `generate: 'ssr'`) and hydrates in the browser.

### D33 — Background layers shade time ranges through a feature, alongside D12's availability

**Serves:** C7, D12, D29; FullCalendar parity for background events, inverse background events and business hours; future constraints for selection, drag and resize (D29)

**Status:** accepted and implemented (`packages/core/src/calendar-backgrounds.ts`, the background parts in both adapters, `base.css` and `default.css`). Amends D29 with `trackedOptions` (below). Additive to D12: `availability`, `column.isUnavailable` and `column.unavailable` are unchanged. Folding D12 into this decision is a separate, later decision.

**Verified:** layout, part and theme tests; FullCalendar behaviour checked against the v7 docs (Background Events, Business Hours, `businessHours` per resource)

**Why:** The time grid shades only resource columns, from absolute intervals (D12). A week or day view without resources cannot shade anything, the month view has no shaded days, and there is no equivalent of FullCalendar's `display: 'background'` or `'inverse-background'` events or of its `businessHours`. One mechanism covers all three: named layers of time ranges, each optionally inverted and optionally limited to resources, which the core clips to each column or day.

**Input.** A calendar option from the feature, separate from `events`:

```ts
type Calendar_BackgroundRange =
  | { start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime }
  | { allDay: true; start: Temporal.PlainDate; end?: Temporal.PlainDate }; // inclusive, as all-day events

type Calendar_BackgroundLayer<TKind extends string = string> = {
  id: string;
  kind: TKind; // emitted as data-kind; themes and consumers style by it
  inverse?: boolean; // shade what the ranges do not cover
  resourceIds?: string[]; // omitted: every column
  ranges: Calendar_BackgroundRange[] | ((range: Calendar_Range, timeZone: string) => Calendar_BackgroundRange[]);
};

/** Identity: returns its argument, typed, with `kind` kept as a literal. */
declare const createBackgroundLayer: <const TKind extends string>(
  layer: Calendar_BackgroundLayer<TKind>,
) => Calendar_BackgroundLayer<TKind>;

// module scope, so references stay stable (D24)
const backgrounds = [
  createBackgroundLayer({ id: 'business-hours', kind: 'closed', inverse: true, ranges: weekdays9to5 }),
  createBackgroundLayer({ id: 'holidays', kind: 'holiday', ranges: holidays }),
];

createCalendar({ …, features: { backgroundFeature, ...views.features }, backgrounds });
```

- **`createBackgroundLayer`** is an identity function. It takes `create*` although D30 keeps that prefix for instances, because the consumer reads it as building the layer, as `createCalendarViews` builds the views record. It gives an object literal its type at the point it is written, so a typo in a range or a misplaced `inverse` errors on the layer rather than on `createCalendar`, and layers can be declared apart from the calendar without annotating them. `const TKind` keeps `kind` as a literal (`'closed' | 'holiday'` above). Whether that union then flows into `background.kind` in the model needs the feature's option and model maps to take a kind generic; until then the model types `kind` as `string`.
- **Layers, not a flat list.** A layer exists even with no ranges, which is how an inverse layer shades a whole column: the same rule as D12's empty `availability`.
- **The function form** receives the visible range and the calendar's `timeZone`, and runs when the layout derives. Business hours are `createWeeklyRanges(rules)`, which returns such a function from `{ daysOfWeek, startTime, endTime }[]` (ISO days, `Temporal.PlainTime`s), so recurrence stays out of the layout, as D12 requires. It is named like `createBackgroundLayer`, after what the consumer builds. Timed ranges are compared as instants, so their own zone does not matter (D7).
- **Tracked by reference,** like `events` (D24): `backgrounds` and each function form must be stable, or every update rederives. Feature options were untracked before this decision (the store only rederived from core inputs and feature state), so a feature now lists the option keys that rederive in `trackedOptions`; `backgroundFeature` lists `['backgrounds']`. This amends D29's feature interface.

**Output.** `backgroundFeature` adds fields in `decorate`, for the views that list it, through the existing column and day feature maps:

| Layout    | Field                                                     | Part                                                                                      |
| --------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Time grid | `column.backgrounds: { key, layer, kind, start, span }[]` | `TimeGridViewBackground`: `aria-hidden`, `--cal-start`, `--cal-span`, `data-kind`         |
| Day grid  | `day.backgrounds: { key, layer, kind }[]`                 | `DayGridViewDayBackground`: `aria-hidden`, `data-kind`, fills the day beneath its content |
| List      | none                                                      | —                                                                                         |

Time-grid fractions use the fixed 24-hour clock axis (D40), as `unavailable` does (D12). Overlapping ranges within a layer are merged after projection so nothing is shaded twice; layers stack in input order. Inverse layers reuse the complement that D12's `unavailable` already computes, now shared in `layout/layout-intervals.ts`. Both parts carry `data-layer` as well as `data-kind`. Any meaning beyond shading (a "Closed" label) is the consumer's text (D20). `base.css` positions the time-grid part as it positions `time-grid-unavailable`, and makes `day-grid-day` a positioned, isolated box so the day part sits beneath the day's content. `default.css` fills both parts from `--calendar-background` (unset by default: a 6% wash of the text color) and hatches them under forced colors, at the opposite angle from unavailable time.

**Considered and rejected:**

- **A `display: 'background'` flag on events, as FullCalendar does.** Background entries would then pass through `eventOrder`, lane assignment, day-grid bars, `hiddenCount`, the list view and the event store, each of which would have to filter them out, and `data: TData` would type two unrelated things. D37 later adopts the flag for individual dated events, which need ids and payloads; layers stay the mechanism for rules.
- **A dedicated `businessHoursFeature` with weekly rules in the core.** Narrower: it shades business hours only, leaves background events missing, and puts recurrence in the core against D12.
- **A weekly-rules helper plus a calendar-wide `availability` option only.** Smallest, but the consumer recomputes on every navigation, month view gets nothing, and background events stay missing.
- **Replacing D12 now.** `availability` would become a `kind: 'unavailable'` inverse layer per resource, and `Calendar_Resource.availability` would stop being required. Deferred until background layers are proven: it is a breaking change to the time-grid model.

**Cost:** one core feature (clip, merge, complement), one or two parts in each of React and Solid, theme CSS, and layout and part tests. Roughly twice a business-hours-only feature.

**Settled when implementing** (recorded here; revisit if a consumer needs otherwise):

- **Month view:** a day takes a layer when one of its all-day ranges covers the day. Timed ranges are ignored there, as in FullCalendar, except by inverse layers: an inverse layer marks the days none of its ranges touch, so a business-hours layer marks the closed days.
- **All-day ranges in the time grid** clip to the whole column (start `0`, span `1`).
- **Layers without `resourceIds`** shade every column, resource columns included. Layers with `resourceIds` shade only those resources' columns, and nothing in columns without a resource or in the month view.
- **Weekly rules** use ISO days (`1` Monday … `7` Sunday). An `endTime` at or before its `startTime` ends the next day, so `22:00`–`02:00` and `09:00`–`00:00` work without times past 24:00. Times that fall in a DST gap resolve with Temporal's default `'compatible'` disambiguation.
- **`kind` in the model** is typed `string`; the literal union stays on the input.

**Open questions:**

- The time grid's all-day row: should all-day ranges shade it too? Not implemented; FullCalendar's behaviour there was not checked.
- Whether resource-scoped layers belong on the resource (`resource.backgrounds`) instead of `resourceIds` on the layer, which needs a resource feature map.
- Whether calendar-wide and resource layers of the same `kind` combine (union) or the resource layer overrides, as a per-resource `businessHours` may in FullCalendar (its docs do not say).
- `decorate` receives no visible range in its context; the feature derives it from the columns and days. Whether the context should carry it.

### D34 — The resource timeline is a fourth layout kind with stacked rows

**Serves:** C1, C7, C9; D3, D4, D29

**Status:** accepted. Amends D4 (four layout kinds) and lifts timeline views from "Not supported".

**Verified:** not verified — additive; no existing layout changes

**Why:** A timeline puts resources on rows and time on the horizontal axis. The time-grid model does not fit it. Time-grid lanes divide a column's width (`lane`/`lanes`) and events split at every day column, while a timeline stacks overlapping events into rows whose count differs per resource, and a week timeline draws an event crossing midnight as one bar. Bending the time grid with an orientation setting would need a mode switch inside its parts, which D3 rules out. So the timeline gets its own layout feature (`timelineLayout`, the `timelineLayout` key in `Calendar_Layout_FeatureMap`), view factory and part family, built only on the D29 layout-feature API. Leaving it to consumers as a userland layout feature was rejected because the library is meant to ship it; it remains possible for other layouts.

- **Settings:** `timelineView({ days, groupBy?: 'resource', slotMinutes?: 60, minSlotWidth? })`. Navigation is the time grid's: a 7-day period starts on `firstDayOfWeek`, and a step moves `days` days. Without `groupBy` the layout has one row with no resource.
- **Positions (amended by D40):** every `start`/`span` is a fraction of the whole range in clock time, with 24 hours per date. Days and slots are integer column indices instead (`colStart`, `colSpan`; `col`), so the header lays out as a CSS grid of `days × 1440 / slotMinutes` slot columns and sizes to its content. Day widths stay equal across DST, and all-day spans follow those day boundaries.
- **Stacking:** within a row, each event takes the lowest stack row where it overlaps nothing, in core order (`eventOrder`). Touching intervals do not overlap, as in the time grid. Each row reports `rows`, its stack depth, so rows grow to fit. A cap with overflow (FullCalendar's `eventMaxStack`) is a later, additive setting.
- **Spans:** a timed event is one segment clipped only at the range edges, with `continuesBefore`/`continuesAfter`. An all-day event is a block from the start of its first day to the start of the day after its last, in the same stack; there is no separate all-day row, and the segment carries `isAllDay`.
- **Resources and availability:** an event appears in every row it references. Availability is clipped to the range and shaded as its complement (D12), with the same helper as the time grid. A resource with no availability in the range is `isUnavailable` and shaded throughout.
- **Now:** one `now` fraction on the layout, present only when the clock is inside the range, drawn once across all rows.
- **Parts:** `TimelineView`, `TimelineViewHeader`, `TimelineViewDayHeader`, `TimelineViewDayTrigger`, `TimelineViewSlotLabel`, `TimelineViewBody`, `TimelineViewRow`, `TimelineViewResource`, `TimelineViewLane`, `TimelineViewEvent`, `TimelineViewUnavailable`, `TimelineViewNowIndicator`, the same in React and Solid (D31). As in D13 there are no per-slot parts; slot lines are a theme background. Resource cells render whatever the consumer passes; nested resources and resource data columns are out of scope.
- **Themes:** `base.css` lays the root out as a resource column (`--calendar-resource-width`) and a track whose minimum width is `--cal-slots × --cal-min-slot-width`; the header repeats those columns per slot and sticks to the top, and resource cells stick to the start. Events use the bar tokens (`--calendar-bar-height`, `--calendar-bar-gap`). `default.css` styles events as accent-tinted bars, draws slot lines from `--cal-slots` on each lane, keeps resource cells opaque so events and the now line scroll under them, and makes the day label stick beside the resource column.
- **Packaging:** the main entries. Tree-shaking already drops layouts no view uses.

Rejected: a horizontal orientation on `timeGridView` (above); a separate all-day row per resource (more model and parts for no current need); a `/timeline` subpath (no size benefit under `sideEffects: false`).

### D35 — Day grids add week-based navigation and fixed month heights

**Serves:** C1; D4, D29

**Status:** accepted; the separate month and week factories, layout features and month model names are superseded by D43.

**Why:** The day-grid builder lays out any range of whole weeks and marks days outside `period`. Week durations therefore reuse its row packing, overflow, backgrounds and parts. Calendar months have padding; week durations do not.

- **Weeks:** `dayGridView({ weeks, maxEventsPerDay, dayOverflow? })` covers `weeks × 7` days from the `firstDayOfWeek` of the week containing `date`. A step moves that many weeks, preserving the weekday. `maxEventsPerDay: Infinity` removes the cap.
- **Month:** `dayGridView({ period: 'month', fixedWeekCount: true, maxEventsPerDay })` shows six weeks, including outside days. `fixedWeekCount` defaults to `false`.
- **Not covered:** grids of fewer than seven columns and year grids. The model and base CSS still assume seven columns.

The original implementation kept separate factories and month-named models and parts to limit migration scope. D43 accepts that migration and unifies their names.

### D36 — List views can cover a calendar month or year

**Serves:** C1; D4, D18

**Status:** accepted.

**Verified:** not verified — additive; the list model and its parts are unchanged

**Why:** FullCalendar's `listMonth` and `listYear` differ from `listDay`/`listWeek` only in their period, and the list builder already lists whatever range it gets (D18). So `listView` takes either `days` or `period`:

- **`listView({ period: 'month' })`:** the calendar month containing `date`; a step moves one month and lands on the 1st, as the month view does.
- **`listView({ period: 'year' })`:** the calendar year containing `date`; a step moves one year and lands on 1 January.
- Range equals period, as for the `days` form, so a list never shows padding days. The settings type is a union, so `days` and `period` cannot be combined.

Rejected: `listView({ months })` (a count cannot express a calendar year, since `months: 12` would start at the month of `date`); separate `listDayGridView`/`listYearView` factories (four names for one layout). The same month and year periods are what `dayGridYear` needs later (D35).

### D37 — Background events are events with `display: 'background'`, laid out under the others

**Serves:** C13; D33

**Verified:** not verified — additive; cheap to reverse while the packages are experimental

**Relation to D33.** Background layers and background events both shade time, but they answer different questions. A layer is a rule the app configures once: a `kind` of shading (closed, holiday) over ranges that may repeat weekly or be inverted, styled by `data-kind`, with no identity per range. A background event is one dated item from the app's data: it has an id, a `TData` payload the app renders or links from, continuation flags across days and weeks, and a place in the all-day row. Business hours are a layer; a booked-out afternoon or a conference fetched with the events is a background event. The two coexist and stack: layers render through `backgroundFeature`'s `backgrounds` fields, background events through the core's `backgroundEvents` fields.

**Why:** A background event is a shaded range with an event's shape: an id, a timed or all-day span, optional `resourceIds`, and `data`. It is an ordinary entry in `events` with `display: 'background'` (`Calendar_EventDisplay`, default `'auto'`, after FullCalendar's `display`), so an app keeps one list of everything on the calendar, one id space, one fetch and one event store. The core splits the list right after normalising and clipping (D7): background events skip `eventOrder` and feature `events` stages, keep their input order, and reach layout features separately as `Calendar_LayoutInput.backgroundEvents`. Every list the core hands out (`day.events`, list days, the bars and segments) excludes them, so the split happens once in the core rather than in each consumer. They share `TData` (D8) and are tracked with `events` (D24).

**Amended:** the first implementation took a separate `backgroundEvents` option, to keep background events out of every consumer of the event list. Folding them into `events` keeps that guarantee for the core's own outputs, because the split happens before layout. What remains on the app is its own code that reads the `events` input directly (a search box, a count), which filters on `display`. D33 rejected a `display` flag as the mechanism for layers, because rules would then pass through every event consumer; here it marks individual dated events only, and layers remain the mechanism for rules.

Layout:

- **Time grid:** each column gets `backgroundEvents` segments as fractions of its day, clipped at midnight like timed events (D17) but without lanes. An all-day background event also covers its whole column (`start: 0, span: 1`), so a holiday shades the day even in a view with `allDay: false`. The all-day row gets `allDay.backgroundEvents` spans across columns, placed per resource group like the bars (D19) but without rows.
- **Month and day grids (D35):** each week gets `backgroundEvents` spans for all-day background events only. A timed one would tint a whole day cell for an hour of it.
- **List:** background events are ignored; the list shows only days with events (D18).
- **Timeline (D34, extended by D42):** row background coverage follows the shared coordinates without taking stack rows.
- **Resources:** a background event without `resourceIds` covers every resource column, unlike an event, which appears only in the columns it names. A closure usually applies to everyone, so this matches FullCalendar.
- **Overflow:** background events take no row, so they never count toward `maxEventsPerDay` or `hiddenCount` (D17).

Parts: `DayGridView_WeekBackgroundEvent`, `TimeGridView_AllDayBackgroundEvent` and `TimeGridView_BackgroundEvent` render `aria-hidden` divs with `--cal-*` geometry and `data-continues-before`/`data-continues-after`; they are not interactive, because the time and date they cover already belong to the day cells and columns (D13, D15). `base.css` sets `pointer-events: none` on them and places them under the events. The month spans are positioned above the in-flow day cells, so the day triggers must stay clickable through them. In the all-day row the consumer renders them before the bars, because grid items paint in DOM order. `default.css` fills them with a 10% accent wash (`--calendar-background-event`), translucent so day numbers and slot lines show through, and hatches them in `Highlight` under forced colours.

**Rejected:**

- **A separate `backgroundEvents` option** (the first implementation): two lists to fetch and keep in step, ids checked for duplicates only within each, and the event store could not hold background events.
- **`kind: 'background'`:** a background event is itself timed or all-day, so it would need two more kinds or a nested flag; `kind` keeps the date shape (D7) and `display` the rendering.
- **Background layers (D33) for these entries:** a layer per entry loses the id and payload, and one layer of all entries cannot tell the app which entry a shaded span came from, nor flag continuation across days.
- **Sharing D33's parts and fields:** layers are keyed by layer and `kind`, background events by event; one part would need both shapes. They keep separate names (`backgrounds` against `backgroundEvents`, `TimeGridViewBackground` against `TimeGridViewBackgroundEvent`).
- **Extending resource `availability` (D12):** it is the inverse (shade outside the intervals), per resource only, and has no payload.
- **Month tint for timed background events:** a partial-day range cannot be shown in a day cell without reading as the whole day.

### D38 — Overlapping timed events expand into free lanes, side by side or cascaded

**Serves:** C4; app R1.8; FullCalendar parity for `slotEventOverlap`

**Verified:** core geometry, part and theme tests; FullCalendar's `slotEventOverlap` (boolean, default `true`, "at most half of each event will be obscured") checked against the v7 docs, its forward expansion recalled rather than checked against its source

**Why:** Lanes split an overlap cluster into equal columns, so an event with free lanes beside it stayed narrow, and there was no equivalent of FullCalendar's overlapping layout. The core now computes each segment's horizontal geometry, `inlineStart` and `inlineSize` as fractions of the column, emitted as `--cal-inline-start` and `--cal-inline-size`. It stays in the core (D1) because expansion depends on the other events, which CSS cannot see, and non-DOM consumers get the numbers too. `lane` and `lanes` are unchanged, so CSS written against them keeps working.

- **Lanes:** as before, per overlap cluster: each event takes the lowest lane free at its start, sorted by start and then longest first, and touching events do not overlap. A timed event split at midnight (D17) takes part in each day's column on its own.
- **Expansion, in both modes:** an event spans from its lane up to the first later lane holding an event it overlaps, or to the column's edge. An event with nothing to its right fills the rest of the column.
- **`timeGridView({ overlap })`:** `'side-by-side'` (the default) uses that span. `'cascade'` doubles it, capped at the column's edge, so the next lane covers at most half of the event, as FullCalendar promises. The default keeps today's look for existing grids except where expansion widens an event; FullCalendar's default is the overlapping layout.
- **Paint order:** later lanes paint over earlier ones. `base.css` sets `z-index: calc(1 + var(--cal-lane))` on events and isolates each column, so lane z-indexes cannot rise above the sticky header. The column carries `lanes` (the most lanes any cluster in it uses) as `--cal-column-lanes`, which keeps the now line above every lane; `default.css` adds it to the focus ring's z-index. Side by side, nothing overlaps, so the order has no visible effect.
- **Gap:** the geometry is exact fractions, so lanes meet edge to edge. `base.css` takes `--calendar-event-gap` (4px) off each event's width and height, so neighbouring lanes, back-to-back events and the column's edge stay apart; it is a theme concern, like `--calendar-bar-inset` for day-grid bars (D26), not part of the model.

**Rejected:**

- **CSS only** (a cascade attribute on the root, width `2 / lanes`): no expansion, and non-DOM consumers would redo the math.
- **Cascade without expansion:** smaller, but leaves the narrow-event problem in both modes.
- **Cascade as the default, as in FullCalendar:** it changes every existing time grid.
- **The name `eventOverlap`:** FullCalendar uses it for whether a drag may overlap another event, which this library may need later (D29).
- **Painting by DOM order instead of z-index:** segments stay in time order so tab order follows the day (D15); sorting them by lane would make keyboard order jump.

### D39 — Brief timed events get a minimum length and a short flag, in minutes

**Serves:** C4, C5; FullCalendar parity for `eventMinHeight` and `eventShortHeight`

**Verified:** core layout, part and theme tests; FullCalendar's options checked against the v7 docs (`eventMinHeight`, number, default `15`; `eventShortHeight`, number, default `30`; both "in timeGrid view"). How FullCalendar lanes events it has stretched is not in its docs and was not checked.

**Why:** A segment's span is its exact share of the day, so a 5-minute event in the default grid (48px per half hour) is 8px tall: too thin to read or click. Back-to-back brief events shared a lane because they do not overlap in time, so stretching one on screen would have covered the next. And an event a little taller than one line cut off the second line of a stacked title and time.

- **`timeGridView({ minEventMinutes })`**, default `15`: a timed segment shorter than this is laid out this long, clipped at the end of its day. The core uses the stretched length for its span and for lane assignment, so two brief events that would cover each other on screen take separate lanes. The event itself is untouched: `segment.event.end` stays the real end, and consumers label it from there (D20). `0` turns it off.
- **`timeGridView({ shortEventMinutes })`**, default `30`: a segment laid out shorter than this has `isShort: true`, which the part emits as `data-short`. `default.css` lays a short event's content out on one line. The core only flags it; what goes on the line is the consumer's (D20).
- **Minutes, not pixels.** FullCalendar measures pixels because it renders the grid. The core lays out fractions of a day and never sees the slot height (D1, D9), so the thresholds are durations, like `slotMinutes`. With the default slot height, 15 minutes is 24px and 30 minutes 48px, above FullCalendar's 15px and 30px. They do not follow a changed `--calendar-slot-height`; a consumer who doubles the slot height may lower them.
- **On by default.** The defaults change only events under 15 minutes, which rendered as unreadable strips before, and add a flag the theme styles; longer events are untouched.

**Rejected:**

- **Pixels in CSS only** (`min-block-size`, a container query for the short style): it follows the slot height, but lanes would not know about the stretched length, so back-to-back brief events would cover each other.
- **A pixel option the core converts with the slot height:** the core would need the theme's slot height as an input, which breaks D9's split between geometry and styling.
- **Stretching the event's `end` in the model:** consumers would label a 5-minute call as 15 minutes.

### D40 — Time grids and timelines use a fixed 24-hour clock axis across DST

**Serves:** C4, C7, C8, C9, C13; D7, D12, D33, D34, D37, D38, D39

**Status:** accepted. The user chose a fixed clock axis over an elapsed-time axis. Amends the geometry in D7, D12,
D33, D34, D37 and D39; model shapes, input timestamps and slot labels are unchanged.

**Why:** events and shading used elapsed milliseconds while slot labels divided every date into 24 hours. In New
York, 09:00 appeared at 8/23 of the spring-transition day and 10/25 of the autumn-transition day, away from its label
at 9/24. Weekly timeline dates also had different effective widths from their headers.

- **Coordinates:** each displayed date has 24 clock hours. Real instants determine clipping and whether an event or
  the clock is inside the range; local dates and times determine positions. A 09:00 event and the now indicator at
  09:00 sit at 9/24 of their date in both layouts. Transition offsets come from the installed Temporal polyfill's
  `getTimeZoneTransition`; no host time zone or assumed one-hour DST change is used.
- **Missing and repeated hours:** missing clock labels remain on the axis. Both occurrences of a repeated clock
  time share a position. Event lanes and timeline stacks use projected geometry, so visually overlapping events
  remain separate even when their real intervals do not overlap.
- **Transition-crossing intervals:** a bar encloses the clock positions visited by its real interval. Spring
  01:30–03:30 spans two displayed hours. Autumn 01:30 in the first hour to 01:15 in the second spans the repeated
  01:00–02:00 band. This keeps one forward bar without changing the event's actual bounds. An exclusive end at a
  transition uses the offset before the transition, so it does not include the next occurrence.
- **Shading:** real availability and background intervals are clipped, split at offset transitions, projected, then
  merged before inverse gaps are calculated. A rollback can produce separate shaded bands; their gaps stay visible.
  Repeated-hour coverage combines on the shared axis. All-day backgrounds and timeline events use
  date boundaries directly, including dates on which midnight does not exist.
- **Minimum and short lengths:** D39's thresholds measure displayed clock minutes, after projection. Minimum lengths
  participate in visual lane assignment and remain clipped at the displayed day's end.

**Rejected:** an elapsed-time axis with 23/25-hour days and skipped/repeated labels. It preserves actual duration on
screen but changes the shared time-grid axis and timeline header model. Retaining elapsed geometry under clock labels
was rejected because it leaves the alignment defect in place.

**Verification:** calendar-level regression cases in `packages/core/src/tests/layout-dst.spec.ts` cover spring and
autumn transitions, half-hour changes in Lord Howe, midnight changes in Santiago, repeated-hour lanes and inverse
shading, minimum sizes, weekly day boundaries and all-day events.

**Coordinate foundation:** `packages/core/src/layout/layout-coordinates.ts` provides internal visible-date axes,
overnight clock windows, gap/fold branches, exact source projection and reverse lookup. Its fragments preserve
coverage independently of rendering; `layoutCoordinates_enclose` derives D40's enclosing event rectangle per date.
The builders now use this foundation through D41. D40's shading and enclosing event policy remain in force.

### D41 — Built-in views share visible-date and clock-window coordinates

**Status:** accepted through the requested layout integration. Extends D40's fixed clock coordinates to visible
windows and compressed weekdays; amends D7, D17, D19, D33, D34, D35 and D37's full-day/contiguous-column assumptions.

- **Settings:** all built-in views accept `hiddenDays` as ISO weekdays. Time grids and timelines also accept
  `timeWindow: { startMinutes, endMinutes }`. Defaults are no hidden dates and `[0, 1440)`. Bounds are integers with
  `0 <= startMinutes < 1440` and `startMinutes < endMinutes <= startMinutes + 1440`. Slots use positive integer
  minutes and may end in a partial slot. Hiding all weekdays is invalid; a hidden controlled day stays empty.
- **Ownership:** an overnight window belongs to its starting date. Hidden weekdays apply to that anchor, while
  timed events and weekly rules use actual source instants. All-day items keep calendar-date membership.
- **Navigation:** `period` and `range` retain their nominal and anchor-envelope meanings. `inputRange` is the coarse
  inclusive input envelope, including the following date when needed. Core filtering and range callbacks use this
  coverage. Layout features can provide `inputRange(range, settings)`; omission falls back to `range` without a
  core switch on built-in kinds. Navigation remains controlled.
- **Projection:** layouts retain a shared coordinate plan on their models. Source fragments preserve instants,
  offsets and occurrences; D40 event geometry encloses visited clock positions. Shading combines projected source
  coverage before complementing it. Minimum paint sizing stays clipped to the visible window. The overnight now
  indicator follows the actual instant independently of the anchor's `isToday` flag.
- **Date bars:** visible ordinals replace calendar-day distance. Calendar weeks are formed before hiding days, so
  month row counts and keys remain stable. Hidden-only events take no row and do not contribute to overflow.
  Resource grouping still composes date and resource order as in D19.
- **Rendering:** React and Solid emit column counts and explicit slot geometry. Partial slots retain proportional
  sizes in both themes and headers. Slots expose `dayOffset`; timeline dates keep equal window widths across DST.

**Rejected:** filtering cells after bar packing (leaves gaps and phantom overflow), resolving only window endpoints
with Temporal's compatible disambiguation (includes incorrect source coverage in a narrow repeated hour), and
duplicating date/time arithmetic inside adapters. Branch-specific inverse shading and fragmented event painting
remain separate possible policy changes; D41 does not adopt them.

Implementation details are recorded in [the coordinate model](coordinate-model.md).

### D42 — Timeline rows render background events and background layers

**Status:** accepted through the requested timeline implementation. Extends D33 and D37 to D34's timeline rows.

- **Model:** every row has `backgroundEvents: Calendar_BackgroundEventSegment<TData>[]`. Views registering
  `backgroundFeature` also have `row.backgrounds: Calendar_BackgroundSegment[]`, through the row feature map.
  Both use fractions of the concatenated visible windows and take no stack rows.
- **Projection:** timed background events are split into visible anchor-date bands. Each band unions exact source
  fragments, preserving DST gaps and combining repeated-hour coverage under D40. All-day events cover their visible
  anchor dates, including the following morning of an overnight window. Continuation flags follow clipping to the
  anchor window, as in the time grid. Hidden-only dates contribute no shading.
- **Layers:** timed and all-day coverage is merged within each layer before its inverse is computed across the
  visible track. Layers keep input order. Range callbacks receive `inputRange` and the calendar's time zone;
  empty axes do not invoke them. All-day ranges follow anchor-date membership rather than midnight instants.
- **Resources:** an unassigned background event shades every resource row. An assigned event shades the named rows;
  an ungrouped timeline includes all background events, matching the time grid. A layer without `resourceIds` shades
  all rows; a scoped layer shades only matching resource rows and is skipped in an ungrouped timeline.
- **Parts and themes:** React and Solid expose `TimelineViewBackgroundEvent` (`segment`) and `TimelineViewBackground`
  (`background`) inside `TimelineViewLane`. Both render non-interactive `aria-hidden` divs with `--cal-start/span`.
  Event parts expose continuation attributes; layer parts expose `data-layer/kind`. Existing background color tokens
  and forced-color hatching apply. Events paint above shading regardless of DOM order.

**Rejected:** enclosing timed background events like foreground bars, which fills real gaps in projected coverage;
counting shading in stack depth, which changes event geometry; separate timeline background input options, which
duplicate the established event and layer contracts.

### D43 — Month and week grids share one day-grid API

**Serves:** C1; D3, D4, D29, D35. Accepted by the user for core, React, Solid, themes and docs.

**Why:** Month and week grids share their geometry and rendering anatomy. Their different periods and navigation steps are settings of one layout. Consolidating the API removes a second layout feature and the mismatch between a week grid and month-named models and parts.

- **Factory:** `dayGridView({ period: 'month', maxEventsPerDay, dayOverflow?, fixedWeekCount? })` or `dayGridView({ weeks, maxEventsPerDay, dayOverflow? })`. The settings union rejects missing periods, combined `period` and `weeks`, and `fixedWeekCount` on the weeks form.
- **Navigation:** month periods and padded ranges are unchanged; month steps land on the first day of the next or previous month. Week periods equal their ranges, start on `firstDayOfWeek`, and step by the configured weeks while preserving the weekday. `fixedWeekCount` still defaults to `false`.
- **Core:** one `dayGridLayout` feature and one builder. Both `context.kind` and `layout.kind` are `'dayGrid'`. Models are `Calendar_DayGridLayout`, `Calendar_DayGridWeek` and `Calendar_DayGridDay`; the day feature map is `Calendar_DayGridDay_FeatureMap`.
- **Bindings and themes:** both adapters export `DayGridView*` parts from `day-grid-view.tsx`. Parts emit `data-part='day-grid-*'`; all themes and examples use those selectors. Geometry variables and event packing are unchanged.
- **Migration:** replace `monthView(settings)` with `dayGridView({ period: 'month', ...settings })`; replace `dayGridLayout`, `Calendar_DayGrid*`, `DayGridView*`, the `'month'` layout discriminator and `month-*` part selectors with their day-grid names. Old exports and selector aliases are removed. Consumer view keys such as `month` remain consumer-owned and can stay unchanged. Code that distinguished the two forms through `context.kind` must use its registered view key instead.
- **Documentation:** one day-grid view page covers both forms and their shared model and parts.

Rejected: retaining separate month and week factories (two names for one layout); keeping month-named aliases (preserves the naming mismatch); a generic factory for every layout (time grids, lists and timelines retain different models and parts).

### D44 — Expanded durations, ordered grouping and visible-date geometry

**Serves:** C1, C2, C6, C7, C8, C9, C10. Accepted by the user; extends D4 and supersedes D35/D43's restricted day-grid model.

**Why:** Durations and grouping are configuration of the four existing layout families. A day, N-day, workweek, resource grid, continuous year and multi-month overview reuse day cells and bars. Calendar-period timelines reuse the timeline renderer. No fifth factory or layout kind is introduced.

- **Shared periods:** all four factories accept exactly one of positive integer `days`, `weeks`, `months`, or `period: 'month' | 'quarter' | 'year'`. `days` starts on the anchor date except that `days: 7` preserves existing week alignment. `weeks` starts on `firstDayOfWeek`; steps preserve the anchor's weekday. `months` starts with the anchor month. Calendar quarters start in January, April, July and October; calendar years start in January. Month-based steps land on the first day of the new period. `calendar-periods.ts` owns this calculation and validation; layout features retain control of padding and building.
- **Day-grid grouping:** `groupBy` accepts `'month'`, `'resource'`, singleton tuples, `['month', 'resource']`, or `['resource', 'month']`. Keys are unique. Month grouping requires a month-based duration. A month key creates month sections; a final resource key creates columns inside each section. A resource key before month produces each resource's month sections, ordered by resource input and then date. `groupOrder` controls resource/date column order inside a row; it does not override the section order.
- **Day-grid model:** one `{ kind: 'dayGrid', coordinates, sections }` shape for every configuration. Each section contains its period, padded range, optional month/resource, header columns and rows. A day-count range is one row; week and month ranges use week rows. Each row exposes `days`, `segments`, `backgroundEvents`, `columnCount` and `stackCount`. `Calendar_DayGridLayout`, `Section`, `Row` and `Day` types take event data, resource data and features, in that order. Section keys are unique within the layout; row and cell keys are scoped to their parent.
- **Padding:** month-based day grids pad to whole weeks. `fixedWeekCount` is allowed only for a single calendar month or when grouping by month; each month then has six rows. Padding is local to the month section, so a date may occur as an outside day in a neighbouring section. The context's range envelopes every section's range, including extra fixed weeks.
- **Resources:** the existing time-grid matching rule applies to day-grid columns: assigned events appear in each named resource; unassigned events appear in none. Background events without resource IDs apply to every resource. `dayOverflow(date, resourceId?)` can distinguish resource cells. Day cells expose their resource and whether no availability overlaps that date. Background layers now apply resource scopes to these cells as well.
- **Hidden weekdays:** `hiddenDays` is per view, using ISO weekdays 1–7, and leaves at least one weekday visible. It does not change the navigation period, inclusive fetch envelope or step. Day grids and time-grid all-day bars project spans onto visible columns; resource boundaries split bars where required. Lists omit hidden dates. A selected range containing no visible dates yields an empty visible model. Events occurring only on hidden dates do not occupy rows or lanes.
- **Timeline scale:** D40–D42 remain authoritative: concatenate equal visible clock windows for visible anchor dates. Foreground events enclose visited clock positions; availability and backgrounds preserve exact projected coverage. Repeated hours share clock positions and missing hours retain labels. Day and slot models expose integer column indices and fractional `start`/`span` geometry; partial final slots retain proportional widths. Calendar-period navigation and ordered grouping do not change this coordinate policy.
- **Bindings and themes:** `DayGridView` is a labelled region; `DayGridViewSection` is a grid. Consumers render section headers, column headers and rows with one part family in both adapters. Week-specific parts, types, selectors and the minimum-height token become row names. Sections and rows emit `--cal-columns`; styles no longer assume seven columns. The default theme arranges sections responsively, configurable through section minimum width and gap. `Calendar_LayoutInput` includes `firstDayOfWeek` so section builders use the same alignment as navigation.
- **Migration:** replace `layout.weeks` with section/row iteration, `weekdays` with `section.columns`, week parts/types with row parts/types, `week` props with `row`, and the row model's `rows` count with `stackCount`. Header cells take `column` instead of `weekday`. Render headers and rows inside `DayGridViewSection`. Replace `day-grid-week-*` selectors and `--calendar-week-min-height` with row names. There are no legacy model aliases.

Rejected: separate day, resource, workweek, year or multi-month factories (duplicate configuration around shared geometry); a separate `monthGrouping` option (duplicates `groupBy` and cannot express ordered composition); forcing time grids and timelines into one model (D34's geometry distinction remains); hiding dates with CSS (bars, overflow, availability and now would retain incorrect positions).

### D45 — List dates form a rail beside each day's events

**Serves:** C1, C9. Requested by the user, using FullCalendar's live list demo as the visual reference.

The existing list model and parts stay unchanged. `ListViewDay` emits `--cal-events` in React and Solid so its heading spans the event rows. `base.css` places the heading and events in two columns; the date column narrows with the list and is capped by `--calendar-list-date-width` (`10rem` by default). The default theme styles a consumer-supplied `<time>` containing a prominent `<strong>` day number and compact weekday/month/year spans. Labels wrap, and the heading retains a full, localized accessible date. Examples and the playground use this composition for every list duration. Existing plain-text headings remain supported.

Rejected: formatting dates in core or adding another list factory (presentation belongs to the consumer); a single long date string above each group (weak hierarchy and repeated horizontal bands).

### D46 — Compact month panels for calendar-only multi-month grids

**Serves:** C1, C9. Requested by the user, comparing the year-by-month playground with FullCalendar's year grid.

The four factories and core models stay unchanged. React and Solid mark calendar-only grids containing multiple month sections with `data-multi-month` and emit `--cal-month-rows`, the maximum section row count. Resource grids are excluded. The default theme uses smaller day, bar and row sizes, centered month/weekday headings, panel padding and wider gutters. Section grids containing both headers use CSS subgrid to share tracks with neighboring months; all span the maximum week count so subsequent panel rows start together. The year playground sets `fixedWeekCount: true`, giving every month six weeks. Configured event-row caps and overflow remain in effect.

Rejected: another year factory (month grouping already expresses the view); shrinking every day grid (changes ordinary months and resource grids); hiding events with CSS (would disagree with overflow counts).

### D47 — Resource agendas reuse the list layout with ordered sections

**Serves:** C1, C7. Requested by the user; the four existing factories remain.

`listView` accepts `groupBy: 'resource'`, `['resource']`, `['resource', 'date']`, or `['date', 'resource']`. The resource shorthand puts resources first. Omitting grouping, `'date'`, and `['date']` retain the ordinary chronological agenda. Duplicate keys and grouping keys from other layouts are rejected. Every existing duration and `hiddenDays` setting applies.

`Calendar_ListLayout` adds `sections`, whose optional `resource` or `date` identifies the outer heading. Each section contains `days`; a grouped day carries its date, resource and matching events. Resource-first sections contain one resource's dates. Date-first sections contain that date's resources. Ordinary lists have one unlabelled section. `layout.days` remains a flat index of the same day objects in section order, preserving existing consumers and the empty-state check. List model generics now take event data, resource data and features, matching the other resource layouts.

Resources follow input order; dates are chronological; events preserve the calendar's ordering. An event assigned to several known resources appears in each. Unassigned events and assignments only to unknown resources appear in no resource group, matching the existing resource layouts. Ordinary lists still include them. Empty dates, resource groups and sections are omitted; no resources or no matching events yields one list-wide empty state. Background events remain excluded. Section keys are unique within the layout, and day keys are unique across the flat index.

React and Solid add `ListViewSection` and `ListViewSectionHeader`, with resource/date data attributes and consumer-supplied heading text. `ListViewDay` exposes its resource ID. The default theme adds wrapping section headings above the existing date-and-event rows. Date-first lists use the section heading for the date and the day heading for the resource; resource-first lists reverse those labels. Docs examples and playground presets demonstrate both orders.

Rejected: a fifth factory (the event list geometry is unchanged); filtering only in examples (core would not expose consistent grouping and keys); replacing `layout.days` (unnecessary migration for existing ungrouped consumers); separate resource/date hierarchy models (one section shape expresses both orders).

### D48 — Timeline decorations preserve narrow event geometry

**Serves:** C1, C4, C11. Fixes visible overlaps reported in coarse timeline views.

The timeline already assigns overlapping time intervals to separate stack rows (D34). In month and year views, however, a brief event can project to about one pixel. Native button padding and theme borders imposed a wider minimum box, so adjacent events on the same stack row covered each other despite their correct time positions.

Timeline events have no inline padding or inline border width in the positioning base. The default theme preserves the label inset with `text-indent` and draws the inline borders on a clipped, noninteractive pseudo-element. High contrast keeps two-pixel and dashed continuation edges on that pseudo-element. Block borders, bar height, focus rings, timing fractions, lane assignment, and the React/Solid models remain unchanged. Both the native button and themed box therefore retain their calculated time width, including subpixel widths.

Rejected: changing the stack algorithm (time overlap is already handled); extending event durations to compensate for CSS (would change the time geometry); imposing a larger minimum event width (would require collision layout to use that same width).

### D49 — Timeline minimum display durations participate in stacking

**Serves:** C1, C5, C7, C11. Accepted by the user after the quarter timeline showed one-pixel event bars.

D48 fixed accidental expansion from CSS decorations but left brief events too narrow to read or select. The timeline now follows D39's duration-based approach: `timelineView({ minEventMinutes })` defaults to half of `slotMinutes` (or 30 minutes for the default hourly slots). Daily slots therefore give brief events a half-day display span. A configured `minSlotWidth` makes that span usable on coarse axes without browser measurement.

The core extends each timed event's projected end to that minimum before assigning stack rows. Both geometry and collisions use the same display interval. The real `event.start` and `event.end`, continuation flags, and all-day spans stay unchanged. Display spans clip at the visible range's end; minutes count on the compressed visible clock-time axis, including hidden weekdays and DST. `minEventMinutes: 0` restores exact durations, and D48 keeps those narrow boxes within their spans. React and Solid continue to render the same core geometry without new models or factories.

The React and Solid examples omit slot labels for daily columns, include minutes for subday slots, and expose full titles and actual date/time ranges through `title` and `aria-label`. This removes repeated midnight labels and makes ellipsized bar content available without changing the event data.

Rejected: CSS-only minimum widths (stacking cannot see the enlarged bars); fixed pixel widths with measured browser layout (adds resize-dependent layout and adapter behavior to a headless engine); opt-in minima only in the playground (leaves the default library behavior unusable for short events).

### D50 — Optional RRule definitions resolve before event normalization

**Decision:** `@calendar-tsx/rrule` provides `rruleFeature` and `createRRuleEvent`. One-off and recurring definitions
share `events`, one ID space and the existing stores (D2, D37). `Calendar_EventInput` remains the concrete union;
`Calendar_EventDefinition<TData, TFeatures>` adds the union of registered `Calendar_EventInput_FeatureMap` entries.
The builder adds `~source: 'rruleFeature'`. Explicit feature types gate definitions; missing runtime resolvers throw.

A feature's pure `resolveEvents(source, { range, timeZone })` runs calendar-wide before normalization, range filtering,
background splitting, ordering and existing feature stages. It receives the inclusive `inputRange`, including month padding and any following date needed by an overnight window.
Core memoizes the latest resolution by definitions reference, input range and display zone. The optional package weakly
caches compiled definitions and at most four range/zone expansions per definition. Clock ticks do not expand again.
Inputs are immutable. Layouts and adapters receive ordinary concrete events; stores retain definitions.

`rrule-temporal` 2.2.8 supplies selectors, counts and nominal wall-time candidates. Input accepts RRULE strings or plain native
selector options (`freq: 'MONTHLY'`, `byDay: ['2FR']`, `bySetPos: [-1]`). Instantiated rule objects are excluded. RDATE, EXDATE,
EXRULE and multiline recurrence sets are supported. Exclusions apply after COUNT and win over inclusions.

Temporal remains the public date API (D7). `start` supplies DTSTART and the recurrence zone; conflicting embedded
DTSTART/TZID values throw. Options omit DTSTART/TZID and use Temporal UNTIL. The engine receives nominal UTC
`Temporal.ZonedDateTime` values, then the calendar resolves their wall fields in the seed zone using `compatible`:
gaps move forward and folds choose the earlier offset. An explicit seed offset is preserved. Gap candidates count
toward COUNT; post-filtering them was rejected because it would shorten finite rules. UTC UNTIL is checked against
resolved instants. Display-zone changes preserve the schedule. Seed subsecond precision is retained; all dates use
the ISO 8601 calendar. Supplying the application's Temporal namespace to the engine preserves output branding.
No JavaScript Date transport or CommonJS interop wrapper remains.

Timed duration is positive elapsed time, without years/months. All-day duration is positive whole days/weeks,
defaulting to one day, with the existing inclusive end. Expansion looks back far enough to include prior starts
still overlapping the view. Resource IDs, background display and data pass through. Generated IDs derive from the
series ID and scheduled start; `occurrence` retains `seriesId` and `originalStart` before normalization. An instance
replacement uses EXDATE plus a one-off event; series editing updates the stored definition.

**Alternatives considered:** a native daily/weekly recurrence implementation was rejected in favor of the requested
RRule language. A post-sort feature hook cannot generate prior-start or background occurrences correctly. Separate
recurring options/stores would duplicate the event ownership and ID model. Native RRule TZID was rejected after
cross-host checks produced different instants. Unbounded full-result engine caches were rejected. The requested migration to `rrule-temporal` replaces the original
`rrule` 2.8.1 engine and its subdaily stall. Eligible range queries can seek forward. Default safety budgets are
10,000 iterations and 1,000,000 candidate evaluations, configurable through native options; exhaustion throws.
Large or complex queries still do not have a fixed CPU-time guarantee.

**Verification:** the optional package tests rule syntax, selectors, exceptions and COUNT, UTC/local UNTIL, compatible
DST, nanoseconds, overlap lookback, stable IDs, store ownership, memoization and all layouts. Adapter tests render
occurrences and remove a series through each framework's event store.

### D51 — Exclusion rules may own a Temporal seed

**Decision:** each options-object `exrule` accepts an optional `start`, a `ZonedDateTime` for timed series or a
`PlainDate` for all-day series. Omitting it retains the parent seed. String exclusions and inline EXRULE lines
continue to inherit the parent seed. `Calendar_RRuleExclusion<TDate>` keeps exclusion starts and UNTIL values tied
to the parent date kind. Non-ISO dates and mismatched kinds are rejected.

An exclusion's COUNT and INTERVAL start at its own seed, including candidates before the parent series starts.
UNTIL remains inclusive; an upper bound before the seed yields an empty exclusion set. Timed seeds retain their
own zone, clock time and explicit offset. Each compiled rule resolves and queries in that zone, with the existing
compatible DST policy. Normalizing an exclusion seed to the parent zone would change its future wall schedule.

Exclusions compare timed instants or all-day dates and win over both RRULE and RDATE. They do not replenish the
parent's COUNT or trim event durations. The query lookback still includes parent occurrences beginning before the
view; query bounds are converted for each rule separately before engine expansion. Stores retain definitions and
surviving occurrences keep their IDs.

**Verification:** recurrence tests cover independently bounded all-day and timed windows, omitted seeds, COUNT and
INTERVAL alignment, multiple exclusion seeds, RDATE precedence, inclusive nanosecond bounds, cross-zone DST,
overlapping prior starts, empty bounds and date-kind validation.

### D52 — Native daily/weekly recurrence shares the RRule event shape

**Decision:** `@calendar-tsx/core` exports `createRecurringEvent` and `recurrenceFeature`, with no recurrence-engine
dependency. Native recurrence is opt-in through feature registration and lives in core modules. Definitions use the
existing source resolver and stores. Core and framework adapters need no new hooks. Store overloads retain inferred
source keys so importing both implementations does not require registering an unused resolver. Explicit data
generics may supply a second source-key generic; its default retains the existing broad definition union.
`Calendar_RecurringEventDefinition<TData>` is structurally compatible with the RRule definition type.

Keep the `rrule` field name for compatibility. Accept plain options objects with DAILY/WEEKLY frequencies, positive
integer INTERVAL, nonnegative COUNT and inclusive Temporal UNTIL. Weekly rules support non-ordinal `byDay` weekdays
and `wkst`, defaulting to Monday; omitted weekdays use the seed weekday. Daily rules reject both selectors. Strings,
monthly/yearly and subdaily frequencies, ordinal weekdays and other selectors require the RRule package. Unsupported
options throw, including options passed through untyped input.

Weekly interval periods start at WKST, independently of display settings. Dates before the seed do not participate;
the seed itself must match the rule. COUNT counts nominal matching starts before exclusions and before range
filtering. Native rules may combine COUNT and UNTIL. Preserve D50's compatible DST, explicit seed offset, nanosecond
precision, elapsed timed durations, inclusive all-day ends, ISO calendar and seed-year constraints.

Keep `rdate`, `exdate` and independently bounded `exrule` objects/arrays with D51's seed ownership, kind validation
and instant/date matching. Exclusions use the same native subset, win over all inclusions and do not replenish COUNT.
Copy resources, background display and data. Generated IDs use the existing RRule scheme so changing implementations
does not change IDs for matching occurrences. Both features may coexist in one calendar.

The engine seeks directly into the query by daily/weekly period index and calculates prior COUNT arithmetically.
This avoids replaying old series. Look back for overlapping durations and pad timed candidate dates for compatible
DST shifts. Each rule query permits at most 10,000 periods after seeking and clipping COUNT/UNTIL; exhaustion throws.
Weakly cache prepared definitions and at most four range/zone queries, matching the existing immutability contract.

**Alternatives considered:** full native RRULE support would duplicate a parser and complex selector engine already
available through the optional RRule package. Monthly/yearly selectors were omitted to keep the accepted API small.
Renaming the `rrule` field would add a conversion when changing implementations. Making native recurrence depend on the optional RRule
package would couple their dependency graphs. Native recurrence belongs in core; the optional RRule
package owns its engine integration and the compatibility tests against core. A separate native package was rejected
in favor of the core exports.

**Verification:** compare shared native rules directly against the installed RRule integration, including complete
occurrence snapshots and IDs. Cover week starts, partial seed weeks, interval phase, COUNT/UNTIL, exclusions, DST,
lookback, old-series seeking, explicit unsupported-option errors, feature types and both adapter stores.

## Test cases

Plain assertions grouped by area, each tagged with the capability (`C`), decision (`D`), chart edge or app requirement (`app R`) it protects. Core cases run without a DOM against `calendar_create` with `clock_fixed`; React cases render the parts.

### Navigation and controlled state

- `api.next()` emits `onNavigate` with the next period and does not change `store.state.context` until `setOptions` delivers it. _(C2, D5, chart: action)_
- `api.prev()` and `api.today()` emit the previous and current period for each layout kind (month, 7-day and 1-day time grid, list). _(C2, app R3.3)_
- `api.navigate({ view: 'day', date })` emits exactly one `onNavigate` carrying both values. _(D5, app R3.2, R8.1)_
- Two actions in one tick emit two navigations, each computed from the current controlled values (last-wins documented). _(D5)_
- Every `onNavigate` carries `range` (visible days including month padding) and `period` (nominal day, week or month). _(C2, C3, app R2.5)_
- `calendar_navigation(views, view, date)` returns the same `range`/`period` an action would emit, without an instance. _(C2, app R2.5)_
- Changing `view`/`date` through `setOptions` re-derives `layout` and `context` synchronously. _(D5, chart: setOptions)_
- With `firstDayOfWeek: 7`, week and month ranges start on Sunday. _(C1, app R1.1)_

### View definitions and the layout switch

- Each registered view key resolves to its layout kind, and `context.view` echoes the key (for example `list_week`). _(D4, D10)_
- `timeGridView({ days: 1, groupBy: 'resource' })` yields one column per resource, in input order. _(C7, D4, app R1.4)_
- `groupOrder: 'resource-first'` orders columns resource → dates; `'date-first'` orders dates → resources. _(D19)_
- `timeGridView({ allDay: false })` yields no all-day row in the model. _(C1, app R1.4)_
- `minColumnWidth` is emitted as `--cal-min-column-width` on the `TimeGridView` root, where the shared column tracks are defined. _(C11, D9)_

### Events, time zones and order

- Timed inputs in another zone are converted with `withTimeZone(timeZone)`; every model time is in `timeZone`. _(C8, D7, app R4.4)_
- The host zone is never read: the same input renders identically with `TZ=Europe/Lisbon` and `TZ=America/New_York`. _(C8, D7, app R4.4)_
- An all-day `PlainDate` input lands in the all-day row (time grid) or as a day segment (month), never in a timed column. _(D7, app R5.4)_
- `eventOrder(a, b, context)` receives the active view snapshot and determines row and lane order. _(C5, D16, app R5.6)_
- A duplicate event id logs a development-only warning; production behaviour is unspecified and not relied on. _(D2)_
- Replacing `events` through `setOptions` re-derives the layout with no other API calls (see-all merge, drafts). _(C5, D2, app R4.5, R11.3)_
- `event.data` keeps its `TData` type through to the parts (type test). _(D8)_
- `createEvent` returns its argument, infers `TData` from `data`, keeps the timed or all-day variant, and rejects a mixed shape (type test). _(D7, D8)_
- An event without `kind` is a type error, and `event.kind` narrows the union (type test). _(D7)_
- An event with `display: 'background'` reaches neither `eventOrder`, list days nor `day.events`, and appears only as background spans and segments. _(C13, D37)_

### Day-grid month layout

- A day with 6 single-day events shows 4 rows and reports `hiddenCount: 2`, `hasMore: true`. _(C6, D17, app R6.1)_
- A 3-day event becomes one bar with `colSpan: 3` in its week row. _(D17)_
- An event crossing a week boundary becomes two bars, marked `continuesAfter` and `continuesBefore`. _(D17)_
- A bar in a hidden row counts toward `hiddenCount` on every day it crosses. _(D17)_
- `dayOverflow(date) === true` sets `hasMore` on a day with no locally hidden rows; `hiddenCount` stays the local count. _(D17, app R4.2)_
- Padding days carry `isOutside`; today's cell carries `isToday` from the clock. _(C1, D11)_
- An all-day background event becomes `backgroundEvents` spans split at week boundaries; a timed one does not appear; neither changes `rows` or `hiddenCount`. _(C13, D37)_

### Time-grid layout

- Two overlapping events in a column get `lane` 0 and 1 of `lanes: 2`; a third event overlapping only the second gets lane 0 of 2. _(C4, app R1.8)_
- An event with no overlapping event in a later lane widens to the column's edge; the others end at the first later lane they overlap; `column.lanes` is the most lanes any cluster uses. _(C4, D38)_
- With `overlap: 'cascade'`, each event's width doubles, capped at the column's edge, so a later lane covers at most half of it. _(C4, D38)_
- A 5-minute event is laid out 15 minutes long and takes its own lane next to a back-to-back one; segments under 30 minutes are `isShort`; `minEventMinutes: 0` lays out exact lengths; `event.end` stays real. _(C4, D39)_
- `start` and `span` are fractions of the column's day (`09:00`–`10:00` → `0.375`, `0.041…`). _(C4, D9)_
- A timed event crossing midnight splits into two segments in a multi-day grid and clips in a single-day grid. _(D17)_
- A resource with availability `09:00–17:00` yields unavailable segments `[0, 0.375)` and `[0.708…, 1)`. _(C7, D12, app R7.1)_
- A resource with no availability yields one unavailable segment covering the whole column. _(C7, D12, app R7.1)_
- A period crossing midnight shades correctly on both days. _(D12)_
- An event referencing two resources appears in both columns. _(C7, app R7.3)_
- The now indicator appears only in today's column, at the clock's offset. _(C9, D11, app R1.5)_
- A timed background event becomes a `backgroundEvents` segment at its fraction of the day, takes no lane, and is dropped outside the visible range. _(C13, D37)_
- A background event crossing midnight splits across columns with continuation flags. _(C13, D37)_
- A background event without `resourceIds` shades every resource column; one with `resourceIds` shades only those. _(C13, D37)_
- An all-day background event spans the all-day row's columns and shades each of its columns whole. _(C13, D37)_

### Day-grid views

- `dayGridView({ weeks: 1 })` on Wednesday 11 March 2026 with `firstDayOfWeek: 7` shows 8–14 March as one week with no outside days; `api.next()` goes to the 18th. _(D35)_
- `dayGridView({ weeks: 4 })` shows four weeks from the week of `date` and steps 28 days. _(D35)_
- `dayGridView({ period: 'month', fixedWeekCount: true })` shows six weeks for February 2026, with 1–14 March outside; without it, February 2026 has four. _(D35)_
- Both month and week day grids have `context.kind` and `layout.kind` equal to `'dayGrid'`. _(D43)_

### Timeline layout

- A 1-day timeline has 24 slots of 60 minutes and one day header spanning them; a 7-day timeline starts on `firstDayOfWeek`. _(D34)_
- Overlapping events in one row stack into rows 0 and 1, and the row reports `rows: 2`; touching events share row 0. _(D34)_
- Brief timed events get a half-slot display span and stack using that span; an explicit minimum overrides it, `0` restores exact durations, real event times remain unchanged, and display spans clip at the range end. _(D49)_
- A timed event crossing midnight in a week timeline is one segment; one starting before the range is clipped and marked `continuesBefore`. _(D34)_
- An all-day event spans its days from midnight to midnight and carries `isAllDay`. _(D34)_
- An event referencing two resources appears in both rows; without `groupBy` there is one row with no resource. _(C7, D34)_
- Availability is shaded as its complement over the range; a resource with none is `isUnavailable` and shaded throughout. _(C7, D12, D34)_
- `now` is the clock's fraction of the range, and absent when the clock is outside it. _(C9, D11, D34)_

### List layout

- Only days with events appear, in order; `ListView_Empty` renders when `days` is empty. _(D18, app R1.3)_
- `listView({ period: 'month' })` lists 1–31 March 2026 for any date in March and steps to 1 April; `listView({ period: 'year' })` lists 2026 and steps to 1 January 2027. _(D36)_

### Clock and lifecycle

- `clock_interval` starts on mount, stops on unmount, and each tick re-derives `now`. _(D11, chart: mount, unmount, tick)_
- With `clock_fixed`, `now` never changes. _(D11)_
- Remounting resumes ticking. _(chart: Unmounted → Mounted)_
- With `initialNow`, the first state derives from it, and `'~mount'` replaces it with the clock's instant. _(D27)_

### Managed event store

- `add` upserts by id; `remove`, `update` and `reset` change `store.state.events`. _(C12, D2)_
- The store's events passed as the `events` input render like any other input. _(C12, D2)_

### React parts

- Every part renders `data-scope="calendar"` and its `data-part`, and no inline style other than `--cal-*` variables. _(D9)_
- `render={<El />}` merges the part's props onto the element (element props win, handlers chain, classNames join, styles merge); `render={(props, state) => …}` receives the props and the part's model and only the ref is composed. _(D25)_
- A ref passed to a part reaches the rendered DOM node, with and without `render`. _(D25)_
- `props_merge` calls handlers in source order, joins `className`, shallow-merges `style`, and lets later values win. _(D25)_
- Re-rendering `useCalendar` with referentially equal tracked options does not re-derive the store; changing `events` does. _(D24)_
- `TimeGridView_Event` sets `--cal-start`, `--cal-span`, `--cal-lane`, `--cal-lanes`, `--cal-inline-start`, `--cal-inline-size` from its segment, and `TimeGridView_Column` sets `--cal-column-lanes`; a short segment's event carries `data-short`. _(D9, D38, D39, app R1.8)_
- `DayGridView_WeekEvent` sets `--cal-col-start`, `--cal-col-span`, `--cal-row`. _(D9, D17)_
- `DayGridView_Overflow` renders only when `day.hasMore`, with `data-hidden-count`. _(D14, D17, app R6.1)_
- `DayGridView_WeekBackgroundEvent`, `TimeGridView_AllDayBackgroundEvent` and `TimeGridView_BackgroundEvent` set their `--cal-*` geometry and continuation flags and are `aria-hidden`. _(C13, D37)_
- `DayGridView_DayTrigger view="day"` (C10) calls `api.navigate({ view: 'day', date })` on click; a consumer `onClick` calling `preventDefault()` skips it. _(D22, app R8.1)_
- `TimeGridView_ColumnHeader` for an unavailable resource carries `data-unavailable`. _(C7, app R7.2)_
- `Calendar_Root` and `useCalendar` + `Calendar_RootProvider` produce the same context. _(D6)_
- `useCalendarSelector` re-renders only when its slice changes. _(D10)_
- Parts render no text unless given children; triggers have a default `aria-label` from `Intl` and `locale`. _(D15, D20)_
- Month root has `role="grid"`, weeks `row`, days `gridcell`; time grid and list roots are labelled regions. _(D15)_
- Using a `*_Root` with a model of the wrong kind is a type error. _(D10)_
- Markup rendered with `renderToString` on one clock hydrates on a later clock across midnight without mismatches when both sides pass the same `initialNow`, and reports a mismatch without it. _(D27)_

### Themes

- A timed event at `09:00`–`10:00` sits at 37.5% of its column's height and spans 1/24 of it. _(D26, D9)_
- Overlapping events split the column's padding box into equal lanes, each less `--calendar-event-gap`, so neighbours do not touch. _(D26, C4, D38)_
- Cascaded events paint the later lane over the earlier one, which spans the column where nothing is to its right. _(D26, D38)_
- A brief event is drawn 15 minutes tall, less the gap, with its content in a row. _(D26, D39)_
- Time-grid column headers line up with their columns through the shared subgrid, with or without an axis. _(D26)_
- The now line sits at the clock's offset. _(D26, C9)_
- A month bar spans exactly the day cells it covers, minus `--calendar-bar-inset`. _(D26, D17)_
- The overflow trigger renders below the visible bars, not under them. _(D26, D14)_
- Today's marker takes the light or dark accent from the inherited `color-scheme`. _(D26)_
- An unlayered consumer rule overrides the theme without `!important`. _(D26)_
- A colour token overridden on an ancestor also moves the tokens that default to it (event text). _(D26)_
- Under `forced-colors: active`, today's marker uses `Highlight`. _(D26)_
- `shadcn.css` takes the accent, event fill and radius from shadcn's variables, and follows `.dark` on the root or on an inner element. _(D26)_
- `material-ui.css` takes the accent, its contrast colour, the event fill and the radius from MUI's variables, and follows a dark scheme set by class, `data-dark` or `data-mui-color-scheme` on the root or on an inner element. _(D26)_
- `compact.css` shrinks slots and text over a theme, and a token set on an ancestor still wins over it. _(D26)_
- An accent set on an ancestor tints the events, and `--calendar-event` overrides that tint. _(D26)_
- `high-contrast.css` outlines events, timeline events included, in the text colour at 2px, marks today in its accent in both modes, dashes the edge where a bar continues, and still lets `--calendar-event` override the fill. _(D26)_
- `revenuecat.css` marks today in the exact brand red with black purple numbers, tints events blue, and keeps red text off white, on time-grid and timeline headers. _(D26)_
- A timed background event fills its fraction of the column under the events, and the event stays on top. _(D26, D37)_
- An all-day background event covers every bar row of the all-day section across its columns. _(D26, D37)_
- A month background span covers its day cells, and the day triggers under it stay clickable. _(D26, D37)_
- `stripe.css` marks today in blurple with its contrast colour and tints events from it, in both modes. _(D26)_
- With `default.css`, timeline events take the accent tint, today's day trigger the accent, resource cells stay opaque, unavailable time is hatched, the now line is the accent, a scrolled day label sticks beside the resource column, and forced-colors mode marks today with `Highlight`. _(D26, D34)_
- With `base.css`, a timeline event sits at its fraction of the track, day headers line up with their slots, stacked events do not overlap, and the now line sits at the clock's offset. _(D26, D34)_

## Skeleton

```text
lib/calendar/
  core/
    index.ts                 public entry; the only import path for react/
    calendar.ts              calendar_create, calendar_navigation
    calendar.types.ts        options, state, api, model types
    views.ts                 dayGridView, timeGridView, listView
    clock.ts                 clock_interval, clock_fixed
    event-store.ts           eventStore_create
    layout/
      month.ts               week rows, row packing, caps (D17)
      time-grid.ts           columns, lanes, availability complement (D12)
      list.ts
  react/
    index.ts
    use-calendar.ts          useCalendar, useCalendarContext, useCalendarSelector
    use-event-store.ts
    calendar-root.tsx        Calendar_Root, Calendar_RootProvider
    day-grid-view.tsx           DayGridView_*
    time-grid-view.tsx       TimeGridView_*
    list-view.tsx            ListView_*
```

```ts
// core/calendar.types.ts
import type { Temporal } from 'temporal-polyfill';
import type { Store } from '@tanstack/store';

type Calendar_TimedEventInput<TData> = {
  id: string;
  kind: 'timed';
  start: Temporal.ZonedDateTime;
  end: Temporal.ZonedDateTime;
  resourceIds?: string[];
  data: TData;
};

type Calendar_AllDayEventInput<TData> = {
  id: string;
  kind: 'allDay';
  start: Temporal.PlainDate;
  end?: Temporal.PlainDate; // inclusive; defaults to start
  resourceIds?: string[];
  data: TData;
};

export type Calendar_EventInput<TData> = Calendar_TimedEventInput<TData> | Calendar_AllDayEventInput<TData>;

/** An input after normalisation: timed inputs are in `timeZone` (D7). */
export type Calendar_Event<TData> = Calendar_EventInput<TData>;

export type Calendar_Resource<TResourceData> = {
  id: string;
  title: string;
  availability: { start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime }[];
  data: TResourceData;
};

export type Calendar_Clock = {
  now: () => Temporal.Instant;
  subscribe: (onTick: () => void) => () => void;
};

export type Calendar_DayGridDay = {
  key: string;
  date: Temporal.PlainDate;
  isOutside: boolean;
  isToday: boolean;
  hiddenCount: number; // local count only (D17)
  hasMore: boolean; // hiddenCount > 0 || dayOverflow(date)
  events: Calendar_Event<unknown>[]; // every event touching the day, for the consumer's popover (D14)
};

export type Calendar_DayGridSegment<TData> = {
  key: string;
  event: Calendar_Event<TData>;
  colStart: number;
  colSpan: number;
  row: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

export type Calendar_DayGridLayout<TData> = {
  kind: 'dayGrid';
  weekdays: Temporal.PlainDate[];
  weeks: { key: string; days: Calendar_DayGridDay[]; segments: Calendar_DayGridSegment<TData>[]; rows: number }[];
};

export type Calendar_TimeGridSegment<TData> = {
  key: string;
  event: Calendar_Event<TData>;
  start: number; // fraction of the column's day
  span: number;
  lane: number;
  lanes: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

export type Calendar_TimeGridColumn<TData, TResourceData> = {
  key: string;
  date: Temporal.PlainDate;
  resource?: Calendar_Resource<TResourceData>;
  isToday: boolean;
  isUnavailable: boolean; // resource with no availability that day
  segments: Calendar_TimeGridSegment<TData>[];
  unavailable: { key: string; start: number; span: number }[];
  now?: number; // fraction, only in today's column
};

export type Calendar_TimeGridLayout<TData, TResourceData> = {
  kind: 'timeGrid';
  slots: { key: string; time: Temporal.PlainTime }[];
  columns: Calendar_TimeGridColumn<TData, TResourceData>[];
  allDay?: { segments: Calendar_DayGridSegment<TData>[]; rows: number };
  minColumnWidth?: string;
};

export type Calendar_ListLayout<TData> = {
  kind: 'list';
  days: { key: string; date: Temporal.PlainDate; events: Calendar_Event<TData>[] }[];
};

// Calendar_Options, Calendar_Navigation, Calendar_State, Calendar_Api: as in State, above.

export type Calendar_Instance<TData, TResourceData, TViews> = {
  store: Store<Calendar_State<TData, TResourceData, TViews>>;
  api: Calendar_Api<TViews>;
  setOptions: (options: Calendar_Options<TData, TResourceData, TViews>) => void;
  mount: () => () => void; // starts the clock; returns unmount (D11)
};
```

```ts
// core/calendar.ts
export const calendar_create = <
  TData,
  TResourceData = unknown,
  TViews extends Record<string, Calendar_ViewDefinition> = Record<string, Calendar_ViewDefinition>,
>(
  options: Calendar_Options<TData, TResourceData, TViews>,
): Calendar_Instance<TData, TResourceData, TViews> => {
  // options store + now store (fed by clock) → derived context and layout per layout kind (D1)
  // normalise events with withTimeZone(timeZone) (D7); warn on duplicate ids in development (D2)
  // api actions compute the next navigation from current options and call onNavigate (D5)
};

export const calendar_navigation = <TViews>(
  views: TViews,
  view: keyof TViews,
  date: Temporal.PlainDate,
  options: { firstDayOfWeek?: number },
) => {
  // pure: range and period for any view and date (app R2.5)
};

// core/views.ts
export const dayGridView = (options: Calendar_DayGridViewSettings) => ({ kind: 'dayGrid' as const, ...options });
export const timeGridView = (options: {
  days: number;
  groupBy?: 'resource';
  groupOrder?: 'resource-first' | 'date-first';
  allDay?: boolean;
  slotDuration?: Temporal.Duration;
  minColumnWidth?: string;
}) => ({ kind: 'timeGrid' as const, ...options });
export const listView = (options: { days: number }) => ({ kind: 'list' as const, ...options });

// core/clock.ts
export const clock_interval = (options: { every: Temporal.Duration }): Calendar_Clock => {
  // …
};
export const clock_fixed = (instant: Temporal.Instant): Calendar_Clock => {
  // …
};

// core/event-store.ts
export const eventStore_create = <TData>(initial: Calendar_EventInput<TData>[] = []) => {
  // returns { store, add (upsert by id), remove, update, reset } (D2)
};
```

```tsx
// react/use-calendar.ts
export const useCalendar = <
  TData,
  TResourceData = unknown,
  TViews extends Record<string, Calendar_ViewDefinition> = Record<string, Calendar_ViewDefinition>,
>(
  options: Calendar_Options<TData, TResourceData, TViews>,
) => {
  // create once; setOptions on every render; mount through useStore lifecycle (D5, D11)
};

export const useCalendarContext = () => {
  // throws outside Calendar_Root / Calendar_RootProvider
};

export const useCalendarSelector = <TSelected,>(
  selector: (state: Calendar_State<unknown, unknown, unknown>) => TSelected,
) => {
  // @tanstack/react-store useStore(instance.store, selector) (D10)
};

// react/calendar-root.tsx
export const Calendar_Root = ({
  children,
  ...options
}: Calendar_Options<unknown, unknown, Record<string, Calendar_ViewDefinition>> & { children: ReactNode }) => {
  // useCalendar(options) + provider (D6)
};

export const Calendar_RootProvider = ({
  value,
  children,
}: {
  value: Calendar_Instance<unknown, unknown, unknown>;
  children: ReactNode;
}) => {
  // provider only (D6)
};

// react/day-grid-view.tsx: each part renders its default element or `render` (D25) with data-scope/data-part (D3, D9)
export const DayGridView_Root = ({
  model,
  ...props
}: { model: Calendar_DayGridLayout<unknown> } & PartProps<'div'>) => {
  // role="grid"; provides the model to its parts
};
export const DayGridView_Header = (props: PartProps<'div'>) => {};
export const DayGridView_HeaderCell = ({ weekday, ...props }: { weekday: Temporal.PlainDate } & PartProps<'div'>) => {};
export const DayGridView_Week = ({
  week,
  ...props
}: { week: Calendar_DayGridLayout<unknown>['weeks'][number] } & PartProps<'div'>) => {
  // role="row"; --cal-rows
};
export const DayGridView_Day = ({ day, ...props }: { day: Calendar_DayGridDay } & PartProps<'div'>) => {
  // role="gridcell"; data-today, data-outside
};
export const DayGridView_DayTrigger = ({
  day,
  view,
  ...props
}: { day: Calendar_DayGridDay; view: string } & PartProps<'button'>) => {
  // click → api.navigate({ view, date: day.date }) unless defaultPrevented (D22)
};
export const DayGridView_WeekEvent = ({
  segment,
  ...props
}: { segment: Calendar_DayGridSegment<unknown> } & PartProps<'button'>) => {
  // --cal-col-start, --cal-col-span, --cal-row; data-continues-before/after (D17)
};
export const DayGridView_Overflow = ({ day, ...props }: { day: Calendar_DayGridDay } & PartProps<'button'>) => {
  // renders only when day.hasMore; data-hidden-count (D14)
};

// react/time-grid-view.tsx
export const TimeGridView_Root = ({
  model,
  ...props
}: { model: Calendar_TimeGridLayout<unknown, unknown> } & PartProps<'div'>) => {};
export const TimeGridView_Header = (props: PartProps<'div'>) => {};
export const TimeGridView_ColumnHeader = ({
  column,
  ...props
}: { column: Calendar_TimeGridColumn<unknown, unknown> } & PartProps<'div'>) => {
  // data-today, data-unavailable (app R7.2)
};
export const TimeGridView_ColumnTrigger = ({
  column,
  view,
  ...props
}: { column: Calendar_TimeGridColumn<unknown, unknown>; view: string } & PartProps<'button'>) => {};
export const TimeGridView_AllDay = (props: PartProps<'div'>) => {};
export const TimeGridView_AllDayCell = ({
  column,
  ...props
}: { column: Calendar_TimeGridColumn<unknown, unknown> } & PartProps<'div'>) => {};
export const TimeGridView_AllDayEvent = ({
  segment,
  ...props
}: { segment: Calendar_DayGridSegment<unknown> } & PartProps<'button'>) => {};
export const TimeGridView_Body = (props: PartProps<'div'>) => {
  // --cal-slots
};
export const TimeGridView_Axis = (props: PartProps<'div'>) => {};
export const TimeGridView_AxisLabel = ({
  slot,
  ...props
}: { slot: Calendar_TimeGridLayout<unknown, unknown>['slots'][number] } & PartProps<'div'>) => {};
export const TimeGridView_Column = ({
  column,
  ...props
}: { column: Calendar_TimeGridColumn<unknown, unknown> } & PartProps<'div'>) => {};
export const TimeGridView_Unavailable = ({
  segment,
  ...props
}: { segment: Calendar_TimeGridColumn<unknown, unknown>['unavailable'][number] } & PartProps<'div'>) => {};
export const TimeGridView_Event = ({
  segment,
  ...props
}: { segment: Calendar_TimeGridSegment<unknown> } & PartProps<'button'>) => {
  // --cal-start, --cal-span, --cal-lane, --cal-lanes (D9)
};
export const TimeGridView_NowIndicator = ({
  column,
  ...props
}: { column: Calendar_TimeGridColumn<unknown, unknown> } & PartProps<'div'>) => {
  // renders only when column.now is defined; --cal-now
};

// react/list-view.tsx
export const ListView_Root = ({ model, ...props }: { model: Calendar_ListLayout<unknown> } & PartProps<'div'>) => {};
export const ListView_Day = ({
  day,
  ...props
}: { day: Calendar_ListLayout<unknown>['days'][number] } & PartProps<'section'>) => {};
export const ListView_DayHeader = ({
  day,
  ...props
}: { day: Calendar_ListLayout<unknown>['days'][number] } & PartProps<'h3'>) => {};
export const ListView_Event = ({ event, ...props }: { event: Calendar_Event<unknown> } & PartProps<'button'>) => {};
export const ListView_Empty = (props: PartProps<'div'>) => {
  // renders only when the root model has no days (D18)
};
```

Generic parameters are shown as `unknown` on the parts for brevity; the real parts infer `TData`/`TResourceData` from `model`/`segment` (D8).

## Open questions

**From implementing the Solid adapter (`packages/solid`):**

- `calendarProps_merge` chains handlers only when both are functions; Solid's bound-handler form (`onClick={[fn, data]}`) replaces the part's handler instead.
- As in Ark, a part reads `render` once when it is created; switching between `render` and no `render` on a live part does not re-render it.
- Tests mount with a local `tests_render` helper over `solid-js/web`'s `render`, because `vitest-browser-solid@1.0.1` declares a `vitest@^4` peer and the repo runs Vitest 5.
- `vite-plugin-solid` sets a `jsdom` test environment unless one is given, so the package's Vite config sets `environment: 'node'`; the tests still run in the browser.

**From implementing the React adapter (`lib/calendar/react`):**

- The factory is `calendarFactory_elements` (`<calendar.div>` inside the parts) and the merge is `calendarProps_merge`, following the scope-prefix rule; neither is part of the public entry yet.
- Event-carrying parts keep `TData` through a typed `forwardRef` cast, so `segment.event.data` is typed without casts at the call site (D8).
- `Calendar_RootProvider` memoises its context value; without it every part re-rendered on any parent render (caught by the selector test).
- `useCalendarEventStore(initial)` returns the store's actions plus the current `events`.
- `vitest.config.mts` pre-optimises `@tanstack/store`, `@tanstack/react-store` and `temporal-polyfill`; otherwise Vite discovers them mid-run, reloads, and duplicates React (null hook dispatcher).
- `knip` flags public exports with no consumer yet (`Calendar_Root`, `useCalendarEventStore`, `calendar_navigation`, `calendarClock_interval`, the render types) until the app uses the library.

**From implementing the core (`lib/calendar/core`):**

- Exports follow the repo's scope-prefix rule, so the skeleton's names changed: `dayGridView`/`timeGridView`/`listView` → `calendarView_month`/`calendarView_timeGrid`/`calendarView_list`; `clock_interval`/`clock_fixed` → `calendarClock_interval`/`calendarClock_fixed`; `eventStore_create` → `calendarEventStore_create`. `calendar_create` and `calendar_navigation` are unchanged.
- The event store's `update` takes an updater (`update(id, event => next)`) instead of a partial patch, because a `Partial` of the timed/all-day union type-checks invalid mixes.
- Duplicate event ids are reported with `console.error` (the lint config bans `console.warn`; React reports keys the same way).
- The D21 lint boundary is implemented in `eslint.config.mjs`: `lib/calendar/core/**` (excluding `tests/`) cannot import React, `@tanstack/react-*`, `~/…` or the React adapter.
- ~~Time-grid fractions use real day lengths under a fixed 24-hour slot axis, misaligning DST positions.~~ Settled by D40.
- `knip` reports `lib/calendar/core/index.ts` as unused until an adapter imports it.

**From the prototype:**

- ~~TanStack Store 0.11 has no `Derived` class or store `mount`; the State section is outdated.~~ Resolved by D24 (`'~mount'`, derived `createStore(() => …)`).
- ~~`useCalendar` syncs with `useLayoutEffect(setOptions)`.~~ Replaced by D24's `'~update'` through `useIsomorphicLayoutEffect`, as in oxform.
- `TimeGridView_AxisLabel`'s `slot` is the axis row's model (one time slot), not a polymorphism prop; it shadows the native HTML `slot` attribute (Web Components slot assignment), which is omitted from part props. Consider renaming it (`axisSlot`).
- ~~`render` does not forward refs yet.~~ Parts are `forwardRef` and refs compose through `cal.*` (D25).
- Ark v6 moves to component-specific attributes (`data-popover-trigger`); whether parts should emit `data-calendar-*` instead of `data-scope`/`data-part` is open.
- ~~`@zag-js/react` (for `mergeProps`) is a transitive dependency.~~ Replaced by the local `props_merge` (D25).
- `api.today()` must read the injected clock, not `Temporal.Now` (caught in the prototype; fixed there).

**From the verification pass (risks from outvoted dissents):**

- ~~_correctness_ (D1, time-grid layout): lane assignment is unspecified: per overlap cluster or per column, whether touching events overlap, and how split segments take part.~~ Settled in D38: per cluster, touching events do not overlap, and split segments take part in each day's column on their own.
- _simplicity_ (D17, month cap): a row cap can hide an event on a day that has free rows, because a bar from a neighbouring day pushed it down.
- ~~_contract-compatibility_ (D1): `layout` is a closed union and the sketch matches it `.exhaustive()`, so adding a layout kind is a breaking change for consumers.~~ Addressed in the D1 rewrite (open union, `.otherwise()`).

- Temporal browser support and polyfill choice.
- App spec Q1 (min column width): handled as `minColumnWidth` → CSS variable; confirm the app still wants it.
- App spec Q2 (list-on-mobile): stays app logic under D5 (the app picks the view key); no core support planned.
- ~~DST days: fixed 24-hour slots or real 23/25-hour axes?~~ Settled by D40: fixed clock slots and equal date widths.
- `TResourceData` as a second generic: assumed alongside `TData` (D8), not asked.
- D2: the development-only warning on duplicate ids was added without asking.
- D17: `dayOverflow` is data-dependent but sits in the static view definition; it may belong on the calendar options instead.
