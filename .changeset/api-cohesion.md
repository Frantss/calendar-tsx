---
'@calendar-tsx/core': minor
'@calendar-tsx/react': minor
'@calendar-tsx/solid': minor
---

Keep optional feature state isolated across providers and infer calendar-wide feature fields on layout models.

Navigation triggers now require a `calendar` prop and check `view` against that instance's registered keys. Pass
`calendar={calendar}` to day-grid, time-grid and timeline triggers.

Locale belongs on `CalendarProvider` or `Calendar`. Move `locale` out of core and hook options; the hooks now reject
it. `Calendar` continues to forward its locale to the provider.
