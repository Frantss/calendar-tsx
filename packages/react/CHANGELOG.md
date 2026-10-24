# @calendar-tsx/react

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
