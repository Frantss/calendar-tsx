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

## 10. A third prototype operation reuses the session and geometry seams

- **What:** resize-only registrations complete start/end edits without movement, selection or a selected-range slice.
  Core and adapter compiler fixtures retain payloads and exclude unregistered APIs. Real pointer runs cover both
  layouts, both adapters and all ownership modes, with zero base builds during drafts and full cleanup on unmount.
  Inclusive all-day end shrinking also completes in both layouts/adapters.
- **Where:** `packages/core/prototypes/interaction-foundation/runtime.ts:139`;
  `packages/core/prototypes/interaction-foundation/feature-types.ts:34`;
  `packages/core/prototypes/interaction-foundation/bindings/setup.ts:80`;
  `packages/react/prototypes/interaction-foundation/types.verify.tsx:108`;
  `packages/solid/prototypes/interaction-foundation/types.verify.tsx:108`.
- **Why it matters:** independent operation registration holds for a third operation. The closed intent/proposal
  unions and enumerated API facade still limit this evidence to built-in operations; arbitrary third-party
  operation registration remains unproved.

## 11. Very short timeline bars do not provide separate pointer-sized edges

- **What:** the two-minute fixture produces a timeline bar narrower than its resize handles. Its semantic resize API
  is available, but separate pointer targets for both edges are not demonstrated by the current prototype UI.
- **Where:** `packages/core/prototypes/interaction-foundation/bindings/setup.ts:43`;
  `packages/core/prototypes/interaction-foundation/bindings/style.css:222`.
- **Why it matters:** runtime/API independence does not establish usable pointer affordances at every rendering
  density. The real-pointer resize proof uses the separate hour-long `Resizable` fixture.

## 12. Independent operation-map extension verifies the shared dispatch seam

- **What:** a priority feature declares its own intent, non-date target and event-bearing result without loading the
  built-in operation declarations. Its isolated compiler fixture rejects a built-in operation key. Mixed core and
  adapter fixtures preserve payload inference and omit unregistered APIs/state. Direct probes cover its own
  equality, policy changes, source identity, callbacks and all ownership modes; the extension executes with only
  neutral modules in its import graph. Existing resize probes also pass with the built-ins extracted.
- **Where:** `packages/core/prototypes/interaction-foundation/runtime.ts:5`;
  `packages/core/prototypes/interaction-foundation/third-party/priority.ts:18`;
  `packages/core/prototypes/interaction-foundation/third-party/types.verify.ts:1`;
  `packages/core/prototypes/interaction-foundation/third-party/tsconfig.json:1`;
  `packages/react/prototypes/interaction-foundation/types.verify.tsx:140`;
  `packages/solid/prototypes/interaction-foundation/types.verify.tsx:140`.
- **Why it matters:** the closed-union limitation in observation 10 no longer reproduces. Prototype extensibility
  now has independent type and runtime evidence; production registration, tree shaking and third-party pointer
  integration remain outside that evidence.

## 13. Operation APIs participate in the production feature lifecycle

- **What:** the real constructor installs selection, movement, resizing and a separately declared non-date operation
  from resolved descriptors. Feature API construction can observe all descriptors without depending on registration
  order. Option sync refreshes drafts without tracking interaction settings as layout inputs. Final unmount cancels
  leases even before controlled acknowledgment; remount retains native readonly TanStack store subscriptions.
  Selection uses D29 persistent state, while event edits retain consumer input ownership. The prototype facade is
  absent, and both geometry harnesses use the installed instance APIs.
- **Where:** `packages/core/src/calendar-interactions.ts:251`; `packages/core/src/calendar.ts:137`;
  `packages/core/src/calendar.types.ts:412`; `packages/core/src/tests/calendar-interactions.spec.ts:233`;
  `packages/core/prototypes/interaction-foundation/bindings/host.ts:41`.
- **Why it matters:** the production construction limitation in the earlier observations no longer reproduces.
  Built-in DOM drivers and layout interaction capabilities remain distinct from API installation.

## 14. Public declaration compilation catches private augmentation paths

- **What:** the installed declaration bundler retained private `#calendar.types` augmentation paths in an intermediate
  build. Source checks passed, but a public consumer had no move/resize API and rejected the interaction descriptor
  property. The current published declaration fixture checks the package's built-in maps and a third-party operation
  with a boolean target, including payload inference and absent APIs.
- **Where:** `packages/core/src/calendar.types.ts:128`;
  `packages/core/src/calendar-interaction.types.ts:22`;
  `packages/core/prototypes/interaction-foundation/types.public.verify.ts:1`;
  `packages/core/prototypes/interaction-foundation/third-party/public-feature.ts:1`.
- **Why it matters:** source-only augmentation checks do not establish that a bundled public package exposes the same
  feature types. The built-declaration fixture no longer requires stand-in declarations for built-in APIs.

## 15. Production completion observation follows the host's mounted lifetime

- **What:** React StrictMode calls the host initializer twice. Assigning completion observation during initialization
  let a discarded host retain an earlier build baseline, reporting one draft build although actual builds were
  unchanged. The mounted host's completion observation now reports zero draft builds in both layouts/adapters and
  every ownership mode. Preview/applied geometry differs by at most `0.015625px`; cleanup releases all observed
  listeners, surfaces and subscriptions.
- **Where:** `packages/core/prototypes/interaction-foundation/bindings/host.ts:42`;
  `packages/core/prototypes/interaction-foundation/bindings/host.ts:436`.
- **Why it matters:** moving API construction into production changes which instance invokes completion. Constructor
  side effects in a throwaway host cannot establish the lifetime of that observer under StrictMode.

## 16. Equivalent inline settings retain draft identity during options sync

- **What:** an active draft keeps its snapshot and publishes no notification when new selection/movement/resize or
  constraint setting objects retain the same values. The regression initially failed at
  `expect(calendar.api.interactions.store.state).toBe(draft)`: the old and new snapshots were value-equivalent but
  reference-distinct. Built-in dependency observations now track the fields that affect evaluation.
- **Where:** `packages/core/src/calendar-editing.ts:211`;
  `packages/core/src/tests/calendar-interactions.spec.ts:255`.
- **Why it matters:** a whole-snapshot selector can render a new options object. Republish-on-reference-change would
  make that render trigger another notification even though the policy did not change.

## Recurrence coexistence after the main rebase — 2026-10-24

- `packages/core/src/calendar-editing.ts:120` and `:168`: movement and resizing look up supplied inputs by ID. Recurring definitions are unavailable sources; generated occurrence IDs are absent from that input array. Editing an occurrence or series remains outside the current operations.
- `packages/core/src/calendar-editing.ts:240`: overlap validation checks supplied concrete events and skips source definitions. Generated recurring occurrences therefore do not block an interaction through this validator.

## Remaining proposal coverage at 56b1bc1 with restored production work

- **Input and transfers:** `packages/core/export/index.ts:30` exports the runtime and four operation/policy features, but no pointer, touch, autoscroll, external-drop or cross-calendar feature. The pointer host is still under `packages/core/prototypes/interaction-foundation/bindings/host.ts:237`. React/Solid exports contain display parts and calendar hooks, with no production interaction bindings. These proposed behaviors cannot yet be enabled through the published feature/binding surface.
- **Layout coverage:** `packages/core/src/calendar-layouts.ts:35` builds day grids without locate/project capabilities; `packages/core/src/calendar-layout-interaction.types.ts:22` registers builtin target/preview shapes only for time-grid and timeline. Month/day-grid gesture geometry from the proposal is missing.
- **Scheduling policy:** `packages/core/src/calendar-editing.ts:230` implements a timed concrete-event overlap check only. It has no allowed-window or resource-availability enforcement, and excludes all-day ranges and recurring definitions. The validator extension seam exists, but the proposed scheduling policy feature is incomplete.
- **Movement policy:** `packages/core/src/calendar-editing.ts:123` replaces the resource list with the target resource when supplied; `:149` rejects timed/all-day conversion. `packages/core/src/calendar.types.ts:169` exposes only an enabled flag for movement. The proposed conversion and configurable resource behavior are not implemented.
- **Historical status:** `docs/interaction-foundation.md:234` still calls production layout registration unproved, while its D54 section and production descriptors establish that implementation. Earlier report entries are historical observations rather than a current gap list.

## Production proposal coverage after D55 — 2026-10-24

- **Browser transport:** `packages/core/src/calendar-dom.ts:141` mounts the shared pointer host;
  `packages/core/src/calendar-input.ts:12` registers pointer, touch and autoscroll settings independently. Core's
  main entry contains no DOM driver import. Production display-only bundles for core, React and Solid omit the DOM
  driver, and all four published entries import under Node without browser globals. This establishes the optional
  browser boundary beyond the historical harness.
- **Bindings:** `packages/react/src/use-calendar-interactions.ts:7` and
  `packages/solid/src/use-calendar-interactions.ts:7` share callback refs and transient preview subscriptions.
  Adapter browser tests exercise native Chromium resizing in both time-grid and timeline layouts without movement
  or selection. The callbacks preserve event payloads and unmount cancels active sessions.
- **Transfers:** `packages/core/src/calendar-transfers.ts:82` installs external creation;
  `packages/core/src/calendar-transfers.ts:133` installs cross-calendar coordination. Controlled source/destination
  hosts can acknowledge asynchronously while the source lease remains reserved. Only the source emits a transfer
  proposal; both event arrays remain unchanged. Programmatic callers own prepared-handle release on abandonment.
- **Geometry and policies:** `packages/core/src/layout/layout-interactions.ts:247` adds day-grid location and
  projection, including exclusive timed midnight resize boundaries. `packages/core/src/calendar-policies.ts:36`
  applies the accepted conversion/resource defaults; `packages/core/src/calendar-policies.ts:117` checks allowed
  windows, business hours, resource availability and concrete timed/all-day/background overlap. These close the
  corresponding gaps recorded above.
- **Scope boundary:** recurrence definitions remain excluded from interaction editing and overlap expansion.
  Consumer preview/handle rendering and applying proposals remain application responsibilities, as specified in the
  original proposal. The historical prototype still owns its old transport; the production tests verify the new host.

## Prototype removal — 2026-10-24

- **What:** the standalone runtime, demos, framework harnesses and prototype scripts were removed after production
  integration. Historical paths above identify evidence at the time of each finding and no longer identify live files.
- **Where:** `packages/core/src/tests/fixtures/priority.ts:1` retains the third-party runtime fixture;
  `packages/core/tests/types/tsconfig.json:1`, `packages/react/tests/types/tsconfig.json:1` and
  `packages/solid/tests/types/tsconfig.json:1` retain source/public API verification.
- **Why it matters:** production tests no longer depend on a prototype directory, and the retained compiler checks
  run through the normal package `check:types` scripts.

## Factory assembly rebase — 2026-10-24

- **What:** the interaction decisions are now D56–D58 because the rebased design already uses D53–D55.
- **Where:** `docs/design.md:1504`; `packages/core/src/features/feature-runtime.ts:53` resolves feature contexts,
  while `packages/core/tests/types/types.public.verify.ts:1` exercises factory assembly through public exports.
- **Why it matters:** earlier decision numbers in this report are historical. Interaction prerequisites use canonical
  identities, view overrides use registration aliases, and unregistered operations still contribute no API or state.

- **Export contract after the second rebase:** `packages/core/export/index.ts` exports the DOM helpers from the
  root alongside the other public APIs, matching D55. The former `@calendar-tsx/core/dom` references above describe
  the pre-rebase package. Browser listeners still require mounting a host; importing the package does not mount one.

## Module ownership after the main rebase (2026-10-24)

- **What:** the interaction implementation follows main's module ownership structure. Each opt-in feature owns its
  factory, contracts and map contributions; the shared runtime stays in `features/interaction/`.
- **Where:** `packages/core/src/features/interaction/interaction-runtime.ts:1`,
  `packages/core/src/features/feature-maps.types.ts:1`, `packages/core/src/interactions/dom.ts:1`,
  `packages/core/src/layouts/shared/interaction-geometry.ts:1`,
  `packages/react/src/interactions/use-calendar-interactions.ts:1` and
  `packages/solid/src/interactions/use-calendar-interactions.ts:1`. Layout-specific location/projection lives beside
  each layout. Cross-feature tests and shared fixtures follow `tests/integration/` and `tests/support/`.
- **Why it matters:** direct owner imports preserve the single public entry and third-party augmentation without
  restoring the removed central type facade. All 53 moved runtime declarations retain their previous bodies.
- **Decision references:** main owns D56–D57; interaction decisions now use D58–D60. Earlier report entries retain
  their historical paths and decision numbers.
