# Core feature organization and exports

Status: feature-owned source organization and a single public core entry implemented. This document extends the
[calendar assembly API](./calendar-assembly.md). D55 in the [design spec](./design.md) records the decision.
D54 factory assembly, stable configured identities, inherited participation and per-view overrides are implemented.

## Source organization

Keep shared feature machinery together and give each built-in feature its own module. Each feature owns its
factory, configuration types, helpers, type contributions and tests.

```text
packages/core/
  export/
    index.ts

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

| Module                           | Responsibility                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `features/calendar-features.ts`  | Implements `calendarFeatures`, validates registries, resolves configuration and checks view requirements.           |
| `features/feature.types.ts`      | Defines configured factory results, hook contexts, pipeline stages and layout features.                             |
| `features/feature-maps.types.ts` | Declares the common extension maps and composes built-in contributions through type-only imports.                   |
| `features/feature-runtime.ts`    | Resolves per-view configuration, initializes feature state and actions, and memoizes feature stages.                |
| `features/background/`           | Owns the background factory, layer types, weekly-range helpers and layout decoration.                               |
| `features/recurrence/`           | Owns the recurrence factory, recurring-event constructors and types, rule compilation, date handling and expansion. |

`calendar.ts` owns the calendar store and pipeline order. It delegates common feature mechanics to the feature
runtime. `calendar-views.ts` implements `calendarViews`, binding each view to registered definitions and validating
configuration overrides.
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

Each configured definition carries its stable `~id`, while consumer keys such as `background` and `recurrence`
identify view overrides. The source dispatcher indexes implementations by stable identity, so registration aliases
preserve event-source resolution. Feature-map selection normalizes aliases to canonical identities.

Each calendar instance owns its feature state, actions and stage caches. Factories produce reusable definitions;
per-view overrides change configuration within that instance. Object values shallow-merge and arrays replace defaults.

## Public entry point

Expose all public calendar and feature symbols from `@calendar-tsx/core`:

```ts
import {
  createCalendar,
  calendarFeatures,
  calendarViews,
  dayGridView,
  timeGridView,
  backgroundFeature,
  createBackgroundLayer,
  createWeeklyRanges,
  recurrenceFeature,
  createRecurringEvent,
} from '@calendar-tsx/core';
```

| Entry                | Public exports                                                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@calendar-tsx/core` | Calendar assembly, view factories, layout features, calendar primitives and types, public feature contracts and extension maps, plus all public background and recurrence exports. |

Feature ownership is an internal source boundary. The public API uses one core entry, independently of how
features are organized in `src/features/`.

`export/index.ts` defines the public interface and explicitly re-exports supported symbols. Feature runtime
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
    "./package.json": "./package.json"
  }
}
```

The package metadata path remains available. Build one code entry:

```ts
entry: {
  index: 'export/index.ts',
}
```

Do not add wildcard package exports. Creating an internal implementation file must not expose a new public
import path. Retain ESM output and the package's side-effect-free contract.

## Migration and verification

Feature implementations, types and tests live in their owning modules. Replace feature-subpath imports with root
imports. The package readmes and compiled examples use factory assembly through `@calendar-tsx/core`.

Implementation verification must cover factories, helpers and types imported from the built root entry, and
declaration merging through its public extension maps. Verify registered aliases, source resolution,
view overrides and inferred model fields. Keep calendar integration coverage alongside feature-owned tests.

Package validation must inspect the built output; the root JavaScript and declaration files must resolve, and
removed feature subpaths must be inaccessible. The package-export tests cover feature type contributions,
public extension-map augmentation and state isolation through the built root entry.
