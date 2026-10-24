# Core feature organization and exports

Status: source organization and public entry points implemented. This document extends the
[calendar assembly API](./calendar-assembly.md). D55 in the [design spec](./design.md) records the decision.
The D54 factory assembly, configured aliases and per-view overrides remain a target API. Features currently keep
their constant definitions and existing registration and activation behavior.

## Source organization

Keep shared feature machinery together and give each built-in feature its own module. Each feature owns its
factory, configuration types, helpers, type contributions and tests.

```text
packages/core/
  export/
    index.ts
    background.ts
    recurrence.ts

  src/
    calendar.ts
    calendar.types.ts
    calendar-views.ts
    calendar-sources.ts

    features/
      calendar-features.ts
      feature.types.ts
      feature-maps.types.ts
      feature-runtime.ts

      background/
        background-feature.ts
        background.types.ts
        background.feature-maps.ts
        background-ranges.ts
        background-layouts.ts
        tests/
          background.spec.ts

      recurrence/
        recurrence-feature.ts
        recurrence.types.ts
        recurrence.feature-maps.ts
        recurrence-events.ts
        recurrence-resolver.ts
        recurrence-rules.ts
        recurrence-dates.ts
        tests/
          recurrence.spec.ts

    layout/
      ...
```

This tree shows the affected modules. Other core modules and calendar integration tests remain in place.

| Module                           | Responsibility                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `features/calendar-features.ts`  | Collects registered features and resolves their current per-view activation. D54 will add the public `calendarFeatures` assembly. |
| `features/feature.types.ts`      | Defines feature contracts, hook contexts, pipeline stages and layout features.                                                    |
| `features/feature-maps.types.ts` | Declares the common extension maps and composes built-in contributions through type-only imports.                                 |
| `features/feature-runtime.ts`    | Resolves per-view configuration, initializes feature state and actions, and memoizes feature stages.                              |
| `features/background/`           | Owns the background factory, layer types, weekly-range helpers and layout decoration.                                             |
| `features/recurrence/`           | Owns the recurrence factory, recurring-event constructors and types, rule compilation, date handling and expansion.               |

`calendar.ts` owns the calendar store and pipeline order. It delegates common feature mechanics to the feature
runtime. `calendar-views.ts` still owns the current `createCalendarViews` assembly. D54 will add typed configuration
overrides and the new `calendarViews` signature.
`calendar-sources.ts` remains the generic event-source dispatcher and cache; recurrence owns its expansion
implementation.

Move background-specific types and built-in feature-map entries out of the central `calendar.types.ts`.
That module continues to own calendar-level contracts and model composition. Feature folders own the concrete
types they contribute through the shared extension maps.

Layouts remain supplied by views, with their implementation in `layout/`. Navigation, clocks and event
normalization remain core responsibilities. The optional RRule integration remains in `@calendar-tsx/rrule` and
uses the same public feature contracts.

## Dependencies and identity

Feature implementations depend on the shared feature contracts and calendar primitives. Registry and runtime
machinery do not import concrete features. Features use shared layout geometry rather than depending on one another.

The shared extension maps compose the feature-owned `*.feature-maps.ts` interfaces through type-only imports.
This keeps built-in declarations in their owning folders and produces one shared set of extension maps in the
bundled declarations. Internal module augmentations retained unresolved source paths in the generated output;
interface inheritance avoids that packaging problem. Third-party augmentation of the public maps remains supported.

Under D54, each configured definition must retain its stable feature identity. Consumer registration keys such
as `background` and `recurrence` will identify view overrides. Renaming a registration key must preserve its type
contributions and event-source resolution. The current source dispatcher still looks up resolvers by the event
definition's `~source` value; that behavior is unchanged by this source reorganization.

Each calendar instance owns its feature state, actions and stage caches. D54 factories will produce reusable
configuration definitions, with per-view overrides changing configuration within that instance.

## Public entry points

Expose explicit feature subpaths directly below the package name:

```ts
import { createCalendar, createCalendarViews, dayGridView, timeGridView } from '@calendar-tsx/core';

import { backgroundFeature, createBackgroundLayer, createWeeklyRanges } from '@calendar-tsx/core/background';

import { recurrenceFeature, createRecurringEvent } from '@calendar-tsx/core/recurrence';
```

| Entry                           | Public exports                                                                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@calendar-tsx/core`            | Calendar assembly, view factories, layout features, calendar primitives and types, public feature contracts and extension maps, plus all public background and recurrence exports. |
| `@calendar-tsx/core/background` | `backgroundFeature`, `createBackgroundLayer`, `createWeeklyRanges` and background-owned public types.                                                                              |
| `@calendar-tsx/core/recurrence` | `recurrenceFeature`, `createRecurringEvent` and recurrence-owned public types.                                                                                                     |

Root re-exports preserve the single-import style in the assembly API. A feature export from root and the same
export from its subpath refer to the same implementation and type declarations. The public paths are
`/background` and `/recurrence`; `features/` is an internal source directory only.

The files in `export/` define the public interface and explicitly re-export supported symbols. Feature runtime
machinery, background decorators, recurrence resolvers, rule compilers and date helpers remain private.
Third-party feature authors import the shared feature contracts and extension maps from root.

## Package and build configuration

The package export map is explicit:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./background": {
      "types": "./dist/background.d.ts",
      "import": "./dist/background.js"
    },
    "./recurrence": {
      "types": "./dist/recurrence.d.ts",
      "import": "./dist/recurrence.js"
    },
    "./package.json": "./package.json"
  }
}
```

Use matching build entries:

```ts
entry: {
  index: 'export/index.ts',
  background: 'export/background.ts',
  recurrence: 'export/recurrence.ts',
}
```

Do not add wildcard package exports. Creating an internal implementation file must not expose a new public
import path. Retain ESM output and the package's side-effect-free contract.

## Migration and verification

Feature implementations, types and tests now live in their owning modules. Explicit feature entries preserve
the existing behavior and root exports. Implementing the documented factory assembly is the next migration;
the package readmes continue to describe the current constant-based registration.

Implementation verification must cover root imports, feature-subpath imports and mixed imports against the
built package. Check that factories and helper exports retain identity across entries, and that declaration
merging reaches the same shared extension maps through every entry. Verify registered aliases, source resolution,
view overrides and inferred model fields. Keep calendar integration coverage alongside feature-owned tests.

Package validation must inspect the built output; publishing these paths requires both JavaScript and
declaration files to resolve. The package-export tests cover implementation identity, feature type contributions,
public extension-map augmentation and state isolation through the built entries.
