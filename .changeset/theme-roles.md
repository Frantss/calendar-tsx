---
'@calendar-tsx/core': minor
'@calendar-tsx/react': minor
'@calendar-tsx/solid': minor
'@calendar-tsx/themes': minor
---

Give each calendar role its own color in the themes: events use `--calendar-event-color` (tinted with a start stripe,
solid for all-day and multi-day bars), today keeps the accent, and the now line, background events, weekends and hour
lines are styled apart. Bar and timeline segments expose `isAllDay`/`isMultiDay` (`data-all-day`, `data-multi-day`),
day cells, columns and headers expose `data-weekday`, and time-grid and timeline models expose `slotMinutes` and
`hourOffset` (`--cal-slots-per-hour`, `--cal-hour-offset`). Events no longer follow `--calendar-accent`; set
`--calendar-event-color` instead.
