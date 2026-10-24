# FullCalendar feature parity

## Snapshot: 2026-10-23

Compared calendar-tsx at `4516acf` with the current [FullCalendar v7 documentation](https://fullcalendar.io/docs),
which identifies v7.1.3 as the latest release, dated 2026-10-15. FullCalendar resource views are Premium.

This is a source and documentation audit. Existing test cases were inspected, but tests and browser checks were
not run. “Covered” means the capability exists; it does not establish identical algorithms, defaults, appearance,
or API compatibility. “Consumer” identifies functionality the design assigns to the application.

## Views and layout

| Capability                                              | calendar-tsx status and evidence                                                                                                                                                                                                                                                                               | FullCalendar baseline                                                                                                                                                                                                           |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Month grid                                              | **Covered.** Spanning bars, padding dates, row caps and optional six-week grids. `packages/core/src/calendar-layouts.ts:24`; `packages/core/src/layout/layout-month.ts:14`.                                                                                                                                    | [Month view](https://fullcalendar.io/docs/month-view).                                                                                                                                                                          |
| Week-based day grids                                    | **Covered.** `dayGridView({ weeks })` reuses the month model and parts. `packages/core/src/calendar-views.ts:48`.                                                                                                                                                                                              | [DayGrid](https://fullcalendar.io/docs/daygrid-view).                                                                                                                                                                           |
| Single-day/N-day day grids, year grids, multiple months | **Missing as built-in views.** Day grids accept whole weeks; month views navigate one month. `packages/core/src/calendar.types.ts:137`; `packages/core/src/calendar-layouts.ts:24`.                                                                                                                            | [DayGrid](https://fullcalendar.io/docs/daygrid-view), [Multi-Month Stack](https://fullcalendar.io/docs/multimonth-stack), [Multi-Month Grid](https://fullcalendar.io/docs/multimonth-grid).                                     |
| Day/week/N-day time grids                               | **Covered.** Timed lanes, spanning all-day bars, optional all-day row and configurable slot minutes. `packages/core/src/calendar.types.ts:154`; `packages/core/src/layout/layout-time-grid.ts:231`.                                                                                                            | [TimeGrid](https://fullcalendar.io/docs/timegrid-view).                                                                                                                                                                         |
| Day/week/month/year lists                               | **Covered.** Day counts or calendar month/year periods; empty days omitted. `packages/core/src/calendar.types.ts:169`; `packages/core/src/calendar-layouts.ts:87`.                                                                                                                                             | [List view](https://fullcalendar.io/docs/list-view).                                                                                                                                                                            |
| Resource time grids                                     | **Covered for flat resources.** Multi-resource events, resource/date grouping order, availability shading. `packages/core/src/layout/layout-time-grid.ts:231`.                                                                                                                                                 | [Vertical Resource, Premium](https://fullcalendar.io/docs/vertical-resource-view).                                                                                                                                              |
| Resource day grids                                      | **Missing.** Month/day-grid models have no resource grouping. `packages/core/src/calendar.types.ts:179`.                                                                                                                                                                                                       | [Vertical Resource, Premium](https://fullcalendar.io/docs/vertical-resource-view), including Resource DayGrid.                                                                                                                  |
| Resource and plain timelines                            | **Partial.** Day-count periods, flat resource rows, stacked bars, availability and now indicator exist. No built-in calendar-month/year period, resource tree, grouping by resource field or resource data grid. `packages/core/src/calendar.types.ts:172`; `packages/core/src/layout/layout-timeline.ts:113`. | [Timeline, Premium](https://fullcalendar.io/docs/timeline-view), [resource hierarchy](https://fullcalendar.io/docs/resource-parsing), [resource grouping](https://fullcalendar.io/docs/resourceGroupField).                     |
| Time-grid visual overlap                                | **Covered with different defaults.** Free-lane expansion, side-by-side default and optional cascade. `packages/core/src/layout/layout-lanes.ts:16`; `packages/core/src/layout/layout-time-grid.ts:265`.                                                                                                        | [slotEventOverlap](https://fullcalendar.io/docs/slotEventOverlap) defaults to overlap. Exact placement parity was not established.                                                                                              |
| Brief event size and short style                        | **Partial.** `minEventMinutes` and `shortEventMinutes` measure duration; defaults are 15 and 30 minutes. `packages/core/src/calendar.types.ts:163`.                                                                                                                                                            | [eventMinHeight](https://fullcalendar.io/docs/eventMinHeight) and [eventShortHeight](https://fullcalendar.io/docs/eventShortHeight) measure height; defaults are 15 and 30 pixels, per design D39's checked units.              |
| Overflow                                                | **Partial.** Month/day-grid row cap, hidden count, overflow hint and button. No built-in popover or stack cap in time-grid/timeline/all-day layouts. `packages/core/src/layout/layout-month.ts:43`; `packages/react/src/month-view.tsx:180`; `packages/core/src/calendar.types.ts:154`.                        | [dayMaxEvents](https://fullcalendar.io/docs/dayMaxEvents), [eventMaxStack](https://fullcalendar.io/docs/eventMaxStack), including default popovers.                                                                             |
| Visible hours, hidden weekdays, navigation bounds       | **Missing built-in options.** Time grids generate a full midnight-to-midnight axis; settings have no hidden days or valid range. `packages/core/src/layout/layout-time-grid.ts:269`; `packages/core/src/calendar.types.ts:474`.                                                                                | [slotMinTime](https://fullcalendar.io/docs/slotMinTime), [slotMaxTime](https://fullcalendar.io/docs/slotMaxTime), [hiddenDays](https://fullcalendar.io/docs/hiddenDays), [validRange](https://fullcalendar.io/docs/validRange). |
| Initial/programmatic scroll time                        | **Consumer.** Parts expose DOM refs; no calendar scroll-time API. `packages/core/src/calendar.types.ts:533`; `packages/react/src/time-grid-view.tsx:20`.                                                                                                                                                       | [scrollTime](https://fullcalendar.io/docs/scrollTime), [scrollToTime](https://fullcalendar.io/docs/scrollToTime).                                                                                                               |
| Virtualization                                          | **Missing built-in support.** The core builds all visible-range columns/rows; consumers render the parts. `packages/core/src/layout/layout-time-grid.ts:253`; `packages/core/src/layout/layout-timeline.ts:155`.                                                                                               | [Virtual rendering](https://fullcalendar.io/docs/virtual-rendering) is available for resource Timeline in both directions. Other view support is planned.                                                                       |

## Backgrounds, interactions and application services

| Capability                                            | calendar-tsx status and evidence                                                                                                                                                                                                                                                                                                                                                                                                       | FullCalendar baseline                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Background events                                     | **Partial.** `display: 'background'` works in time-grid columns/all-day rows and month/day-grid all-day spans. Lists omit backgrounds; timelines receive no background-event input. `packages/core/src/calendar-layouts.ts:105`; `packages/core/src/calendar.types.ts:200`.                                                                                                                                                            | [Background events](https://fullcalendar.io/docs/background-events). Timeline-specific upstream behavior was not established by that page.                                                                                                                                                                                                           |
| Inverse backgrounds and business hours                | **Partial.** Named layers can invert fixed or weekly ranges, optionally per resource, in month/time-grid models. No `display: 'inverse-background'`, event `groupId`, timeline layer decorator or interaction enforcement. Availability shades resource time grids and timelines separately. `packages/core/src/calendar.types.ts:4`; `packages/core/src/calendar-backgrounds.ts:23`; `packages/core/src/calendar-backgrounds.ts:149`. | [Background events](https://fullcalendar.io/docs/background-events), [business hours](https://fullcalendar.io/docs/business-hours), [per-resource timeline business hours](https://fullcalendar.io/docs/businessHours-per-resource), [eventConstraint](https://fullcalendar.io/docs/eventConstraint). Shading and enforced constraints are distinct. |
| Navigation and now indicator                          | **Covered with different ownership.** Navigation emits `onNavigate`; the application supplies updated view/date. Injected clocks drive now indicators. `packages/core/src/calendar.ts:230`; `packages/core/src/calendar.ts:241`.                                                                                                                                                                                                       | [Date navigation](https://fullcalendar.io/docs/date-navigation), [now indicator](https://fullcalendar.io/docs/now-indicator).                                                                                                                                                                                                                        |
| Event activation and day navigation                   | **Covered through parts.** Native event buttons accept handlers; day/header triggers navigate. No slot hit-testing or slot-click API. `packages/react/src/month-view.tsx:108`; `packages/react/src/time-grid-view.tsx:92`; `docs/design.md:384`.                                                                                                                                                                                       | [Event clicking](https://fullcalendar.io/docs/eventClick), [date clicking and selecting](https://fullcalendar.io/docs/date-clicking-selecting).                                                                                                                                                                                                      |
| Drag, resize, external drops, touch editing           | **Missing.** The design explicitly excludes drag/resize; the feature registry is extension infrastructure, not an interaction implementation. `docs/design.md:15`; `packages/core/export/index.ts:1`.                                                                                                                                                                                                                                  | [Dragging and resizing](https://fullcalendar.io/docs/event-dragging-resizing).                                                                                                                                                                                                                                                                       |
| Date/time range selection and interaction constraints | **Missing.** No selection state/actions, hit-testing, overlap permission or drop-validation engine. `docs/design.md:15`; `packages/core/src/calendar.types.ts:397`; `packages/core/src/calendar.types.ts:533`.                                                                                                                                                                                                                         | [Date selection](https://fullcalendar.io/docs/date-clicking-selecting), [eventConstraint](https://fullcalendar.io/docs/eventConstraint).                                                                                                                                                                                                             |
| Recurring events                                      | **Missing built-in expansion.** Events require concrete Temporal dates; weekly range generation applies to background layers only. `packages/core/src/calendar.types.ts:7`; `packages/core/src/calendar-backgrounds.ts:23`.                                                                                                                                                                                                            | [Recurring events](https://fullcalendar.io/docs/recurring-events), [RRule plugin](https://fullcalendar.io/docs/rrule-plugin).                                                                                                                                                                                                                        |
| Event/resource fetching, feeds, loading, refetch      | **Consumer.** Events/resources are arrays; fetching and loading belong to the application. `packages/core/src/calendar.types.ts:493`; `docs/design.md:13`; `docs/design.md:464`.                                                                                                                                                                                                                                                       | [Event sources](https://fullcalendar.io/docs/event-source), [resource data, Premium](https://fullcalendar.io/docs/resource-data).                                                                                                                                                                                                                    |
| Event mutation                                        | **Partial, separate store.** Optional `createEventStore` has upsert/remove/update/reset; the calendar consumes its event array. No FullCalendar Event Object mutation API. `packages/core/src/calendar-event-store.ts:9`.                                                                                                                                                                                                              | [Event Object](https://fullcalendar.io/docs/event-object).                                                                                                                                                                                                                                                                                           |
| Toolbar, event content, labels, overflow UI           | **Consumer by design.** Composable React/Solid parts and optional CSS themes; no built-in toolbar or overflow popover. `docs/design.md:13`; `docs/design.md:392`; `packages/react/readme.md:48`.                                                                                                                                                                                                                                       | [Toolbar](https://fullcalendar.io/docs/toolbar), [event popover](https://fullcalendar.io/docs/event-popover).                                                                                                                                                                                                                                        |
| Localization and week numbers                         | **Partial.** Locale formats accessible date text; visible copy is consumer-rendered. Trigger prefixes and region names default to English; first weekday is explicit and defaults to Sunday. No built-in week-number model. `packages/react/src/calendar-parts.ts:19`; `packages/react/src/month-view.tsx:118`; `packages/core/src/calendar-navigation.ts:12`; `packages/core/src/calendar.types.ts:219`.                              | [locale](https://fullcalendar.io/docs/locale), [weekNumberCalculation](https://fullcalendar.io/docs/weekNumberCalculation).                                                                                                                                                                                                                          |
| Accessibility                                         | **Semantic parts present; conformance unverified.** Grid/region roles and native buttons; DOM tab order, no roving focus. `packages/react/src/month-view.tsx:30`; `packages/react/src/time-grid-view.tsx:39`; `docs/design.md:400`.                                                                                                                                                                                                    | [Accessibility](https://fullcalendar.io/docs/accessibility) documents ARIA, keyboard focus and configurable hints. This audit establishes no conformance rating for either library.                                                                                                                                                                  |

## Findings that affect migration

### 1. All-day end dates have different meanings

- **What:** calendar-tsx's all-day `end` and visible-range `end` are inclusive. FullCalendar's event `end` is exclusive.
  An all-day span with start March 11 and end March 12 covers two days here and one day in FullCalendar.
- **Where:** `packages/core/src/calendar.types.ts:22`; `packages/core/src/calendar-events.ts:33`;
  `packages/core/src/calendar-navigation.ts:17`; [FullCalendar Event Object](https://fullcalendar.io/docs/event-object).
- **Why it matters:** reusing all-day dates without accounting for the contract changes the displayed duration.

### 2. D38 and D39 close capability gaps, with different defaults and units

- **What:** cascade/expansion and brief-event sizing now exist. Side-by-side remains the default here; FullCalendar
  defaults to overlapping. Minimum/short thresholds use minutes here and pixels upstream. Lane placement also uses
  the stretched duration here.
- **Where:** `packages/core/src/layout/layout-lanes.ts:16`; `packages/core/src/layout/layout-time-grid.ts:82`;
  `packages/core/src/layout/layout-time-grid.ts:265`; `docs/design.md:1039`; `docs/design.md:1061`;
  [slotEventOverlap](https://fullcalendar.io/docs/slotEventOverlap),
  [eventMinHeight](https://fullcalendar.io/docs/eventMinHeight),
  [eventShortHeight](https://fullcalendar.io/docs/eventShortHeight).
- **Why it matters:** matching feature names or numeric values does not establish the same geometry. Upstream
  algorithm equivalence and its treatment of minimum-height events were not verified.

### 3. Background support does not cover the timeline

- **What:** the timeline layout receives foreground events only. `backgroundFeature` decorates month and time-grid
  kinds only. Resource availability still produces timeline unavailable segments.
- **Where:** `packages/core/src/calendar-layouts.ts:105`; `packages/core/src/calendar-backgrounds.ts:149`;
  `packages/core/src/layout/layout-timeline.ts:103`; `docs/design.md:1024`.
- **Why it matters:** using the same events/layers across views can make dated closures or business-hour shading
  disappear when switching to the timeline. FullCalendar documents [per-resource timeline business hours](https://fullcalendar.io/docs/businessHours-per-resource).
  Its timeline background-event behavior remains unverified here.

### 4. Named-zone support does not establish DST axis parity

- **What:** timed events normalize into the configured zone. Geometry uses elapsed milliseconds within each actual
  day, while slot labels divide a nominal 24-hour day evenly. On DST transitions those coordinate systems disagree.
- **Where:** `packages/core/src/calendar-events.ts:85`; `packages/core/src/layout/layout-time-grid.ts:64`;
  `packages/core/src/layout/layout-time-grid.ts:273`; `packages/core/src/layout/layout-timeline.ts:129`;
  `docs/design.md:1604`.
- **Why it matters:** named-zone conversion exists, but event alignment with displayed clock labels remains a known
  limit. FullCalendar's exact DST geometry was not checked in this audit.

### 5. The feature mechanism does not implement editing or recurrence

- **What:** D29 provides feature state, actions and decoration hooks. Drag, resize, selection and event recurrence
  remain unsupported; D29's drag examples describe a possible feature rather than a shipped one.
- **Where:** `docs/design.md:15`; `docs/design.md:617`; `packages/core/src/calendar.types.ts:384`;
  `packages/core/export/index.ts:1`.
- **Why it matters:** these remain functional gaps against FullCalendar even though the extension points exist.

RTL behavior, print layouts, connector coverage and every individual FullCalendar option were not audited.
No runtime code, design decisions or existing reports were changed.

## Verification

- Formatting passed for this file with `pnpm run fix:format reports/fullcalendar-feature-parity.md` and
  `pnpm exec vp fmt --check reports/fullcalendar-feature-parity.md`.
- All 64 distinct local `path:line` references resolve to existing source lines. External links point to the
  official documentation inspected for this audit.
- The first formatter invocation triggered pnpm dependency synchronization and failed with
  `dns error: failed to lookup address information: nodename nor servname provided, or not known`.
  `pnpm install --frozen-lockfile` restored dependencies; the formatter rerun passed. No tracked dependency files changed.
- Build, type checks, tests and browser verification were skipped for this documentation-only change.

## Code recheck: 2026-10-23, `106efce`

The following findings supersede the broad “partial” labels above. This pass traced core builders, exported
React/Solid parts, prop merging, theme rules, application examples and existing tests. It uses implementation
boundaries as evidence of missing built-in behavior. The library packages have no tracked changes between the
original snapshot `4516acf` and this revision; the documentation app has changed.

### 6. Brief-event sizing is implemented, with a different contract

- **What:** minimum-duration expansion feeds lane assignment and segment geometry without changing the event's
  actual end. Both adapters emit `data-short`; the default theme gives short events a one-line layout. This
  capability is covered. Duration-based thresholds are an API/geometry difference from FullCalendar's pixel-based
  thresholds, rather than evidence of unfinished implementation.
- **Where:** `packages/core/src/layout/layout-time-grid.ts:80`; `packages/core/src/layout/layout-time-grid.ts:136`;
  `packages/react/src/time-grid-view.tsx:295`; `packages/solid/src/time-grid-view.tsx:305`;
  `packages/themes/default.css:302`; `packages/core/src/tests/layout-time-grid.spec.ts:80`.
- **Why it matters:** the previous “partial” label overstated the functional gap. Exact pixel sizing and identical
  overlap geometry remain separate compatibility questions.

### 7. Inverse shading and weekly business hours are implemented through layers

- **What:** each layer combines its ranges before taking their complement. Weekly rules generate timed ranges,
  including overnight rules. Month models shade closed days; time-grid models shade closed time intervals, with
  optional resource filtering. The absence of FullCalendar's `inverse-background` event flag or `groupId` is an API
  difference: a layer already groups ranges for inverse shading. Timeline background-event/layer support remains
  absent: its builder receives no background events and the decorator handles only month/time-grid kinds.
  Timeline resource availability independently produces unavailable segments.
- **Where:** `packages/core/src/calendar-backgrounds.ts:30`; `packages/core/src/calendar-backgrounds.ts:100`;
  `packages/core/src/calendar-backgrounds.ts:121`; `packages/core/src/calendar-backgrounds.ts:157`;
  `packages/core/src/calendar-layouts.ts:110`; `packages/core/src/layout/layout-timeline.ts:89`;
  `packages/core/src/tests/calendar-backgrounds.spec.ts:80`;
  `packages/core/src/tests/layout-timeline.spec.ts:134`.
- **Why it matters:** inverse shading and working-hours visualization are covered within those view boundaries.
  Timeline layer coverage is a real gap. Interaction enforcement belongs to the separate missing interaction engine.

### 8. Month overflow provides the complete primitive and event data

- **What:** row clipping calculates `hiddenCount` and `hasMore`, retains every matching event in `day.events`, and
  exposes conditional overflow buttons in both adapters. React and Solid application examples compose these with
  an open dialog. The library exports no popup component. Time-grid/all-day/timeline stack caps remain absent.
- **Where:** `packages/core/src/layout/layout-month.ts:43`; `packages/core/src/layout/layout-month.ts:66`;
  `packages/react/src/month-view.tsx:186`; `packages/solid/src/month-view.tsx:207`;
  `apps/docs/examples/react/overflow.tsx:8`; `apps/docs/examples/solid/overflow.tsx:8`;
  `packages/core/src/tests/layout-month.spec.ts:83`; `packages/core/src/calendar.types.ts:154`;
  `packages/core/src/layout/layout-timeline.ts:102`.
- **Why it matters:** month overflow is covered as a headless capability. A packaged popover is consumer-owned UI;
  missing stack caps in other layouts are a distinct layout limitation.

### 9. Localization supports consumer text and label overrides

- **What:** both adapters format default date labels with the configured locale. Visible labels are consumer
  children; the playground formats weekday, date and time text using the selected locale. English defaults such as
  `Go to` and `Time grid` can be replaced through `aria-label`, because consumer props merge after defaults. There
  is no locale dictionary, automatic locale-derived first weekday or built-in week-number model.
- **Where:** `packages/react/src/calendar-parts.ts:19`; `packages/react/src/calendar-factory.tsx:24`;
  `packages/react/src/month-view.tsx:115`; `packages/react/src/time-grid-view.tsx:37`;
  `packages/solid/src/calendar-factory.tsx:40`; `packages/solid/src/month-view.tsx:132`;
  `apps/docs/src/playground/preview-views.tsx:38`; `apps/docs/src/playground/preview-views.tsx:58`;
  `packages/core/src/calendar-navigation.ts:12`; `packages/core/src/calendar.types.ts:219`;
  `packages/react/src/tests/month-view.spec.tsx:136`.
- **Why it matters:** the code supports localized rendering and replacing English labels. FullCalendar-style
  automatic locale defaults and week-number support remain absent. “No built-in translated labels” should not imply
  that the parts prevent translation.

### 10. Timeline limitations remain present in the implementation

- **What:** `timelineView` accepts a day count; navigation advances that count. Layout maps a flat resource array to
  rows and stacks every overlapping event without a cap. Its output has no tree, resource groups, background events
  or windowing metadata. Both adapters export row/resource/lane/event/unavailable parts, without built-in hierarchy,
  data-column or virtualization components.
- **Where:** `packages/core/src/calendar.types.ts:172`; `packages/core/src/calendar-layouts.ts:105`;
  `packages/core/src/layout/layout-timeline.ts:136`; `packages/core/src/layout/layout-timeline.ts:155`;
  `packages/react/export/index.ts:43`; `packages/solid/export/index.ts:44`.
- **Why it matters:** flat timelines are covered. Calendar-month/year navigation, resource trees/grouping, resource
  data grids, background layers, stack caps and built-in virtualization remain gaps against the broader upstream view.

### Recheck verification

- Core: **54 tests passed**, covering backgrounds, timeline, time-grid and month layouts.
- React: **32 tests passed**; Solid: **32 tests passed**, each covering the factory, month, time-grid, timeline and
  background parts. These are browser tests. No new tests or runtime changes were made.
- The first adapter run loaded an older core build and failed with errors including
  `does not provide an export named 'backgroundFeature'`, `dayGridView` and `timelineView`. Rebuilding core with its
  existing `pnpm run build` script and rerunning the same tests produced the passing results above.
- The pnpm launcher initially failed with `spawnSync .../12.5.1/bin/pnpm ENOEXEC`. Commands used the already-installed
  native pnpm 12.5.1 executable. The sandbox initially blocked the browser server with `listen EPERM`; the permitted
  reruns used the local browser server outside the sandbox.
- Full workspace builds, type checks and package validation were not needed for this report-only edit.

## Implementation boundaries checked for effort ranking: `a4911b5`

### 11. Feature event stages receive already-filtered events

- **What:** the core normalizes events, filters them to the visible date range, separates backgrounds and sorts
  foreground events before invoking feature `events` stages. There is no pre-filter expansion hook in the exported
  feature interface.
- **Where:** `packages/core/src/calendar.ts:190`; `packages/core/src/calendar.ts:200`;
  `packages/core/src/calendar.types.ts:385`.
- **Why it matters:** recurrence expansion cannot assume that a recurring master outside the visible range reaches
  an existing feature stage. Built-in recurrence therefore touches input processing as well as occurrence generation.

### 12. Bar geometry assumes contiguous date columns

- **What:** the shared bar helper derives column indices from calendar-day distance to the first date. Month rows
  advance seven dates at a time, and the base theme fixes month columns and span fractions to seven.
- **Where:** `packages/core/src/layout/layout-bars.ts:42`; `packages/core/src/layout/layout-month.ts:34`;
  `packages/themes/base.css:22`; `packages/themes/base.css:64`.
- **Why it matters:** hidden weekdays and shorter day grids affect packing and geometry, rather than only filtering
  rendered cells. Existing multi-day events and background spans depend on those coordinates.

## DST status after D40: 2026-10-23

The DST alignment limitation in Finding 4 is resolved under the accepted fixed 24-hour clock-axis contract
(`docs/design.md:1080`). It is no longer a remaining parity gap. Repeated clock hours share positions and timeline
dates keep equal widths. Real timestamps remain on events; displayed bar lengths can differ from elapsed durations.

Evidence: `packages/core/src/layout/layout-axis.ts:10`; `packages/core/src/layout/layout-time-grid.ts:60`;
`packages/core/src/layout/layout-timeline.ts:48`; `packages/core/src/tests/layout-dst.spec.ts:1`.
The original spring/autumn 09:00 alignment repro now matches the slot position at `0.375` in both layouts.

## DST parity clarification after upstream verification: 2026-10-23

The preceding status closes the local alignment defect. Its statement that DST is no longer a parity gap does not
cover the behavioral differences verified in [FullCalendar DST rendering comparison](fullcalendar-dst-behavior.md).

- **What:** FullCalendar TimeGrid projects civil endpoints, with a fallback for rollback-compressed ranges. D40
  instead encloses every visited clock band. FullCalendar's timed Timeline skips missing slots and duplicates
  repeated slots; the local Timeline keeps fixed 24-hour dates.
- **Where:** `packages/core/src/layout/layout-axis.ts:61`; `packages/core/src/layout/layout-timeline.ts:132`;
  `reports/fullcalendar-dst-behavior.md:28`; `reports/fullcalendar-dst-behavior.md:58`.
- **Why it matters:** resolving label alignment under the chosen contract does not establish FullCalendar DST
  behavior parity. The comparison report records the exact v7.1.3 sources and published-release browser checks.

### 13. Input filtering currently uses the anchor-date range

- **What:** before a layout runs, the core filters events against `viewContext.range`; the overlap helper compares
  the event's date span to that range. A Monday-only range excludes an event wholly on Tuesday, even if a future
  Monday overnight display window extends into Tuesday morning.
- **Where:** `packages/core/src/calendar.ts:190`; `packages/core/src/calendar-events.ts:43`;
  `packages/core/src/calendar-navigation.ts:50`.
- **Why it matters:** overnight geometry depends on input coverage as well as position calculations. Events removed
  before layout cannot contribute to that visible overnight portion.

## Coordinate integration after D41: 2026-10-23

- **What:** built-in views now accept hidden ISO weekdays; time-grid and timeline views also accept visible clock
  windows, including overnight windows. Navigation exposes the required input dates, and layouts, background rules,
  availability, labels and now use shared coordinates. Month bars use visible cell indices and retain week rows.
- **Where:** `packages/core/src/calendar.types.ts`; `packages/core/src/calendar-navigation.ts`;
  `packages/core/src/layout/layout-coordinates.ts`; `packages/core/src/tests/layout-visible-window.spec.ts`;
  `packages/themes/src/tests/visible-window.spec.tsx`; `docs/design.md` (D41).
- **Why it matters:** hidden weekdays and visible-hour windows are no longer remaining geometry gaps. Findings 12
  and 13 describe the earlier implementation. D40's chosen DST policy remains distinct from FullCalendar's timed
  Timeline and some TimeGrid crossing-event behavior, as recorded in the separate DST comparison.

## Remaining geometry audit after D41: 2026-10-23

This pass inspected the current working tree, whose committed base is `fd13cd8`; D41's implementation remains
uncommitted. It compares rendering and layout behavior with FullCalendar v7.1.3. The
[upstream geometry evidence](fullcalendar-geometry-upstream.md) records official documentation and tagged source.
API names, option units, toolbars, resource-label content, popovers and consumer-controlled scrolling are excluded.

### Coverage closed by the coordinate integration

- **What:** hidden weekdays, ordinary cropped hours, overnight windows up to 24 nominal hours, next-date input
  coverage, compressed date bars, partial slots and overnight now placement are wired through the layouts and
  both adapters. Source fragments retain DST offsets and occurrences separately from D40 rectangles. Existing
  overlap expansion, minimum sizing, month/day-grid overflow and time-grid shading remain implemented.
- **Where:** `packages/core/src/calendar-navigation.ts:53`; `packages/core/src/calendar.ts:191`;
  `packages/core/src/layout/layout-coordinates.ts:84`; `packages/core/src/layout/layout-time-grid.ts:240`;
  `packages/core/src/layout/layout-timeline.ts:152`; `packages/core/src/tests/layout-visible-window.spec.ts:1`;
  `packages/themes/src/tests/visible-window.spec.tsx:1`.
- **Why it matters:** these no longer belong on the remaining geometry backlog. The original full-day and
  contiguous-column findings above describe older snapshots.

### 14. Stack limits remain absent outside month/day-grid bars

- **What:** time-grid timed lanes, its all-day section and timeline rows still place every matching event. Their
  models have no overflow geometry or hidden-event counts for those surfaces. Month/day-grid row caps remain
  covered. FullCalendar supplies these additional packing limits through
  [eventMaxStack](https://fullcalendar.io/docs/eventMaxStack) and
  [dayMaxEventRows](https://fullcalendar.io/docs/dayMaxEventRows).
- **Where:** `packages/core/src/calendar.types.ts:169`; `packages/core/src/layout/layout-time-grid.ts:126`;
  `packages/core/src/layout/layout-time-grid.ts:218`; `packages/core/src/layout/layout-timeline.ts:34`;
  `packages/core/src/layout/layout-timeline.ts:104`.
- **Why it matters:** dense columns and resource rows can grow without a layout cap. The absent capability is
  overflow packing/data, independently of any consumer-owned popup.

### 15. Timeline still omits background events and background layers

- **What:** the timeline feature passes foreground events to its builder, and the background decorator handles
  only month and time-grid models. Timeline resource availability remains implemented. FullCalendar's tagged
  resource-timeline renderer draws both background-event and business-hour fills; the exact source is linked in
  the upstream evidence report.
- **Where:** `packages/core/src/calendar-layouts.ts:130`; `packages/core/src/layout/layout-timeline.ts:158`;
  `packages/core/src/calendar-backgrounds.ts:163`.
- **Why it matters:** closures supplied as background events or layers disappear when switching to timeline even
  though the coordinate plan can project their intervals. Shading is a remaining layout capability.

### 16. Resource geometry remains flat and excludes DayGrid

- **What:** resources contain identity, title, availability and payload. Timelines map them directly to flat rows;
  month/day-grid models have no resource grouping. FullCalendar supports
  [resource DayGrid](https://fullcalendar.io/docs/vertical-resource-view),
  [group rows](https://fullcalendar.io/docs/resourceGroupField) and
  [expandable resource hierarchies](https://fullcalendar.io/docs/resourcesInitiallyExpanded).
- **Where:** `packages/core/src/calendar.types.ts:43`; `packages/core/src/calendar.types.ts:152`;
  `packages/core/src/calendar.types.ts:160`; `packages/core/src/layout/layout-timeline.ts:156`;
  `packages/core/src/layout/layout-timeline.ts:187`.
- **Why it matters:** resource/date column composition is covered for TimeGrid, but resource DayGrid cells,
  group-row placement and visible tree-row geometry remain outside the built-in model. Label and header content
  itself is consumer-owned and is not counted here.

### 17. Multi-month layout and broader built-in periods remain separate gaps

- **What:** month layout produces one month's padded weeks, DayGrid takes whole weeks, and timeline periods step
  by a fixed day count. FullCalendar includes a responsive
  [multi-month grid/stack](https://fullcalendar.io/docs/multimonth-grid), arbitrary
  [DayGrid periods](https://fullcalendar.io/docs/daygrid-view) and calendar-month/year
  [timelines](https://fullcalendar.io/docs/timeline-view).
- **Where:** `packages/core/src/calendar-layouts.ts:30`; `packages/core/src/calendar-layouts.ts:58`;
  `packages/core/src/calendar-layouts.ts:124`; `packages/core/src/layout/layout-month.ts:42`;
  `packages/core/src/calendar.types.ts:152`.
- **Why it matters:** multiple separately bounded month panels require layout structure not produced here. By
  contrast, N-day DayGrid and calendar-aligned timeline periods are narrower built-in view coverage: custom layout
  features can already supply ranges and stepping. They are not evidence of missing coordinate projection math.

### 18. Valid-date bounds are not represented by the shared coordinate model

- **What:** D41 filters recurring weekdays and local clock windows, but no built-in setting declares a valid date
  interval. Navigation emits the requested date without date-bound eligibility checks, and day models do not carry
  bound-derived disabled state. FullCalendar's [validRange](https://fullcalendar.io/docs/validRange) defines those
  limits independently of view duration or hidden weekdays.
- **Where:** `packages/core/src/calendar.types.ts:142`; `packages/core/src/calendar.types.ts:195`;
  `packages/core/src/calendar.ts:232`; `packages/core/src/calendar.ts:236`.
- **Why it matters:** cropping daily hours does not limit which calendar dates are valid. A custom layout may
  choose its range, and an application may reject navigation, but those do not establish built-in bounded-date
  layout behavior. Toolbar button styling and editing enforcement are outside this rendering audit.

### 19. Extended TimeGrid windows exceed the accepted D41 contract

- **What:** the coordinate builder rejects negative starts, starts at or beyond 24:00 and spans longer than 24
  nominal hours. FullCalendar TimeGrid constructs slots from negative `slotMinTime` through extended
  `slotMaxTime`, including spans longer than a day. Its tagged slot loop and date-profile coverage logic are linked
  in the upstream evidence. FullCalendar timed Timeline caps individual civil windows to 24 hours, so this report
  does not claim equivalent overlapping anchor windows there.
- **Where:** `packages/core/src/layout/layout-coordinates.ts:90`; `docs/design.md:1122`;
  `reports/fullcalendar-geometry-upstream.md:69`.
- **Why it matters:** normal overnight display is covered, but pre-anchor and overlapping per-day clock windows
  remain unavailable. This is a deliberate initial scope limit, rather than a defect within D41's accepted bounds.

### 20. Resource timeline viewport virtualization remains absent

- **What:** coordinate construction visits every visible date, timeline slots cover every date/window and rows map
  every resource. There is no viewport or overscan input to the built-in pipeline. FullCalendar v7 ships
  [resource timeline virtualization](https://fullcalendar.io/docs/virtual-rendering) horizontally for slots/headers
  and vertically for resource/group rows. Its other view families and resource-free timeline are not claimed here.
- **Where:** `packages/core/src/layout/layout-coordinates.ts:110`;
  `packages/core/src/layout/layout-timeline.ts:169`; `packages/core/src/layout/layout-timeline.ts:176`;
  `packages/core/src/layout/layout-timeline.ts:187`.
- **Why it matters:** cached coordinates reduce repeated date/time construction, but do not bound layout or DOM
  work to the scroll viewport. The shipped upstream capability is narrower than general virtualization of every view.

### 21. Sub-minute axis configuration is not representable

- **What:** source instants and projected event fragments retain nanosecond precision, but visible window bounds
  and `slotMinutes` must be integers. FullCalendar TimeGrid's duration parser and slot loop preserve second and
  millisecond offsets, including 30-second slots and window bounds such as 08:00:30. Tagged sources and the timed
  Timeline slot-count caveat are recorded in the upstream evidence report.
- **Where:** `packages/core/src/layout/layout-coordinates.ts:91`;
  `packages/core/src/layout/layout-coordinates.ts:408`;
  `packages/core/src/tests/layout-coordinates.spec.ts:215`.
- **Why it matters:** exact event timestamps do not establish a sub-minute display axis. This is a limit on
  representable geometry, independently of whether duration options are spelled as minutes or duration objects.

### Existing sizing defect, distinct from missing features

The [minimum-column-width report](time-grid-min-column-width.md) now includes a passing Chromium probe: in a 700px
container, configuring `minColumnWidth: '480px'` still produced columns below 480px. A root-property control produced
columns at least 480px wide. D41 did not close this existing CSS-variable propagation defect. FullCalendar's
[dayMinWidth](https://fullcalendar.io/docs/dayMinWidth) establishes minimum-width horizontal scrolling upstream.

### Deliberate policy differences and exclusions

- D40's fixed clock Timeline and transition-enclosing TimeGrid bars still differ from FullCalendar's DST rendering.
  They are accepted policy choices, not unfinished coordinate work. The
  [version-pinned DST comparison](fullcalendar-dst-behavior.md) remains applicable.
- Label cadence can be selected from explicit slots without moving their geometry. DOM refs allow consumer-owned
  scrolling. Neither is counted as a missing geometry feature merely because an upstream option name is absent.
- Pointer drag/resize/selection, snapping and interaction constraints remain separate missing interaction work;
  the coordinate resolver supplies a basis but does not implement those engines. Recurrence and data fetching are
  outside this geometry audit.

### Audit verification

- Focused coordinate, visible-window and DST suites: **64 tests passed** in Chromium.
- Minimum-column-width browser probe: **1 test passed**, using the existing theme harness. Its temporary spec was
  removed after execution; the observations are recorded above and in the sizing report.
- Upstream official documentation and tagged v7.1.3 source were inspected. No upstream runtime tests were run.
- This audit changes reports only. Runtime code and accepted D40/D41 decisions are unchanged. Full builds, type
  checks and package validation are unnecessary for these report-only additions.

### Minimum-column-width status update: 2026-10-23

The sizing defect recorded above is closed in both adapters. The root now exposes the minimum width consumed by
the shared track template (`packages/react/src/time-grid-view.tsx:46`; `packages/solid/src/time-grid-view.tsx:47`).
The permanent Chromium regression at `packages/themes/src/tests/default-theme.spec.tsx:134` verifies seven columns
of at least 480px inside a 700px container, header and all-day bar alignment, and horizontal scrolling. It failed
against the previous code with 90.5625px columns. See the [verification record](time-grid-min-column-width.md).
