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

## 2026-10-24 replacement-design investigation

### 9. Replacing both timed builders still produces a small whole-core saving

- **What:** an isolated replacement of both builders with one surface-based function and two signature-preserving
  adapters reduced that slice from 293 to 217 runtime-bearing lines and from 2,148 to 1,655 runtime tokens.
  Whole-core totals decreased from 4,107 to 4,031 lines and from 34,135 to 33,642 tokens, a 1.4% token reduction.
- **Where:** `packages/core/src/layouts/time-grid/time-grid.ts:150`,
  `packages/core/src/layouts/timeline/timeline.ts:103`; prototype and patch under
  `/tmp/calendar-core-replacement/`, measured against `21c6931`.
- **Why it matters:** even replacing whole builders leaves most implementation outside this slice. Repeated
  layout branches also remain inside the shared function. This prototype does not establish a half-size design.
- **Evidence:** all 366 core tests, source/public compiler fixtures, core build, identical public declarations,
  720 complete-model/move/preview/commit comparisons and 54 direct descriptor comparisons passed. Reference-graph,
  callback-order and performance equivalence remain outside the differential probe's scope.

### 10. Preview construction and decoration use public models as intermediate representations

- **What:** event preview projectors build a layout from the proposed event, then traverse that layout to extract
  geometry. Background decorators separately traverse columns, rows or day cells to attach shading.
- **Where:** `packages/core/src/layouts/time-grid/time-grid-interactions.ts:81`,
  `packages/core/src/layouts/timeline/timeline-interactions.ts:85`,
  `packages/core/src/layouts/day-grid/day-grid-interactions.ts:81`,
  `packages/core/src/features/background/background-layouts.ts:107`.
- **Why it matters:** a builder-only size comparison does not include these related assembly paths. Feature
  decorators receive the output of preceding stages, so that intermediate model also carries observable ordering
  and extension behavior.

### 11. Command preflight ordering differs across session methods

- **What:** update and commit check the lease, refresh, recheck the lease and then check owner acknowledgment.
  Unavailable checks lease and acknowledgment without refreshing. Publication can invoke owner callbacks
  synchronously; ownership snapshots, pending publication and the internal lease are distinct state.
- **Where:** `packages/core/src/features/interaction/interaction-runtime.ts:122`,
  `packages/core/src/features/interaction/interaction-runtime.ts:214`,
  `packages/core/src/features/interaction/interaction-runtime.ts:239`,
  `packages/core/src/features/interaction/interaction-runtime.ts:291`.
- **Why it matters:** similar-looking guards do not prove identical transitions. Serialized model equality
  cannot verify the callback order or the status returned when callbacks reenter a session method.

## 2026-10-24 replacement implementation measurements

### 12. The implemented candidate misses the half-size budget

- **What:** against `21c6931`, all non-test core source decreases from 7,139 to 6,963 physical lines.
  Implementation-file lines decrease from 5,320 to 5,144, runtime-bearing lines from 4,107 to 3,970, and runtime
  tokens from 34,135 to 33,333. The runtime-token reduction is 2.35%, including the new shared implementation.
- **Where:** `packages/core/src/layouts/shared/surfaces.ts:31`,
  `packages/core/src/features/interaction/date-edit.ts:23`,
  `packages/core/src/features/interaction/interaction-runtime.ts:208`,
  `packages/core/src/interactions/dom-host.ts:173`; measured by `scripts/measure-core.mjs:1`.
- **Why it matters:** the shared implementations retain most of the behavior-specific code removed from callers.
  The architecture's proposed 2,050-line/17,000-token budget has no passing implementation result.
- **Evidence:** source measurements read the control revision directly from Git. Build, test and package results
  are recorded in `docs/core-simplification.md` and `/tmp/calendar-core-implementation/`.

### 13. The guarded dispatcher retains distinct public command transitions

- **What:** synchronous cancellation during a controlled publication makes the outer update return stale, with
  no event completion callback. Marking a target unavailable retains the lease without refreshing; committing
  afterward refreshes and cancels an operation disabled through the live settings object. The returned unavailable
  result and the owned candidate retain separate object identities.
- **Where:** `packages/core/src/tests/integration/interactions.spec.ts:338`,
  `packages/core/src/features/interaction/interaction-runtime.ts:208`.
- **Why it matters:** consolidating preflight checks must retain the public return values and synchronous owner
  effects. The added regressions pass against both control and replacement implementations.

### 14. The compiled size reduction is also small

- **What:** a fresh workspace build produces 138,436 bytes of core JavaScript, compared with the saved control's
  143,801 bytes, a 3.73% decrease. Gzip decreases from 32,813 to 32,428 bytes, or 1.17%. Root declarations remain
  byte-for-byte identical. No manifests, lockfile, public exports, public type files or screenshot baselines changed.
- **Where:** `packages/core/dist/index.js:1`, `packages/core/dist/index.d.ts:1`,
  `/tmp/calendar-core-implementation/bundle-measurements.json`.
- **Why it matters:** the candidate's smaller shared implementations do not produce a half-size distributed
  runtime either. Source-size reduction and compressed bundle reduction measure different outcomes.
- **Evidence:** final `pnpm run build`, `pnpm run check:all` and `pnpm run test` pass; 671 tests pass in 68 files.
  Storybook passes 146 cases in 17 files. Gzip uses the same `gzip.compress(..., mtime=0)` call for both bundles.

## 2026-10-24 further removal audit at `91e2096`

### 15. Four private helpers have no callers

Repository-wide symbol searches find only these declarations. None appears in the package entry point or generated
public declarations. Counts include complete runtime declarations, excluding imports, types, comments and blank lines.

| Helper                        | Declaration                                                | Source lines | Runtime lines | Runtime tokens |
| ----------------------------- | ---------------------------------------------------------- | -----------: | ------------: | -------------: |
| `calendarPeriods_visibleDays` | `packages/core/src/views/periods.ts:79`                    |            5 |             4 |             48 |
| `isBuiltinProposal`           | `packages/core/src/features/interaction/date-target.ts:11` |            2 |             2 |             26 |
| `layoutIntervals_clip`        | `packages/core/src/layouts/shared/intervals.ts:19`         |            5 |             5 |             81 |
| `layoutCoordinates_coverage`  | `packages/core/src/layouts/shared/coordinates.ts:435`      |           11 |            11 |             48 |
| Total                         |                                                            |           23 |            22 |            203 |

The declarations account for 0.61% of the current 33,333 runtime tokens. Their absence has no observed consumer
behavior: an isolated deletion candidate passes the core build, source/public compiler fixtures and all 368 core
tests in 26 files. Generated public declarations are byte-identical. That candidate changes no tests.

The candidate and verification log are under `/tmp/calendar-core-removal-audit/`. Production sources remain
unchanged by this audit. Workspace build/check/test and Storybook commands were not rerun for the report.

### 16. Three private values are not consumed

- The runtime-level `isActive` method at `packages/core/src/features/interaction/interaction-runtime.ts:266` has no
  caller. Public session handles implement their own lease check at line 263. The unused method is not a public
  interaction control.
- The returned `groups` property at `packages/core/src/layouts/shared/surfaces.ts:257` has no reader. Group membership
  is still used within compilation and all-day placement; the array itself is not unused.
- Every call to `paint` supplies its key at `packages/core/src/layouts/shared/surfaces.ts:49`. Its resource/event key
  default is not selected by any call. The offset default is used.

These values add private implementation without contributing to the current call paths. They are not included in
the verified deletion candidate or its 203-token total.

### 17. Three coordinate operations are consumed only by internal tests

| Helper                               | Declaration                                           | Source lines | Runtime lines | Runtime tokens |
| ------------------------------------ | ----------------------------------------------------- | -----------: | ------------: | -------------: |
| `layoutCoordinates_resolve`          | `packages/core/src/layouts/shared/coordinates.ts:319` |           17 |            17 |            191 |
| `layoutCoordinates_projectDates`     | `packages/core/src/layouts/shared/coordinates.ts:373` |           35 |            34 |            326 |
| `layoutCoordinates_timelinePosition` | `packages/core/src/layouts/shared/coordinates.ts:364` |            8 |             8 |             66 |
| Total                                |                                                       |           60 |            59 |            583 |

Production hit location uses `clockTarget` and `calendarClock_candidates` instead of the coordinate resolver
(`packages/core/src/layouts/shared/interaction-geometry.ts:9`, `packages/core/src/features/interaction/clock.ts:3`).
Date bars use `layoutCoordinates_dateColumns` through `layoutSurfaces_dates`, rather than the date-run projector
(`packages/core/src/layouts/shared/surfaces.ts:118`). Timeline builders and previews calculate their own fractions.

This is a second internal implementation path, accounting for another 1.75% of runtime tokens. It is not an
unconditional deletion: `docs/coordinate-model.md` explicitly requires reverse lookup, date runs, omission metadata
and round-trip invariants. `packages/core/src/layouts/shared/tests/coordinates.spec.ts:3` imports all three helpers
and asserts those behaviors. No equivalence result covers their absence. Their savings are excluded from the
verified deletion candidate.

### 18. Operation erasure performs runtime forwarding for type correlation

`eraseOperation` at `packages/core/src/features/interaction/interaction-runtime.ts:33` constructs another descriptor
and command object. Its source, equality, creation, scheduling and completion wrappers primarily apply TypeScript
casts and forward arguments. The private descriptor shape is repeated in
`packages/core/src/features/interaction/operation.internal.ts:16`.

These wrappers have observable details beyond type erasure: several invoke callbacks as methods of the original
specification, optional callbacks are resolved at different times, and API binding receives new command functions.
A direct cast is not established as behavior-equivalent. This layer is a candidate for further design work, with
no measured net saving or passing replacement recorded in this audit.

## 2026-10-24 verified private-code deletion result

### 19. The current core is 235 runtime tokens smaller than `91e2096`

- **What:** current core source contains 6,932 physical lines, 5,113 implementation-file lines, 3,946 runtime-bearing
  lines and 33,098 runtime tokens. Against `91e2096`, those totals decrease by 31, 31, 24 and 235 respectively.
  Runtime tokens decrease by 0.71%. Against the earlier `21c6931` control, the cumulative token reduction is 3.04%.
- **Where:** `packages/core/src/views/periods.ts:79`,
  `packages/core/src/features/interaction/date-target.ts:11`,
  `packages/core/src/layouts/shared/intervals.ts:18`,
  `packages/core/src/layouts/shared/coordinates.ts:434`,
  `packages/core/src/layouts/shared/surfaces.ts:49`,
  `packages/core/src/features/interaction/interaction-runtime.ts:265`.
- **Why it matters:** the savings include the four uncalled helpers and the three unconsumed private values from
  findings 15 and 16. Public session `isActive`, group membership, coordinate operations and operation forwarding
  remain present. No tests, public contracts, dependencies or exports changed. The half-size target remains unmet.
- **Evidence:** `pnpm run build`, `pnpm run check:all` and `pnpm run test` pass. All 671 tests pass in 68 files;
  the public declarations are byte-identical to the pre-deletion build. Built JavaScript decreases from 138,436
  to 138,340 bytes, and gzip from 32,428 to 32,407 bytes with the same Python `gzip.compress(..., mtime=0)` call.
  Complete logs and before/after measurements are under `/tmp/calendar-core-deletions/`. Storybook was not rerun
  for these private deletions. Existing lint warnings remain unchanged.

Initial sandboxed commands failed before the successful allowed reruns. The build reported:

```text
Error: Failed to start the Vite preview server for prerendering
[cause]: Error: listen EPERM: operation not permitted ::1:3000
```

The package checker reported:

```text
~/packages/core$ attw --pack --no-emoji --profile esm-only
error while checking file:
Command failed: npm pack
```

The package checker suppresses its subprocess output; no more specific cause was reported. Both allowed reruns
passed. The root build also ran its configured postbuild formatter; the final diff contains only the six intended
source files and this report. The earlier uncommitted audit text remains intact.
