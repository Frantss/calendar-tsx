# Interaction foundation implementation observations

Checked at `fd13cd8` while proposing the optional interaction foundation.

## 1. Existing feature state participates in the full calendar derivation

- **What:** feature `setState` writes the internal store. The public calendar store reads every feature state key
  during the same derivation that normalizes, sorts and lays out input events.
- **Where:** `packages/core/src/calendar.ts:123`; `packages/core/src/calendar.ts:190`;
  `packages/core/src/calendar.ts:220`.
- **Why it matters:** putting pointer-rate draft state in an ordinary feature slice couples draft updates to base
  event/layout work, even when input event references do not change.

## 2. Layout features currently expose no interaction geometry capability

- **What:** a layout feature supplies `period`, `range`, `step` and `build`; there is no `locate` or preview projection
  interface. Feature context exposes options, view, actions, state access and settings, but no resolved descriptor
  snapshot or public model read.
- **Where:** `packages/core/src/calendar.types.ts:366`; `packages/core/src/calendar.types.ts:398`.
- **Why it matters:** shared input handling has no existing typed way to interpret view-specific targets or request
  matching preview geometry.

## 3. Existing prerequisite validation covers view registrations only

- **What:** `Calendar_ValidateFeatures` checks that the calendar registers compatible implementations for the keys
  views declare. `Calendar_Feature` has no prerequisite metadata or mounted-input lifecycle hook.
- **Where:** `packages/core/src/calendar.types.ts:385`; `packages/core/src/calendar.types.ts:433`.
- **Why it matters:** independently enabled interaction behavior and input drivers introduce relationships that the
  current feature-registration check does not express.

## 4. Clock-axis projection does not define interactive disambiguation

- **What:** the D40 helper projects real intervals into clock positions and can enclose both occurrences of a
  repeated hour. It exposes forward point/interval projection, not a unique inverse mapping to real instants.
- **Where:** `packages/core/src/layout/layout-axis.ts:53`; `docs/design.md:1080`.
- **Why it matters:** a pointer location within a missing or repeated clock hour needs an interaction rule; correct
  rendering alone does not decide which instant an edit should use.

## 5. Feature API contributions cannot currently retain event payload types

- **What:** the options feature map receives `TData` and `TResourceData`, but `Calendar_Api_FeatureMap` has no generic
  context. The selection/movement type prototype retains payload inference in callbacks and loses it in API return
  values when using the existing map directly.
- **Where:** `packages/core/src/calendar.types.ts:115`; `packages/core/src/calendar.types.ts:123`;
  `packages/core/prototypes/interaction-foundation/types.verify.ts:179`.
- **Why it matters:** a movement API returning a replacement event cannot express the consumer's payload through
  today's API contribution map, even when the originating events and callbacks have precise types.

## 6. Adapter context erasure retains required feature state

- **What:** both adapters erase instances to `Calendar_Instance<unknown, unknown, Calendar_Views>` with a wide feature
  map. Once selection contributes required `selectedRange` state, a display-only instance is rejected by
  `CalendarProvider`. Compiling the generic `Calendar` wrappers from source also reports `TS2322`, with
  `selectedRange` missing from the generic instance. Consumer fixtures reproduce the provider rejection.
- **Where:** `packages/react/src/use-calendar.tsx:18`; `packages/react/src/use-calendar.tsx:101`;
  `packages/solid/src/use-calendar.tsx:18`; `packages/solid/src/use-calendar.tsx:105`;
  `packages/react/prototypes/interaction-foundation/types.verify.tsx:18`;
  `packages/solid/prototypes/interaction-foundation/types.verify.tsx:18`.
- **Why it matters:** importing an optional feature's state declaration can make a calendar that omits that feature
  fail adapter typing. This limits the current D29 opt-in contract independently of interaction runtime behavior.

## 7. Adapter opt-in typing verification after observation 6

- **What:** React and Solid compiler fixtures now accept display-only, movement-only and selection-enabled instances
  through both `CalendarProvider` and `Calendar`, with the selection augmentation imported. Source compilation also
  accepts the generic wrappers. Absent selection state/APIs, absent movement in selection-only instances, precise
  selection results and inferred view keys remain checked rejections.
- **Where:** `packages/react/prototypes/interaction-foundation/types.verify.tsx:23`;
  `packages/solid/prototypes/interaction-foundation/types.verify.tsx:23`;
  `packages/react/prototypes/interaction-foundation/tsconfig.public.json:1`;
  `packages/solid/prototypes/interaction-foundation/tsconfig.public.json:1`.
- **Why it matters:** observation 6 no longer reproduces against either adapter's source or built declarations;
  optional feature declarations no longer force selection onto unrelated calendars.

## 8. Feature API payload verification after observation 5

- **What:** feature API results preserve inferred event and resource data through `Calendar_Instance`. Movement
  compiler fixtures retain the consumer's payload on both `before` and `after` through core, React and Solid,
  including built declarations. Missing payload fields and incorrect value types remain rejected. API annotations
  that omit payload types retain `unknown`; existing non-generic feature declarations still compile.
- **Where:** `packages/core/src/calendar.types.ts:124`; `packages/core/src/calendar.types.ts:556`;
  `packages/core/src/tests/calendar-features.spec.ts:145`;
  `packages/core/prototypes/interaction-foundation/types.verify.ts:189`;
  `packages/core/prototypes/interaction-foundation/types.public.verify.ts:18`;
  `packages/react/prototypes/interaction-foundation/types.verify.tsx:72`;
  `packages/solid/prototypes/interaction-foundation/types.verify.tsx:72`.
- **Why it matters:** observation 5 no longer reproduces. Movement API results and callbacks expose the same event
  payload type without a separate contextual API map.

## 9. Published feature guide still reports the resolved provider limitation

- **What:** the feature guide warns that every calendar must register every feature with merged state. Observation 7
  verifies that omitted feature state is now accepted by both adapters.
- **Where:** `apps/docs/content/shared/extending/features.mdx:99`.
- **Why it matters:** the warning directs consumers to enable optional behavior unnecessarily and contradicts the
  verified opt-in provider contract.
