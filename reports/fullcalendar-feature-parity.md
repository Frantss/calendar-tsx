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
