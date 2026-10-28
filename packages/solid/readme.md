# @calendar-tsx/solid

> [!WARNING]
> **Experimental.** The API can change or be removed in any release, without notice.

Solid bindings for [`@calendar-tsx/core`](../core), with the same parts, props, data attributes and `--cal-*`
variables as [`@calendar-tsx/react`](../react).

```bash
npm i @calendar-tsx/solid @calendar-tsx/core temporal-polyfill
```

Parts carry no styles; add [`@calendar-tsx/themes`](../themes) for a working look.

## SolidJS 2

For SolidJS 2, install matching `solid-js` and `@solidjs/web` versions, starting with `2.0.0-rc.19`:

```bash
npm i @calendar-tsx/solid @calendar-tsx/core solid-js@2.0.0-rc.19 @solidjs/web@2.0.0-rc.19 temporal-polyfill
```

Import the same components and helpers from the v2 entry:

```ts
import { Calendar, CalendarProvider, useCalendar, useCalendarSelector } from '@calendar-tsx/solid/v2';
```

Use the Solid 2 compiler (`@solidjs/vite-plugin` for Vite) and set TypeScript's `jsxImportSource` to
`@solidjs/web`. Options remain accessors, and selectors and managed events return accessors. Signal updates
follow Solid 2's batched scheduling. The default `@calendar-tsx/solid` entry supports SolidJS 1.

See the [documentation](../../apps/docs/content/docs/solid), starting with the [quick start](../../apps/docs/content/docs/solid/getting-started/quick-start.mdx).
