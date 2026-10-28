# @calendar-tsx/rrule

## 0.3.0

### Minor Changes

- 4845668: Implement the D54 factory assembly API: configure features with factories, collect them with `calendarFeatures`, bind typed view overrides with `calendarViews`, and pass both results directly to the calendar or adapter hook.

  Breaking: replace feature constants with factory calls and `createCalendarViews` with `calendarViews({ features, views })`. Move feature options into factory arguments or per-view `features` overrides. Registered features now participate in every view. Object overrides shallow-merge with defaults; arrays replace them. Registration aliases preserve feature types and event-source identities. Feature definitions remain fixed after calendar creation; change per-view configuration through new view definitions.

### Patch Changes

- Updated dependencies [e10dee3]
- Updated dependencies [5ebb6de]
- Updated dependencies [5dcea5c]
- Updated dependencies [10fcb23]
- Updated dependencies [4845668]
- Updated dependencies [c5a703e]
  - @calendar-tsx/core@0.3.0

## 0.2.0

### Minor Changes

- 397c3dd: Allow exclusion rules to set an independent Temporal start, preserving their own recurrence phase, COUNT, inclusive UNTIL and timezone. Keep parent-seed inheritance when start is omitted.
- a2136fc: Add optional recurrence powered by rrule-temporal with Temporal dates, string and options-object rules, exceptions, and stable occurrence metadata. Resolve feature-owned definitions before layout and retain series in the existing event stores.

### Patch Changes

- Updated dependencies [3624ad6]
- Updated dependencies [20fd12d]
- Updated dependencies [a2136fc]
- Updated dependencies [3b0b1b8]
- Updated dependencies [ebec94d]
- Updated dependencies [686e1a1]
- Updated dependencies [0be3009]
  - @calendar-tsx/core@0.2.0
