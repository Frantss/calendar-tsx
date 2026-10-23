# @calendar-tsx/themes

> [!WARNING]
> **Experimental.** `@calendar-tsx/themes` is an experiment. Its API can change or be removed in any release, without notice.

Plain CSS for the unstyled parts of [`@calendar-tsx/react`](../react). The stylesheets select parts by their
`data-scope`/`data-part` attributes and lay them out from the `--cal-*` geometry the parts emit, so they need no
JavaScript.

## Quick example

```ts
import '@calendar-tsx/themes/default.css';
```

| File          | Contents                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------- |
| `base.css`    | Positioning only: month bars, time-grid columns and lanes, the now line. Every theme uses it. |
| `default.css` | `base.css` plus the default look.                                                             |

Import `base.css` alone to write your own look on top of working layout.

## Customizing

Override any `--calendar-*` token on an ancestor of the calendar:

```css
.schedule {
  --calendar-accent: light-dark(#1f5f8b, #7cb7e0);
  --calendar-slot-height: 2.5rem;
}
```

| Token                                                                                      | Default (light, dark)                              |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `--calendar-surface`, `--calendar-surface-muted`                                           | `#ffffff` `#f5f4f1`, `#171615` `#201f1d`           |
| `--calendar-text`, `--calendar-text-muted`                                                 | `#1c1b19` `#5f5c56`, `#f2efe9` `#a9a49b`           |
| `--calendar-border`                                                                        | `#dedbd4`, `#34322e`                               |
| `--calendar-accent`, `--calendar-accent-contrast`                                          | `#b4441e` `#ffffff`, `#f08a5d` `#1a0d07`           |
| `--calendar-event`, `--calendar-event-text`, `--calendar-event-border`                     | `#ebe6dc` text `#d3ccbf`, `#2e2b27` text `#45413b` |
| `--calendar-focus-ring`                                                                    | the accent                                         |
| `--calendar-radius`, `--calendar-bar-radius`                                               | `0.375rem`, `0.25rem`                              |
| `--calendar-font-size`                                                                     | `0.875rem`                                         |
| `--calendar-slot-height`, `--calendar-axis-width`                                          | `3rem`, `4rem`                                     |
| `--calendar-bar-height`, `--calendar-bar-gap`, `--calendar-bar-inset`                      | `1.375rem`, `2px`, `2px`                           |
| `--calendar-day-header-height`, `--calendar-overflow-height`, `--calendar-week-min-height` | `2rem`, `1.5rem`, `6rem`                           |

The theme sets no font family; the calendar inherits the page's.

**Dark mode.** Colors use `light-dark()`, so they follow the inherited `color-scheme`. The theme never sets it: declare
`color-scheme: light dark` on the page to follow the system, or `light`/`dark` on any ancestor to force a mode.

**Overriding rules.** Both files use cascade layers (`calendar.base`, `calendar.theme`) and zero-specificity
selectors, so your own unlayered CSS and utility classes win without `!important`.

**Scrolling.** `TimeGridView_Root` scrolls, with a sticky header. Give it a height (`max-block-size: 40rem`) to
scroll inside the page rather than show all 24 hours.

## Expected composition

The layout assumes the part nesting shown in the [React readme](../react/readme.md): `MonthView_Week` holds its
`MonthView_Day` cells and `MonthView_WeekEvent` bars; `TimeGridView_Root` holds `TimeGridView_Header`, an optional
`TimeGridView_AllDay` and `TimeGridView_Body`, and the body holds an optional `TimeGridView_Axis` and the
`TimeGridView_Column`s.

## Known limits

- Month and all-day bars default to 22px tall, below a 44px touch target; raise `--calendar-bar-height` for touch
  interfaces.
- The all-day row scrolls with the time grid instead of staying under the sticky header.
