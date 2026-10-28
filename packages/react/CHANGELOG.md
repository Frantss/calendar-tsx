# @calendar-tsx/react

## 0.3.0

### Minor Changes

- e10dee3: Keep optional feature state isolated across providers and infer calendar-wide feature fields on layout models.

  Navigation triggers now require a `calendar` prop and check `view` against that instance's registered keys. Pass
  `calendar={calendar}` to day-grid, time-grid and timeline triggers.

  Locale belongs on `CalendarProvider` or `Calendar`. Move `locale` out of core and hook options; the hooks now reject
  it. `Calendar` continues to forward its locale to the provider.

- 4845668: Implement the D54 factory assembly API: configure features with factories, collect them with `calendarFeatures`, bind typed view overrides with `calendarViews`, and pass both results directly to the calendar or adapter hook.

  Breaking: replace feature constants with factory calls and `createCalendarViews` with `calendarViews({ features, views })`. Move feature options into factory arguments or per-view `features` overrides. Registered features now participate in every view. Object overrides shallow-merge with defaults; arrays replace them. Registration aliases preserve feature types and event-source identities. Feature definitions remain fixed after calendar creation; change per-view configuration through new view definitions.

### Patch Changes

- 95ececc: Group adapter sources, types and tests by calendar, rendering and view ownership while preserving the public root exports and framework behavior.
- Updated dependencies [e10dee3]
- Updated dependencies [5ebb6de]
- Updated dependencies [5dcea5c]
- Updated dependencies [10fcb23]
- Updated dependencies [4845668]
- Updated dependencies [c5a703e]
  - @calendar-tsx/core@0.3.0

## 0.2.0

### Minor Changes

- a2136fc: Add optional recurrence powered by rrule-temporal with Temporal dates, string and options-object rules, exceptions, and stable occurrence metadata. Resolve feature-owned definitions before layout and retain series in the existing event stores.
- 3b0b1b8: Give each calendar role its own color in the themes: events use `--calendar-event-color` (tinted with a start stripe,
  solid for all-day and multi-day bars), today keeps the accent, and the now line, background events, weekends and hour
  lines are styled apart. Bar and timeline segments expose `isAllDay`/`isMultiDay` (`data-all-day`, `data-multi-day`),
  day cells, columns and headers expose `data-weekday`, and time-grid and timeline models expose `slotMinutes` and
  `hourOffset` (`--cal-slots-per-hour`, `--cal-hour-offset`). Events no longer follow `--calendar-accent`; set
  `--calendar-event-color` instead.
- 686e1a1: Add background events and background layers to timeline rows, with resource targeting and exact coverage across
  DST, overnight windows and hidden weekdays. Export timeline background parts in React and Solid, with positioning,
  existing color tokens and forced-color hatching in the themes.
- 0be3009: Add hidden ISO weekdays to built-in views and visible clock windows to time grids and timelines, including
  overnight windows. Expose navigation input coverage and proportional slot geometry while preserving the fixed
  clock-axis DST rendering policy.

### Patch Changes

- 20fd12d: Add native daily and weekly recurrence to `@calendar-tsx/core` with Temporal dates, compatible RRule option objects, independently bounded exclusions, and stable occurrence IDs across implementations.

  Preserve inferred event-source keys in core and adapter stores when native and RRule recurrence are both used.

- 4ed3976: Emit the time grid's minimum column width on its root so shared header, all-day and body columns honor
  `minColumnWidth` and scroll horizontally when needed.
- Updated dependencies [3624ad6]
- Updated dependencies [20fd12d]
- Updated dependencies [a2136fc]
- Updated dependencies [3b0b1b8]
- Updated dependencies [ebec94d]
- Updated dependencies [686e1a1]
- Updated dependencies [0be3009]
  - @calendar-tsx/core@0.2.0

## 0.0.1

### Patch Changes

- Release the current calendar engine, React and Solid bindings, and theme stylesheets.
- Updated dependencies
  - @calendar-tsx/core@0.0.1
