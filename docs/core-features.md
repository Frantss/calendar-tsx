# Core feature organization and exports

Status: modules own their implementations, types and tests; a single public core entry is implemented. This document extends the
[calendar assembly API](./calendar-assembly.md). D55 and D56 in the [design spec](./design.md) record the decisions.
D54 factory assembly, stable configured identities, inherited participation and per-view overrides are implemented.

## Source organization

Each module owns its implementation and types. Focused tests live beside the module; tests that exercise several
modules live under `tests/integration/`. Shared test fixtures and setup live in `tests/support/`.

```text
packages/core/
  export/
    index.ts

  src/
    calendar/
      calendar.ts
      calendar.types.ts
      navigation.ts
      clock.ts
      tests/

    views/
      views.ts
      view.types.ts
      periods.ts

    events/
      events.ts
      event.types.ts
      sources.ts
      store.ts
      tests/

    dates/
      day-of-week.ts
      ranges.ts
      date.types.ts

    layouts/
      layout-features.ts
      layout.types.ts

      day-grid/
        day-grid.ts
        day-grid.types.ts
        tests/

      time-grid/
        time-grid.ts
        time-grid.types.ts
        tests/

      list/
        list.ts
        list.types.ts
        tests/

      timeline/
        timeline.ts
        timeline.types.ts
        tests/

      shared/
        coordinates.ts
        bars.ts
        columns.ts
        intervals.ts
        lanes.ts
        tests/

    features/
      calendar-features.ts
      feature.types.ts
      feature-maps.types.ts
      feature-runtime.ts
      tests/

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

    interactions/
      dom.ts
      dom.types.ts
      tests/dom.spec.ts

    tests/
      integration/
      support/
```

| Module                           | Responsibility                                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `calendar/`                      | Owns instance creation, options, state, resources, navigation and clock lifecycle.                             |
| `views/`                         | Owns view factories, binding, shared configuration contracts and period calculation.                           |
| `events/`                        | Owns event inputs, normalization, ordering, source dispatch and the optional event store.                      |
| `dates/`                         | Owns weekday values, date contracts and generic date-range helpers.                                            |
| `layouts/`                       | Owns layout features, model construction and model types; shared geometry stays in `layouts/shared/`.          |
| `features/calendar-features.ts`  | Implements `calendarFeatures`, validates registries, resolves configuration and checks view requirements.      |
| `features/feature.types.ts`      | Defines configured definitions, hook contexts, pipeline stages, layout features and feature-state composition. |
| `features/feature-maps.types.ts` | Declares the public extension maps and composes built-in contributions through type-only imports.              |
| `features/feature-runtime.ts`    | Resolves configuration, initializes state and actions, and memoizes feature stages.                            |
| `features/background/`           | Owns background configuration, layers, weekly ranges and layout decoration.                                    |
| `features/recurrence/`           | Owns recurring definitions, rule compilation, date handling and expansion.                                     |

`calendar/calendar.types.ts` contains calendar-level contracts. Event types belong to `events/event.types.ts`;
view contracts belong to `views/view.types.ts`; each layout owns its settings and models. Common layout contracts
and the inferred layout union belong to `layouts/layout.types.ts`. Feature folders retain their own concrete
types and contributions to the shared extension maps.

Interaction factories follow the same ownership rule. `features/interaction/` owns the shared runtime, operation
contracts and date-target helpers. `date-selection/`, `event-move/`, `event-resize/`, `constraints/`, `pointer/`,
`touch/`, `auto-scroll/`, `external-drop/` and `cross-calendar/` each own their factory, types and feature-map
contributions. Shared maps compose these interfaces through type-only imports. The operation map remains open to
third-party augmentation.

Each layout owns its `locate` and `project` implementation in its `*-interactions.ts` file and its point types in
its existing `*.types.ts` file. `layouts/interaction.types.ts` owns the common capability contracts and extension
map; `layouts/shared/interaction-geometry.ts` owns the shared clock and selection geometry helpers.

`interactions/dom.ts` owns browser transport and host coordination. Its public host and surface contracts live in
`interactions/dom.types.ts`. Cross-feature editing and layout tests live in `tests/integration/`; reusable setup
and the third-party operation fixture live in `tests/support/`.

Internal modules import declarations directly from their owners. There are no internal index barrels or central
type re-export module. `export/index.ts` explicitly selects the existing public names, keeping internal helpers
private. Declaration imports may form type-only cycles where the extension contracts refer to calendar models.

Layouts remain supplied by views. The optional RRule integration remains in `@calendar-tsx/rrule` and uses the
same public feature contracts.

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
