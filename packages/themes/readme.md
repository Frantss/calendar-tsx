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
| `base.css`          | Positioning only: day-grid bars, time-grid columns and lanes, timeline rows, the now line. Every theme uses it. |
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

The default theme lays month sections out in a responsive grid. `--calendar-section-min-width` defaults to `20rem` and `--calendar-section-gap` to `1rem`; override them or the root grid to choose a different arrangement.

Calendar-only multi-month grids use compact row and bar sizes, centered headings, inset padding, and wider spacing. Neighboring panels share header and week tracks through CSS subgrid. Use `fixedWeekCount: true` for six weeks in every month, as the year playground does. This treatment does not apply to resource grids or a single month. `--calendar-section-gap` also overrides the overview's spacing.

Override any `--calendar-*` token on an ancestor of the calendar:

```css
.schedule {
  --calendar-accent: light-dark(#1f5f8b, #7cb7e0);
  --calendar-accent-contrast: light-dark(#ffffff, #0b1a24);
  --calendar-slot-height: 2.5rem;
}
```

**Roles.** Each kind of thing has its own color, so they read apart. `--calendar-accent` marks today (marker, header,
column tint) and the focus ring; set `--calendar-accent-contrast` with it for the numbers on today's marker.
`--calendar-event-color` colors events: timed events are tints of it (14% fill and 30% border in light mode, 26% and
45% in dark mode) with a 3px stripe where they start, and all-day and multi-day bars (`data-all-day`,
`data-multi-day`) are solid in it with `--calendar-event-color-contrast` text. `--calendar-now` draws the now line,
`--calendar-background-event-color` washes background events with a top edge, unavailable time is hatched, and
Saturday and Sunday (`data-weekday` 6 and 7) take `--calendar-weekend`. Time grids and timelines draw full lines on the
hour and half-strength lines at each slot. Use `light-dark()` pairs so each mode gets a fitting shade. The event
colors resolve on each event, so a class on one event part that sets `--calendar-event-color` recolors it.

| Token                                                                                     | Default (light, dark)                                                     |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `--calendar-surface`, `--calendar-surface-muted`                                          | `#ffffff` `#f5f4f1`, `#171615` `#201f1d`                                  |
| `--calendar-text`, `--calendar-text-muted`                                                | `#1c1b19` `#5f5c56`, `#f2efe9` `#a9a49b`                                  |
| `--calendar-border`, `--calendar-border-strong`                                           | `#dedbd4` `#c4c0b7`, `#34322e` `#4a4742`                                  |
| `--calendar-accent`, `--calendar-accent-contrast`                                         | `#b4441e` `#ffffff`, `#f08a5d` `#1a0d07`                                  |
| `--calendar-event-color`, `--calendar-event-color-contrast`                               | `#2f63d6` `#ffffff`, `#7ea6ff` `#0b1530`                                  |
| `--calendar-event`, `--calendar-event-border`                                             | unset: tints of the event color, or the event color on solid bars         |
| `--calendar-event-text`, `--calendar-focus-ring`                                          | unset: the text (the event color's contrast on solid bars) and the accent |
| `--calendar-now`, `--calendar-background-event-color`                                     | `#d4321f` `#1a8a6e`, `#ff6d5a` `#4cc9a4`                                  |
| `--calendar-weekend`                                                                      | unset: the text at 3% over transparent                                    |
| `--calendar-background`                                                                   | unset: the text at 6% over the surface                                    |
| `--calendar-background-event`                                                             | unset: the background event color at 14% over transparent                 |
| `--calendar-radius`, `--calendar-bar-radius`                                              | `0.375rem`, `0.25rem`                                                     |
| `--calendar-font-size`, `--calendar-font-size-sm`, `--calendar-font-size-xs`              | `0.875rem`, `0.75rem`, `0.6875rem`                                        |
| `--calendar-slot-height`, `--calendar-axis-width`                                         | `3rem`, `4rem`                                                            |
| `--calendar-bar-height`, `--calendar-bar-gap`, `--calendar-bar-inset`                     | `1.375rem`, `2px`, `2px`                                                  |
| `--calendar-event-gap`                                                                    | `4px`: space after each time-grid event, both axes                        |
| `--calendar-day-header-height`, `--calendar-overflow-height`, `--calendar-row-min-height` | `2.25rem`, `1.5rem`, `6rem`                                               |

The theme sets no font family; the calendar inherits the page's. The event fill, border and text tokens, `--calendar-focus-ring`, `--calendar-background` and
`--calendar-weekend` are left unset on purpose: a token declared as `var(--other)` resolves where it is declared, so a default on `:root`
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
scroll inside the page. A view's `timeWindow` limits the clock range before rendering.

**Brief time-grid events.** The core lays a brief timed event out half a slot long. When a time-grid event's content box
is still shorter than one line, the default theme covers its content with the event's fill, so the bar and stripe show
without a clipped slice of text.

**Timeline event widths.** The core gives brief timed events a half-slot minimum display duration and stacks using those enlarged spans. Set `timelineView({ minEventMinutes })` to change the minimum, or `0` for exact time widths. The themes clip labels and draw side borders inside the calculated display width. Custom themes should keep inline padding and borders off the event box so they cannot expand it over adjacent events. Increase `minSlotWidth` when the time axis needs more space.

**List dates.** Day headings sit beside their event rows. Inside the header, render a `<time>` with a `<strong>` day number and a `<span>` containing the weekday and month/year. `--calendar-list-date-width` caps the date column at `10rem` by default; it narrows with the list, and labels wrap. Keep the header and event parts as direct children of `ListViewDay`.

Resource agendas wrap these rows in `ListViewSection`. `ListViewSectionHeader` labels the outer resource or date group using the theme's existing surface and text tokens. In date-first agendas, the day heading contains the resource name; in resource-first agendas, it retains the date label. Section and resource headings wrap with the available width.

## High contrast theme

`high-contrast.css` replaces `default.css` for people who choose more contrast. Every text pairing meets WCAG AAA
(9:1 or more) and every boundary is 5:1 or more. Timed events are outlined with a 2px border and a 4px stripe in the
text color instead of tinted, all-day and multi-day bars are solid in the text color, focus rings are 3px, and a bar that continues past a week edge (or a time-grid event past midnight) gets a
dashed edge, so continuation does not depend on a missing corner radius. The accent is deep blue in light mode and
yellow in dark mode; the now line is red and background events green. `--calendar-event` and `--calendar-event-border`
still override the outline.

This is separate from Windows High Contrast: under `forced-colors: active` the browser chooses the colors, and every
theme falls back to the default theme's forced-colors rules.

## shadcn/ui

`shadcn.css` replaces `default.css`: it maps the calendar tokens onto shadcn/ui's variables (`--background`,
`--foreground`, `--muted`, `--muted-foreground`, `--border`, `--primary`, `--primary-foreground`, `--chart-1`,
`--chart-2`, `--destructive`, `--ring`, `--radius`), so the calendar follows the app's palette, radius and `.dark` class
with no further setup. Events take `--chart-1`, apart from today's `--primary`, with `--foreground` on solid bars; the
now line takes `--destructive` and background events `--chart-2`. shadcn's `--secondary`, `--muted` and `--accent` sit
almost on the background in light mode. Use the Tailwind v4 variable naming (full `oklch()` colors, not the v3 HSL channels).

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
`--mui-palette-primary-contrastText`, `--mui-palette-secondary-main`, `--mui-palette-secondary-contrastText`,
`--mui-palette-error-main`, `--mui-palette-success-main`, `--mui-shape-borderRadius`), so the calendar follows the
app's palette, shape and color scheme. Events take the secondary color, apart from today's primary; the now line takes
the error color and background events the success color.

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
line, with black purple numbers on it; royal blue (`#576cdb`, `#8b9bf0` in dark mode) colors events and draws the focus
ring. Dark mode uses
black purple as the surface. On white the brand red is 3.39:1, so the theme keeps it to fills and lines and writes
today's time-grid header in the text color instead.

## Stripe

`stripe.css` replaces `default.css` with the colors from the public `--hds-color-*` tokens on stripe.com: blurple
`#533afd` (`brand-600`, a step deeper than the logo's `#635bff`; `#7389ff` in dark mode) colors events and the focus ring,
on slate neutrals (`#061b31` text on white; white on `#0d1738` in dark mode). Today is marked in slate so it reads
apart from the events, the now line is ruby (`#e2225f`) and background events are green (`#00b261`). Borders are
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
- Utilities beat it: `<DayGridViewRowEvent className='bg-sky-600 text-white'>` overrides the theme.

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
`data-all-day`, `data-multi-day`, `data-continues-before`, `data-continues-after`) match `data-*:`, and descendants of a part reach them with `in-data-*:`:

```css
@import 'tailwindcss';
@import '@calendar-tsx/themes/base.css' layer(components);
```

```tsx
<DayGridViewDay day={day} className='p-1 data-outside:bg-zinc-50 data-outside:text-zinc-500'>
  <DayGridViewDayTrigger
    day={day}
    view='day'
    className='size-7 rounded-full in-data-today:bg-indigo-600 in-data-today:text-white'
  >
    {day.date.day}
  </DayGridViewDayTrigger>
</DayGridViewDay>
```

## Expected composition

The layout assumes the part nesting shown in the [React readme](../react/readme.md): `DayGridView` contains `DayGridViewSection` grids; each section contains its header and rows. `DayGridViewRow` holds its
`DayGridViewDay` cells and `DayGridViewRowEvent` bars; `TimeGridView` holds `TimeGridViewHeader`, an optional
`TimeGridViewAllDay` and `TimeGridViewBody`, and the body holds an optional `TimeGridViewAxis` and the
`TimeGridViewColumn`s.

## Known limits

- Day-grid and all-day bars default to 22px tall, below a 44px touch target; raise `--calendar-bar-height` for touch
  interfaces.
- The all-day row scrolls with the time grid instead of staying under the sticky header.
