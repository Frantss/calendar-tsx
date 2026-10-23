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

| File                | Contents                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| `base.css`          | Positioning only: month bars, time-grid columns and lanes, timeline rows, the now line. Every theme uses it.    |
| `default.css`       | `base.css` plus the default look.                                                                               |
| `high-contrast.css` | Black on white and white on black at WCAG AAA, with outlined events. See [High contrast](#high-contrast-theme). |
| `shadcn.css`        | The default look with its tokens read from shadcn/ui's variables. See [shadcn/ui](#shadcnui).                   |
| `material-ui.css`   | The default look with its tokens read from Material UI's CSS theme variables. See [Material UI](#material-ui).  |
| `revenuecat.css`    | The default layout in RevenueCat's brand colors. See [RevenueCat](#revenuecat).                                 |
| `stripe.css`        | The default layout in Stripe's colors. See [Stripe](#stripe).                                                   |
| `compact.css`       | Density only: smaller slots, bars and text. Import it after any theme.                                          |

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
  --calendar-accent-contrast: light-dark(#ffffff, #0b1a24);
  --calendar-slot-height: 2.5rem;
}
```

**Accent.** `--calendar-accent` recolors the calendar on its own: today's marker, the now line, today's column tint,
the focus ring and the events, which are tints of it unless `--calendar-event` is set. Set `--calendar-accent-contrast`
with it for the numbers on today's marker. Use a `light-dark()` pair so each mode gets a fitting shade.

| Token                                                                                      | Default (light, dark)                                 |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `--calendar-surface`, `--calendar-surface-muted`                                           | `#ffffff` `#f5f4f1`, `#171615` `#201f1d`              |
| `--calendar-text`, `--calendar-text-muted`                                                 | `#1c1b19` `#5f5c56`, `#f2efe9` `#a9a49b`              |
| `--calendar-border`                                                                        | `#dedbd4`, `#34322e`                                  |
| `--calendar-accent`, `--calendar-accent-contrast`                                          | `#b4441e` `#ffffff`, `#f08a5d` `#1a0d07`              |
| `--calendar-event`, `--calendar-event-border`                                              | unset: the accent tinted 16% and 24% into the surface |
| `--calendar-event-text`, `--calendar-focus-ring`                                           | unset: fall back to the text and the accent           |
| `--calendar-background`                                                                    | unset: the text at 6% over the surface                |
| `--calendar-background-event`                                                              | unset: the accent at 10% over transparent             |
| `--calendar-radius`, `--calendar-bar-radius`                                               | `0.375rem`, `0.25rem`                                 |
| `--calendar-font-size`, `--calendar-font-size-sm`, `--calendar-font-size-xs`               | `0.875rem`, `0.75rem`, `0.6875rem`                    |
| `--calendar-slot-height`, `--calendar-axis-width`                                          | `3rem`, `4rem`                                        |
| `--calendar-bar-height`, `--calendar-bar-gap`, `--calendar-bar-inset`                      | `1.375rem`, `2px`, `2px`                              |
| `--calendar-event-gap`                                                                     | `4px`: space after each time-grid event, both axes    |
| `--calendar-day-header-height`, `--calendar-overflow-height`, `--calendar-week-min-height` | `2.25rem`, `1.5rem`, `6rem`                           |

The theme sets no font family; the calendar inherits the page's. The event tokens, `--calendar-focus-ring` and `--calendar-background` are
left unset on purpose: a token declared as `var(--other)` resolves where it is declared, so a default on `:root`
would ignore an override of the token it points to.

**Dark mode.** Colors use `light-dark()`, so they follow the inherited `color-scheme`. The theme never sets it: declare
`color-scheme: light dark` on the page to follow the system, or `light`/`dark` on any ancestor to force a mode.

**Forced colors.** Under `forced-colors: active` (Windows High Contrast), the browser drops fills. Events keep their
borders, and the default theme restores today's marker, the now line, slot lines, unavailable hatching,
background layers (hatched the other way) and outside-month dates with system colors.

**Overriding rules.** The files use cascade layers (`calendar.base`, `calendar.theme`, `calendar.density`) and
zero-specificity selectors. Unlayered CSS always wins over them without `!important`. Layered CSS wins only if its layer comes later:
CSS that declares its own layers after importing the theme beats it, and anything earlier loses. Tailwind is
layered, so see [Tailwind](#tailwind).

**Scrolling.** `TimeGridView` scrolls, with a sticky header. Give it a height (`max-block-size: 40rem`) to
scroll inside the page rather than show all 24 hours.

## High contrast theme

`high-contrast.css` replaces `default.css` for people who choose more contrast. Every text pairing meets WCAG AAA
(9:1 or more) and every boundary is 5:1 or more. Events are outlined with a 2px border in the text color instead of
tinted, focus rings are 3px, and a bar that continues past a week edge (or a time-grid event past midnight) gets a
dashed edge, so continuation does not depend on a missing corner radius. The accent is deep blue in light mode and
yellow in dark mode. `--calendar-event` and `--calendar-event-border` still override the outline.

This is separate from Windows High Contrast: under `forced-colors: active` the browser chooses the colors, and every
theme falls back to the default theme's forced-colors rules.

## shadcn/ui

`shadcn.css` replaces `default.css`: it maps the calendar tokens onto shadcn/ui's variables (`--background`,
`--foreground`, `--muted`, `--muted-foreground`, `--border`, `--primary`, `--primary-foreground`, `--ring`,
`--radius`), so the calendar follows the app's palette, radius and `.dark` class with no further setup. Events take
the default theme's accent tint, so they are `--primary` tinted 16% into `--background`; shadcn's `--secondary`,
`--muted` and `--accent` sit almost on the background in light mode. Use the Tailwind v4 variable naming (full `oklch()` colors, not the v3 HSL channels).

```css
@import 'tailwindcss';
@import '@calendar-tsx/themes/shadcn.css' layer(components);
```

Dark mode follows shadcn's `.dark` class, on `<html>` or on any element around the calendar; `color-scheme` is not
needed.

## Material UI

`material-ui.css` replaces `default.css`: it maps the calendar tokens onto the CSS theme variables Material UI emits
with `cssVariables: true` (`--mui-palette-background-paper`, `--mui-palette-text-primary`,
`--mui-palette-text-secondary`, `--mui-palette-action-hover`, `--mui-palette-divider`, `--mui-palette-primary-main`,
`--mui-palette-primary-contrastText`, `--mui-shape-borderRadius`), so the calendar follows the app's palette, shape and
color scheme. Events take the default theme's accent tint, so they are the primary color tinted 16% into the paper.

```ts
const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: { light: true, dark: true },
});
```

```ts
import '@calendar-tsx/themes/material-ui.css';
```

Without `cssVariables` Material UI emits no variables and the calendar loses its colors. The theme expects the default
`mui` prefix and `:root` as the `rootSelector`. Dark mode follows MUI's built-in `colorSchemeSelector` values:
`media`, and `class`, `data` or `data-mui-color-scheme` set on `<html>` or on an element around the calendar;
`color-scheme` is not needed. A custom selector such as `[data-theme="%s"]` works on `<html>` only.

## RevenueCat

`revenuecat.css` replaces `default.css` with RevenueCat's press-kit colors, used the way the kit recommends:
monochrome black purple (`#1f1f47`) with the brand colors as accents. The exact red (`#f2545b`) marks today and the now
line, with black purple numbers on it; royal blue (`#576cdb`) tints events and draws the focus ring. Dark mode uses
black purple as the surface. On white the brand red is 3.39:1, so the theme keeps it to fills and lines and writes
today's time-grid header in the text color instead.

## Stripe

`stripe.css` replaces `default.css` with the colors from the public `--hds-color-*` tokens on stripe.com: blurple
`#533afd` (`brand-600`, a step deeper than the logo's `#635bff`) marks today and the now line and tints events, on
slate neutrals (`#061b31` text on white; white on `#0d1738` in dark mode, with `#7389ff` as the accent). Borders are
one step stronger than Stripe's quiet borders, which at 1.2:1 lose the grid.

This theme is not affiliated with or endorsed by Stripe. Stripe's [Marks Usage Terms](https://stripe.com/marks/legal)
cover its names, design elements and trade dress.

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
- Utilities beat it: `<MonthViewWeekEvent className='bg-sky-600 text-white'>` overrides the theme.

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
<MonthViewDay day={day} className='p-1 data-outside:bg-zinc-50 data-outside:text-zinc-500'>
  <MonthViewDayTrigger
    day={day}
    view='day'
    className='size-7 rounded-full in-data-today:bg-indigo-600 in-data-today:text-white'
  >
    {day.date.day}
  </MonthViewDayTrigger>
</MonthViewDay>
```

## Expected composition

The layout assumes the part nesting shown in the [React readme](../react/readme.md): `MonthViewWeek` holds its
`MonthViewDay` cells and `MonthViewWeekEvent` bars; `TimeGridView` holds `TimeGridViewHeader`, an optional
`TimeGridViewAllDay` and `TimeGridViewBody`, and the body holds an optional `TimeGridViewAxis` and the
`TimeGridViewColumn`s.

## Known limits

- Month and all-day bars default to 22px tall, below a 44px touch target; raise `--calendar-bar-height` for touch
  interfaces.
- The all-day row scrolls with the time grid instead of staying under the sticky header.
