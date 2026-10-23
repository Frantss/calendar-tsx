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

| File             | Contents                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `base.css`       | Positioning only: month bars, time-grid columns and lanes, the now line. Every theme uses it. |
| `default.css`    | `base.css` plus the default look.                                                             |
| `shadcn.css`     | The default look with its tokens read from shadcn/ui's variables. See [shadcn/ui](#shadcnui). |
| `revenuecat.css` | The default layout in RevenueCat's brand colors. See [RevenueCat](#revenuecat).               |
| `compact.css`    | Density only: smaller slots, bars and text. Import it after any theme.                        |

Import `base.css` alone to write your own look on top of working layout.

```ts
import '@calendar-tsx/themes/default.css';
import '@calendar-tsx/themes/compact.css';
```

## Customizing

Override any `--calendar-*` token on an ancestor of the calendar:

```css
.schedule {
  --calendar-accent: light-dark(#1f5f8b, #7cb7e0);
  --calendar-slot-height: 2.5rem;
}
```

| Token                                                                                      | Default (light, dark)                       |
| ------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `--calendar-surface`, `--calendar-surface-muted`                                           | `#ffffff` `#f5f4f1`, `#171615` `#201f1d`    |
| `--calendar-text`, `--calendar-text-muted`                                                 | `#1c1b19` `#5f5c56`, `#f2efe9` `#a9a49b`    |
| `--calendar-border`                                                                        | `#dedbd4`, `#34322e`                        |
| `--calendar-accent`, `--calendar-accent-contrast`                                          | `#b4441e` `#ffffff`, `#f08a5d` `#1a0d07`    |
| `--calendar-event`, `--calendar-event-border`                                              | `#ebe6dc` `#d3ccbf`, `#2e2b27` `#45413b`    |
| `--calendar-event-text`, `--calendar-focus-ring`                                           | unset: fall back to the text and the accent |
| `--calendar-radius`, `--calendar-bar-radius`                                               | `0.375rem`, `0.25rem`                       |
| `--calendar-font-size`, `--calendar-font-size-sm`, `--calendar-font-size-xs`               | `0.875rem`, `0.75rem`, `0.6875rem`          |
| `--calendar-slot-height`, `--calendar-axis-width`                                          | `3rem`, `4rem`                              |
| `--calendar-bar-height`, `--calendar-bar-gap`, `--calendar-bar-inset`                      | `1.375rem`, `2px`, `2px`                    |
| `--calendar-day-header-height`, `--calendar-overflow-height`, `--calendar-week-min-height` | `2rem`, `1.5rem`, `6rem`                    |

The theme sets no font family; the calendar inherits the page's. `--calendar-event-text` and `--calendar-focus-ring`
are left unset on purpose: a token declared as `var(--other)` resolves where it is declared, so a default on `:root`
would ignore an override of the token it points to.

**Dark mode.** Colors use `light-dark()`, so they follow the inherited `color-scheme`. The theme never sets it: declare
`color-scheme: light dark` on the page to follow the system, or `light`/`dark` on any ancestor to force a mode.

**High contrast.** Under `forced-colors: active` (Windows High Contrast), the browser drops fills. Events keep their
borders, and the default theme restores today's marker, the now line, slot lines, unavailable hatching and
outside-month dates with system colors.

**Overriding rules.** The files use cascade layers (`calendar.base`, `calendar.theme`, `calendar.density`) and
zero-specificity selectors. Unlayered CSS always wins over them without `!important`. Layered CSS wins only if its layer comes later:
CSS that declares its own layers after importing the theme beats it, and anything earlier loses. Tailwind is
layered, so see [Tailwind](#tailwind).

**Scrolling.** `TimeGridView_Root` scrolls, with a sticky header. Give it a height (`max-block-size: 40rem`) to
scroll inside the page rather than show all 24 hours.

## shadcn/ui

`shadcn.css` replaces `default.css`: it maps the calendar tokens onto shadcn/ui's variables (`--background`,
`--foreground`, `--muted`, `--muted-foreground`, `--border`, `--primary`, `--primary-foreground`, `--ring`,
`--radius`), so the calendar follows the app's palette, radius and `.dark` class with no further setup. Events are
`--primary` tinted 16% into `--background`, because shadcn's `--secondary`, `--muted` and `--accent` sit almost on the
background in light mode. Use the Tailwind v4 variable naming (full `oklch()` colors, not the v3 HSL channels).

```css
@import 'tailwindcss';
@import '@calendar-tsx/themes/shadcn.css' layer(components);
```

Dark mode follows shadcn's `.dark` class, on `<html>` or on any element around the calendar; `color-scheme` is not
needed.

## RevenueCat

`revenuecat.css` replaces `default.css` with RevenueCat's press-kit colors, used the way the kit recommends:
monochrome black purple (`#1f1f47`) with the brand colors as accents. The exact red (`#f2545b`) marks today and the now
line, with black purple numbers on it; royal blue (`#576cdb`) tints events and draws the focus ring. Dark mode uses
black purple as the surface. On white the brand red is 3.39:1, so the theme keeps it to fills and lines and writes
today's time-grid header in the text color instead.

## Tailwind

Tailwind v4 is supported. Earlier versions are not: v3's preflight is unlayered, so it beats the theme and strips
the parts' button backgrounds and borders.

Import the theme into Tailwind's `components` layer:

```css
@import 'tailwindcss';
@import '@calendar-tsx/themes/default.css' layer(components);
```

Tailwind's layers run `theme`, `base`, `components`, `utilities`, so the theme lands between preflight and your
utilities:

- It beats preflight, whose button reset (`background-color: transparent`, `border-radius: 0`) would otherwise strip
  every event, trigger and overflow, since parts render native buttons.
- Utilities beat it: `<MonthView_WeekEvent className='bg-sky-600 text-white'>` overrides the theme.

Imported without `layer(components)`, the theme's layers come after `utilities` and override every utility class on
a part.

**Tokens.** Point the tokens at Tailwind's theme variables so the calendar follows your palette:

```css
:root {
  --calendar-accent: light-dark(var(--color-indigo-600), var(--color-indigo-400));
  --calendar-border: light-dark(var(--color-zinc-200), var(--color-zinc-800));
  --calendar-radius: var(--radius-lg);
}
```

**Dark mode.** The theme follows `color-scheme`, not the `dark:` variant, so pair them. With the default
`prefers-color-scheme` strategy, put `scheme-light-dark` on `<html>`; with a `.dark` class, use `class='dark scheme-dark'`.

**Utilities only.** To style every part yourself, import `base.css` alone in the same layer and use the parts' state
attributes as variants. Boolean attributes (`data-today`, `data-outside`, `data-overlap`, `data-unavailable`,
`data-continues-before`, `data-continues-after`) match `data-*:`, and descendants of a part reach them with `in-data-*:`:

```css
@import 'tailwindcss';
@import '@calendar-tsx/themes/base.css' layer(components);
```

```tsx
<MonthView_Day day={day} className='p-1 data-outside:bg-zinc-50 data-outside:text-zinc-500'>
  <MonthView_DayTrigger
    day={day}
    view='day'
    className='size-7 rounded-full in-data-today:bg-indigo-600 in-data-today:text-white'
  >
    {day.date.day}
  </MonthView_DayTrigger>
</MonthView_Day>
```

## Expected composition

The layout assumes the part nesting shown in the [React readme](../react/readme.md): `MonthView_Week` holds its
`MonthView_Day` cells and `MonthView_WeekEvent` bars; `TimeGridView_Root` holds `TimeGridView_Header`, an optional
`TimeGridView_AllDay` and `TimeGridView_Body`, and the body holds an optional `TimeGridView_Axis` and the
`TimeGridView_Column`s.

## Known limits

- Month and all-day bars default to 22px tall, below a 44px touch target; raise `--calendar-bar-height` for touch
  interfaces.
- The all-day row scrolls with the time grid instead of staying under the sticky header.
