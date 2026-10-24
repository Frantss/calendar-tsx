# Interaction foundation prototype

Throwaway experiment on `codex/interaction-foundation-prototype`, based on `fd13cd8`.
Production exports and adapters are unchanged. Context: [design proposal](../../../../docs/interaction-foundation.md).

## Run

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

The existing `Calendar_Api_FeatureMap` cannot carry event payload types into API return values. The
[contextual map sketch](feature-types.ts) preserves inferred payloads by threading `TData` through that map. This
remains a proposed D29 amendment; production declarations are unchanged.

## Verification

[types.verify.ts](types.verify.ts) compiles with installed TypeScript 7.0.2 against the actual view factories, feature
maps, options, API and state. It is compiler input only: do not execute its deliberately invalid expressions.
Its 22 checked `@ts-expect-error` cases verify absent feature APIs/options/settings/state, missing and inactive
prerequisites, event payload inference, selection discriminants and exclusive state ownership. Calendar-wide
prerequisites and reverse registration order compile. Cycles are runtime checks; widened feature records retain
D29's existing loss of precise static gating.

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

## Limits

Production construction, automatic state subscriptions, persistent selection wiring, React/Solid lifetimes and real
layout `locate/project` capabilities remain unproved. The demo uses one simplified UTC surface; a timeline and second
framework adapter still need to exercise those seams. The open third-party operation map and tree shaking are unverified.

Moves target a new start, preserving elapsed timed duration or inclusive all-day length, and can replace resources
with one resource. Pointer grab offset, timed/all-day conversion, grouped movement, resource/all-day-overlap policies
and transition-crossing preview geometry are outside this proof. The memory store stands in for a TanStack store.
