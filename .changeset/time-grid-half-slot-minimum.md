---
'@calendar-tsx/core': minor
'@calendar-tsx/themes': minor
---

`timeGridView` now lays brief timed events out at least half a slot long by default, matching `timelineView`; the
default 30-minute slots keep the previous 15 minutes. The default theme covers the label of a time-grid event too
short for one line instead of showing a clipped slice of text.
