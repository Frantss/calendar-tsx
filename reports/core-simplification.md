# Core implementation size and repeated work

## 2026-10-24 investigation

Baseline: `c6de41e`. Scope: non-test TypeScript under `packages/core/src`. Findings below describe the current
implementation and verification limits. No production changes are included.

### 1. Implementation-file lines overstate runtime code

- **What:** non-test source contains 7,184 physical lines. Excluding `.types.ts` and `.feature-maps.ts` leaves 5,365,
  including inline types and imports. Stripping types, comments and imports leaves 4,150 original source lines
  containing runtime tokens and 34,671 runtime tokens.
- **Where:** `packages/core/src/calendar/calendar.ts:1`, `packages/core/src/features/feature.types.ts:1`,
  `packages/core/src/layouts/shared/coordinates.ts:9`; measured across the entire scoped tree.
- **Why it matters:** a reduction based on deleting type files or imports would not establish the requested
  reduction in actual implementation. Runtime size also does not establish whether a behavior is unnecessary.
- **Evidence:** Node 24.13.0 type stripping and Acorn 8.19.0 tokenization. Tests, export entry and other packages
  were excluded. The measurement and probe used tools from installed dependencies.

### 2. Timed layouts repeat preparation after shared projection

- **What:** both timed layouts already share the coordinate projector. Each separately derives display bounds,
  minimum-length intervals and continuation flags from fragments. Their exact background coverage is assembled
  separately from those foreground intervals.
- **Where:** `packages/core/src/layouts/time-grid/time-grid.ts:72`,
  `packages/core/src/layouts/timeline/timeline.ts:86`,
  `packages/core/src/layouts/time-grid/time-grid.ts:93`,
  `packages/core/src/layouts/timeline/timeline.ts:133`.
- **Why it matters:** geometry policy is shared at the fragment level but repeated at the model-preparation level.
  The distinction between foreground enclosure and exact shading is required by D40; their outputs are not equal.

### 3. Settings have overlapping resolution paths

- **What:** `context.settings` merges factory, live-option, view-alias and direct-view layers. The interaction input
  already contains these effective settings, but built-in operations also read and merge direct-view settings.
  Generic `context.config` has its own shallow-override cache. Canonical feature maps are constructed per context.
- **Where:** `packages/core/src/features/feature-runtime.ts:61`,
  `packages/core/src/features/feature-runtime.ts:75`,
  `packages/core/src/features/feature-runtime.ts:98`,
  `packages/core/src/features/interaction/interaction-feature.ts:28`,
  `packages/core/src/features/event-move/event-move-feature.ts:32`,
  `packages/core/src/features/event-resize/event-resize-feature.ts:25`.
- **Why it matters:** the same input passes through several representations. Generic configuration and interaction
  settings have different public semantics, so apparent overlap alone does not establish redundant behavior.

### 4. Date bars and timeline stacks implement equivalent first-fit allocation

- **What:** date bars scan occupied inclusive columns; timeline stacks scan overlapping half-open display
  intervals. Both keep input order and choose the lowest free row. A temporary interval allocator reproduced their
  row assignments in 20,000 comparisons, using 10,000 deterministic arrays per allocator.
- **Where:** `packages/core/src/layouts/shared/bars.ts:11`,
  `packages/core/src/layouts/timeline/timeline.ts:36`.
- **Why it matters:** these are two implementations of the same allocation decision. Time-grid lanes have
  additional sorting, cluster, expansion and cascade contracts at `packages/core/src/layouts/shared/lanes.ts:16`.
- **Verification limit:** the probe compared row numbers, not complete models, type declarations or performance.
  Empty arrays, single-column spans, unsorted order, touching/overlapping intervals and fractional coordinates
  were included. The probe is `/tmp/calendar-core-simplification/packing-probe.mjs`.

### 5. The largest proposed sharing already exists

- **What:** timed coordinates, relocation policy, operation lifetime and DOM transport already have shared owners.
  Layouts, shared geometry and the background feature together contain 1,618 runtime-bearing lines, 39% of core.
- **Where:** `packages/core/src/layouts/shared/coordinates.ts:261`,
  `packages/core/src/features/interaction/placement.ts:25`,
  `packages/core/src/features/interaction/interaction-runtime.ts:70`,
  `packages/core/src/interactions/dom-host.ts:152`.
- **Why it matters:** a proposal to introduce those owners would describe existing implementation. Even deleting
  all layout, shared-geometry and background implementation would leave 2,532 runtime-bearing lines. A 50%
  reduction therefore depends on substantial savings outside that area as well.

### 6. Public extension and lifecycle contracts constrain replacement

- **What:** custom operations may use boolean targets; custom layouts own arbitrary geometry. Controlled
  interaction writes wait for snapshot identity acknowledgment, while runtime leases can precede acknowledgment.
  Browser completion can wait beyond pointer release. Binding refs retain changing descriptors.
- **Where:** `packages/core/tests/types/third-party/public-feature.ts:13`,
  `packages/core/tests/types/third-party/public-layout.ts:9`,
  `packages/core/src/features/interaction/interaction-runtime.ts:119`,
  `packages/core/src/interactions/tests/dom.spec.ts:127`,
  `packages/core/src/interactions/dom.ts:122`.
- **Why it matters:** matching built-in screenshots or serialized models does not establish unchanged behavior.
  These contracts are exercised through the public interface and are part of the requested preservation scope.

Source review and the allocator probe do not establish that half of core can be removed. No complete alternative
implementation, full-suite result or performance comparison is claimed.

## 2026-10-24 replacement measurements

### 7. The consolidation yields a small whole-core reduction

- **What:** after counting the new shared implementation, runtime-bearing lines decrease from 4,150 to 4,107
  (1.0%), and runtime tokens decrease from 34,671 to 34,135 (1.5%). Implementation-file lines decrease from 5,365
  to 5,320. A fresh build's JavaScript decreases from 145,355 to 143,801 bytes. Root declarations are byte-identical.
- **Where:** `packages/core/src/layouts/shared/projection.ts:18`,
  `packages/core/src/features/background/background-layouts.ts:31`,
  `packages/core/src/features/interaction/placement.ts:25`; measured across the same non-test source scope.
- **Why it matters:** removing repeated layout preparation does not establish that half the implementation is
  unnecessary. Shared helpers account for most of the code removed from individual layouts.
- **Evidence:** identical measurement method, a separately built baseline, 720 differential model/interaction
  comparisons, passing full build/check/test commands, and 146 passing Storybook screenshot cases. No performance
  equivalence claim follows from those checks.

### 8. Exported operation descriptors also accept unmerged interaction input

- **What:** built-in feature factories expose typed operation descriptors whose callbacks accept
  `Calendar_InteractionInput`. That type includes raw calendar options and direct view settings, without a marker
  requiring runtime normalization. Current operation callbacks apply direct-view overlays themselves.
- **Where:** `packages/core/src/features/interaction/interaction.types.ts:107`,
  `packages/core/src/features/interaction/interaction.types.ts:124`,
  `packages/core/src/features/event-move/event-move-feature.ts:24`.
- **Why it matters:** treating every descriptor input as premerged would change behavior visible through the
  existing public types, even if calls through the calendar runtime continued to pass.
- **Evidence:** 54 direct descriptor comparisons matched the original with unmerged option/view inputs,
  enabled/disabled overrides, and timed/all-day relocation targets.
