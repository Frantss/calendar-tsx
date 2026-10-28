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

Import the calendar components and helpers from the v2 entry:

```ts
import { Calendar, CalendarProvider, useCalendar, useCalendarSelector } from '@calendar-tsx/solid/v2';
```

See the [SolidJS 2 guide](../../apps/docs/content/docs/solid/getting-started/solid-2.mdx) for supported versions,
installation, compiler setup and examples. The default `@calendar-tsx/solid` entry supports SolidJS 1.

See the [documentation](../../apps/docs/content/docs/solid), starting with the [quick start](../../apps/docs/content/docs/solid/getting-started/quick-start.mdx).
