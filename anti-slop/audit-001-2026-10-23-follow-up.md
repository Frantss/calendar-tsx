# antislop audit 001: follow-up

- **Date:** 2026-10-23
- **Approved:** findings 1 to 6 of [audit-001](audit-001-2026-10-23.md)
- **Changed:** prose in `apps/docs/content` only. No code, examples or comments changed.

## Fixes

### 1. Em dashes in the docs introduction: fixed

`docs/index.mdx`: the aside moved after a colon: "The core computes a render-ready view model on TanStack Store and
Temporal: month grids with spanning bars, time grids with overlap lanes and resource columns, and lists."

### 2. Em dash in the Themes page description: fixed

`docs/{react,solid,core}/styling/themes.mdx`: "Plain CSS for the parts, with a positioning base, built-in themes and a
density."

### 3. Em dash as the empty value in table cells: fixed

All 21 cells now name what the dash meant:

- **required:** options with no default that must be passed (`timeZone`, `views`, `features`, `view`, `date`,
  `onNavigate`, `events`), the time grid's `days`, and the provider's `value`.
- **none:** optional values with no default (`locale`, `state`, `atoms`, `minColumnWidth`, `groupBy`) and parts with no
  model prop (`MonthViewHeader`, `TimeGridViewHeader`, `TimeGridViewAllDay`, `TimeGridViewAxis`, `ListViewEmpty`).
- **omitted:** `allDay` on timed events.

### 4. Bold lead-ins that repeat the item: fixed

- `shared/features/events.mdx` and `docs/core/adapters/writing-an-adapter.mdx`: each bold label folded into a plain
  sentence that leads with the subject ("Create the calendar once.", "Duplicate ids log an error in development.").
- The three "What it does" lists and the two installation lists: bold removed, wording unchanged.
- Kept, as the audit said: the definitional bold for `period` and `range` (navigation) and for **Unlayered CSS** and
  **Layered CSS** (customizing).

### 5. "now" and "today" in scare quotes: fixed, with three more found

The listed lines in `shared/features/now.mdx`, `shared/features/server-rendering.mdx` and
`shared/reference/options.mdx` now say "the current time" or "today" without quotes. Fixing them turned up three more
of the same pattern that the audit missed, all fixed:

- `docs/core/adapters/writing-an-adapter.mdx`, the `createCalendar` row of the lifecycle table
- `docs/core/features/server-rendering.mdx`, the page description
- `docs/solid/features/server-rendering.mdx`, the page description

### 6. Abstractions that decide or assume: fixed, with one more found

- `shared/features/now.mdx`: "The current time sets which day is today and where the now indicator sits."
- `shared/reference/options.mdx`: the time zone "also sets which day counts as today."
- `shared/styling/themes.mdx`: "`base.css` expects the parts nested as the view pages show them."
- Also found and fixed: `shared/features/events.mdx`, where the sort "decides bar rows and lanes". It now reads "The
  calendar sorts the events in the visible range before layout, and the order sets bar rows and lanes."

## Verification

- **Rescan of all 95 MDX files:** 0 em dashes, 0 quoted "now" or "today", 0 mind verbs (decides, assumes, wants, knows,
  understands), 0 buzzwords, 0 minimizers. The only bold lead-ins left are the 4 definitional ones kept above.
- **Rendered site:** no page's article or meta description contains an em dash.
- **Build:** `pnpm run build` passed; the docs prerendered 76 pages, none empty.
- **Checks:** `pnpm run check:all` passed (lint, format, types including the six example programs, package validation).
- **Links:** every internal link and anchor across the 75 doc pages resolves.
- **Click-through:** not applicable. The changes are text only and add no interactive element; the options table was
  checked in the browser and shows "required" in its Default column.
