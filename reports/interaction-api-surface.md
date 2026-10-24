# Interaction API surface

## 2026-10-24 source review

Reviewed `60cba43` against D58–D60. These findings come from source inspection;
this review did not run runtime tests or new compiler probes.

### Semantic operations require browser configuration

- **What:** external creation and cross-calendar transfer declare `pointerFeature`
  as a prerequisite although their operation implementations do not use pointer
  settings or DOM APIs. D60 currently documents this requirement.
- **Where:** `packages/core/src/features/external-drop/external-drop-feature.ts:41`
  and `packages/core/src/features/cross-calendar/cross-calendar-feature.ts:55`.
- **Why it matters:** programmatic consumers must install browser input
  configuration to use these semantic operations.

### Placement behavior crosses feature ownership

- **What:** creation and transfer import placement from the movement module.
  Transfer also reads movement settings on the receiver. A source transfer
  reservation starts through the optional movement API.
- **Where:** `packages/core/src/features/external-drop/external-drop-feature.ts:5`,
  `packages/core/src/features/cross-calendar/cross-calendar-feature.ts:6`,
  `packages/core/src/features/cross-calendar/cross-calendar-feature.ts:31` and
  `packages/core/src/features/cross-calendar/cross-calendar-feature.ts:73`.
- **Why it matters:** receiver placement depends on another feature's configuration
  even when that feature is not installed. Source movement coupling has a distinct,
  documented purpose: reserving a movement lease and enforcing movement permission.

### Operation identity is lost at the session boundary

- **What:** typed operation commands return a common start result containing a
  numeric token. Shared `update` accepts the union of all registered target types,
  without tying the target to the operation that issued the token. Runtime target
  guards still validate the selected operation.
- **Where:** `packages/core/src/features/interaction/interaction.types.ts:100` and
  `packages/core/src/features/interaction/interaction-runtime.ts:193`.
- **Why it matters:** compile-time operation/target correlation ends after `begin`;
  a target valid for a different operation can reach runtime validation.

### Public contracts expose internal dispatch and lifecycle details

- **What:** the public entry exports both the typed operation specification and its
  erased dispatch representation. Interaction controls are derived from the runtime
  implementation type. Update and commit return strings and potentially absent
  values rather than the structured evaluation result used elsewhere.
- **Where:** `packages/core/export/index.ts:162`,
  `packages/core/src/features/interaction/interaction.types.ts:132`,
  `packages/core/src/features/interaction/interaction.types.ts:154` and
  `packages/core/src/features/interaction/interaction-runtime.ts:193`.
- **Why it matters:** implementation refactors can affect declarations consumed by
  applications and extension authors; callers must understand several result shapes.

### The DOM coordinator knows individual semantic operations

- **What:** the DOM calendar contract enumerates selection, movement, resizing,
  creation and transfer APIs. Gesture startup chooses between these operations.
  Its custom-operation interface erases targets to `unknown`. The host contract
  exposes internal hit routing as well as registration and lifecycle methods.
- **Where:** `packages/core/src/interactions/dom.types.ts:11`,
  `packages/core/src/interactions/dom.types.ts:39`,
  `packages/core/src/interactions/dom.types.ts:44` and
  `packages/core/src/interactions/dom.ts:280`.
- **Why it matters:** browser transport and built-in operation binding have one
  implementation boundary, while third-party bindings get a different type contract.

### External drag activation depends on host registration order

- **What:** external draggables find the first compatible registered host in the
  same document and use that host's pointer and touch settings to start tracking.
- **Where:** `packages/core/src/interactions/dom.ts:506`.
- **Why it matters:** with several receiving calendars, activation policy depends
  on host registration order before a destination has been selected.

### Framework interaction hooks combine observation and DOM mounting

- **What:** both hooks require `Calendar_DomCalendar`, mount the shared bindings,
  subscribe to preview, and return all binding methods including `mount`.
- **Where:** `packages/react/src/interactions/use-calendar-interactions.ts:7` and
  `packages/solid/src/interactions/use-calendar-interactions.ts:7`.
- **Why it matters:** using these hooks to observe a programmatic interaction
  requires pointer capability. Their return type also exposes lifecycle work the
  framework hook already owns. Direct store subscription remains available.

### A transfer callback option has no implementation

- **What:** `onEventReceive` is declared, but has no invocation in core source.
  Completion invokes the source's `onEventTransfer`, matching D60's single atomic
  proposal contract.
- **Where:** `packages/core/src/features/cross-calendar/cross-calendar.feature-maps.ts:9`
  and `packages/core/src/features/cross-calendar/cross-calendar-feature.ts:105`.
- **Why it matters:** the accepted option suggests destination notification that
  consumers will not receive.

### Built-in scheduling helpers recognize a closed set of proposals

- **What:** the runtime dispatches extensible operations, but constraints and
  built-in date projection identify selection, movement, resizing, creation and
  transfer explicitly. Other proposal kinds are ignored by these helpers.
- **Where:** `packages/core/src/features/constraints/constraints-feature.ts:19` and
  `packages/core/src/layouts/shared/interaction-geometry.ts:32`.
- **Why it matters:** custom operations can use the shared runtime and custom
  layouts, but custom date operations do not automatically participate in built-in
  scheduling constraints or previews.
