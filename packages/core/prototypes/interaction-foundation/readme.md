# Interaction foundation prototype

Throwaway experiment on `codex/interaction-foundation-prototype`, based on `fd13cd8`.
Production interaction exports are unchanged. Adapter context and feature API payload typing were corrected after
this experiment.
Context: [design proposal](../../../../docs/interaction-foundation.md).

## Run

For real geometry and framework bindings, build the packages once, then start both harnesses:

```bash
pnpm run build
pnpm run prototype:interactions
```

- [React harness](http://127.0.0.1:5177/prototypes/interaction-foundation/)
- [Solid harness](http://127.0.0.1:5178/prototypes/interaction-foundation/)

`pnpm run prototype:interactions:types` checks the core sketch and both adapters against source and built declarations.
`pnpm run prototype:interactions:build` bundles both harnesses under each adapter's ignored `dist` directory.
They consume built public adapter exports and alias core to its current source. Framework compilation is required
for this extension. The original standalone logic demo remains available below.

Open [demo.html](demo.html) directly in a browser. It is self-contained, including Temporal, and needs no server or
network. All data stays in memory. Feature setup resets the demo.

From the repository root:

```bash
pnpm exec node packages/core/prototypes/interaction-foundation/build-demo.mjs
pnpm exec tsc -p packages/core/prototypes/interaction-foundation/tsconfig.json
```

The generator strips TypeScript with Node's `stripTypeScriptTypes`, embedding the same [runtime.ts](runtime.ts) used
in direct probes, plus Temporal's standalone global build and license. Edit [demo.template.html](demo.template.html)
and regenerate; do not edit generated HTML.

## Verdict

Selection and movement can share lifecycle and validation while remaining independently registered. Programmatic
evaluation, pointer updates and completion use the same evaluator. Input events change only through the demo
application's Apply action.

Two details carry into the proposed design:

- Operation entry points belong to their feature: `selection.begin/evaluate` and `move.begin/evaluate`. Shared public
  controls expose update, commit, cancel and observation. Unrestricted `begin/evaluate` stay internal, preventing
  movement through a selection-only calendar's public runtime interface.
- The runtime reserves and consumes token leases independently of owner-supplied snapshots. Delaying a controlled
  write cannot permit competing sessions or duplicate completion. Commands return `awaiting-owner` until required
  snapshots are accepted. The controlled host echoes the requested snapshot object and calls `refresh`; direct
  external-state updates also require `refresh`. Arbitrary snapshot cloning is outside this prototype contract.

Production `Calendar_Api_FeatureMap<TData, TResourceData>` now carries consumer payload types into feature API return
values. The [feature declarations](feature-types.ts) use that map directly, without the contextual-map workaround.
Movement results preserve the event payload on both `before` and `after` through core, React and Solid instances.

## Verification

[types.verify.ts](types.verify.ts) compiles with installed TypeScript 7.0.2 against the actual view factories, feature
maps, options, API and state. It is compiler input only: do not execute its deliberately invalid expressions.
Its 36 checked `@ts-expect-error` cases verify absent feature APIs/options/settings/state, missing and inactive
prerequisites, event payload inference, selection discriminants and exclusive state ownership. Calendar-wide
prerequisites and reverse registration order compile. Cycles are runtime checks; widened feature records retain
D29's existing loss of precise static gating. [types.public.verify.ts](types.public.verify.ts) verifies movement
payload inference against built core declarations. Omitting payload type arguments deliberately retains `unknown`.

Chromium drove all 11 guided walkthroughs: selection, movement, shared overlap checks, an arriving booking, competing
sessions/stale tokens, source replacement, inactive views, controlled writes, all-day bounds, DST targets and cleanup.
Programmatic selection and movement rejected the same overlap. Commit rechecked arriving input. Delayed controlled
writes allowed neither competing begins nor duplicate completion. An external atom accepted synchronous writes.

Actual pointer drags completed both operations. The transport had five listeners while mounted and zero when
disabled/unmounted. A real `createCalendar` probe observed zero base-store notifications, stable layout identity,
unchanged input, no repeated-target publication and one completion emission. Missing prerequisites and cycles were
rejected at runtime. New York's missing 02:30 was unavailable; repeated 01:30 preserved a matching source offset or
chose the earlier occurrence. This DST policy remains provisional.

The 390px demo had no page-level horizontal overflow; text/control contrast and keyboard controls were checked.
Build, `check:all` and all 275 existing tests passed. Initial sandboxed prerendering failed with
`listen EPERM ::1:3000`; retrying with localhost access passed. Existing lint/build warnings remain. No prototype
runtime test suite was added: verification used the compiler, browser interactions and direct probes.
Package validation initially reported `Command failed: npm pack`; using a writable temporary npm cache passed.

## Initial proof limits

Production construction, automatic state subscriptions, persistent selection wiring, React/Solid lifetimes and real
layout `locate/project` capabilities remain unproved. The demo uses one simplified UTC surface; a timeline and second
framework adapter still need to exercise those seams. The open third-party operation map and tree shaking are unverified.

Moves target a new start, preserving elapsed timed duration or inclusive all-day length, and can replace resources
with one resource. Pointer grab offset, timed/all-day conversion, grouped movement, resource/all-day-overlap policies
and transition-crossing preview geometry are outside this proof. The memory store stands in for a TanStack store.

## Geometry and framework extension

The [geometry module](bindings/geometry.ts) uses real time-grid/timeline models. Movement previews call production
layout builders with the proposed event; selection uses production D40 axis helpers without fabricating an event.
Preview builds are counted separately. Overlay lanes/stack rows remain independent; neighbors are not repacked.

The [DOM host](bindings/host.ts) measures real parts, excludes the all-day gutter, snaps clock positions and retains
date/resource identity. It keeps local clock positions even when they have no instant, applying grab offsets before
resolving move destinations. Unavailable hits clear stale candidates. Events remain application input until Apply.

React uses production hooks, provider, selectors, parts and forwarded refs, plus `useSyncExternalStore`, under
StrictMode. Solid uses its production counterparts, signals and owner cleanup. Both automatically subscribe to
base input and external atoms. Accepted selection is a controlled D29 slice. React acknowledges controlled drafts
in a layout effect; the shared transport coalesces targets and defers completion until the owner accepts them.
Solid attaches the pointer host through `untrack`, so draft reads do not recreate listeners.

Fixtures cover UTC, New York spring/autumn DST and Lord Howe's half-hour transition. Each spans two dates/resources
in date-first column order, with overlaps, a two-minute event, midnight crossing and an inclusive all-day event.
The inspector shows session state, selection, geometry, input, builds, listeners and subscriptions.

Source compilation exposed the
[adapter context-erasure gap](../../../../reports/interaction-foundation.md#6-adapter-context-erasure-retains-required-feature-state),
now resolved by erasing optional feature state and layout decorations at the provider boundary. Each adapter's
`types.verify.tsx` positively checks display-only, movement-only, resize-only and selection-enabled providers and `Calendar`
wrappers against source and built declarations. Display views cover list, month, time-grid and timeline layouts.
Thirteen negative assertions per adapter preserve absent selection state/APIs, selection-only movement exclusion,
selector result types, view-key inference and movement payload types. The 36 core assertions and six public-core
assertions also compile. Runtime behavior is unchanged.

### Extension verification

- Both layouts and all three ownership modes completed real pointer selection/movement in both frameworks: 12
  combinations, each emitting once per operation, with zero base layout builds during the draft. Grab offsets and
  resource reassignment were preserved. Input changed only through Apply.
- Native event bounds across four fixtures and both layouts/adapters differed from model geometry by at most
  `0.015625px`. Movement preview fractions matched the corresponding production segment fractions exactly.
  Preview-to-applied-event bounds also differed by at most `0.015625px` on the time axis.
- Midnight events split across two grid columns and remained one timeline bar. New York's repeated hour retained
  the requested offset. New York and Lord Howe gap targets were unavailable. Two-minute selection spans stayed
  semantic; only event geometry acquired the grid's 15-minute visual minimum.
- Controlled pointer drags could begin on a transition-crossing bar over missing 02:30, retain the clock grab
  offset and move to valid 03:30. A subsequent missing-time drop emitted nothing in either layout/adapter.
- All-day pointer selection respected date-first resource columns and inclusive ends. Moving the fair retained its
  two-day length and assigned the destination resource. Controlled selection persisted through the real D29 slice.
- Source replacement, navigation and lost surfaces cancelled drafts. Inactive views and disabled pointer transport
  had zero pointer listeners. Every ownership mode unmounted with zero listeners, surfaces, base/atom connections
  and UI observers; late completion returned `stale-token`. React StrictMode retained one live connection.
- Both 390px pages had no page-level horizontal overflow. The calendar retained its own scrollable geometry.
- Workspace build, both harness bundles, all three prototype type checks, `check:all` and all 275 existing tests
  passed. Browser verification used direct interactions/probes, with no prototype runtime test suite added.

Still unproved: production feature/capability registration, arbitrary controlled snapshot cloning, a third-party
operation registry and tree shaking. Conversion, grouped movement, touch, auto-scroll and complete
resource/availability policy are outside this extension. Movement previews currently build an isolated event model;
extracting a shared interval projector would be a separate production implementation decision.

## Independent resizing extension

Question: can start/end resizing use the same sessions, validators, projection and adapter bindings without registering
movement or selection? Yes, in this prototype. Register `{ interactionFeature, eventResizeFeature }`; constraints remain
optional. The runtime rejects movement and selection when their features are absent, and no selected-range slice is
registered. Both framework harnesses start in **Resize only** mode; the Operations selector also enables all three.

The feature contributes `resizing.enabled`, `onEventResize`, and `resize.begin(eventId, edge)` /
`resize.evaluate(eventId, edge, target)`. Callback and evaluation results retain the consumer's payload type on
`before` and `after`. The shared public controls still cannot start another operation. Compiler fixtures cover
missing runtime prerequisites, unregistered options/settings/APIs, invalid edges and absence of selection state.

A resize changes only the chosen edge. Timed bounds must remain strictly ordered; inclusive all-day ends allow a
single day. An omitted all-day end is materialized as the original start when resizing the start, preserving the
fixed edge. Payloads and resources retain identity; kind conversion and a different target resource are rejected.
The optional timed overlap rule ignores the source event and rechecks supplied input before completion.

Handles are shown only on a segment's actual start/end, including split events. Timed handles use snapped clock
positions without movement's grab offset; fold resolution preserves the chosen edge's offset. All-day handles snap
to date boundaries and convert the visual end boundary back to an inclusive date. The programmatic preview buttons
provide keyboard access. Very narrow timeline bars are exercised programmatically; their pointer affordances are
outside this proof. Application input changes only through **Apply edit**.

Verification:

- Fourteen direct runtime probes covered independent registration, fixed-edge/payload/resource preservation,
  invalid/crossed edges, kind/resource rejection, one emission, stale completion, source replacement, arriving
  overlaps, inactive/disabled views, inclusive/implicit all-day ends and DST offset resolution.
- Both timed edges completed through real pointer input in both layouts, both adapters and all three ownership
  modes: 12 combinations. Movement and selection were unavailable, and `selectedRange` was absent from base state.
  Every draft caused zero base builds; preview/applied geometry differed by at most `0.015625px`. Unmount released
  every listener, surface, subscription and UI observer.
- Controlled all-day end shrinking completed in both layouts/adapters, retaining inclusive dates and zero draft
  base builds. The standalone demo adds three guided resize walkthroughs alongside the original eleven.
- The source and built-declaration checks include resize-only core/React/Solid calendars. Production interaction
  exports remain unchanged. This extension adds no runtime test suite.
- Workspace build, both harness bundles, all six compiler configurations, `check:all` and the 276 existing tests
  passed. All 14 standalone walkthroughs completed without page errors. At 390px, both harnesses and the standalone
  demo had no page-level overflow. Existing development servers were reused after a duplicate start reported
  `Error: Port 5177 is already in use`.

The operation union and API facade still enumerate operation kinds; this proves a third built-in operation, not
arbitrary third-party registration. Production capability registration, constraints beyond supplied timed overlaps,
edge permission policies, conversion, touch and auto-scroll remain outside the prototype.
