---
'@calendar-tsx/core': minor
'@calendar-tsx/react': minor
'@calendar-tsx/solid': minor
'@calendar-tsx/rrule': minor
---

Implement the D54 factory assembly API: configure features with factories, collect them with `calendarFeatures`, bind typed view overrides with `calendarViews`, and pass both results directly to the calendar or adapter hook.

Breaking: replace feature constants with factory calls and `createCalendarViews` with `calendarViews({ features, views })`. Move feature options into factory arguments or per-view `features` overrides. Registered features now participate in every view. Object overrides shallow-merge with defaults; arrays replace them. Registration aliases preserve feature types and event-source identities. Feature definitions remain fixed after calendar creation; change per-view configuration through new view definitions.
