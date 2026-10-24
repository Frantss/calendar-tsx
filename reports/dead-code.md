# Dead code

## Unused timeline geometry helper

`calendarParts_timelineGeometry` in `packages/react/src/views/shared/parts.ts:26` and
`packages/solid/src/views/shared/parts.ts:26` has no callers. It emits `--cal-track-slots`, `--cal-slot-tracks` and
`--cal-slot-lines`, which the docs once listed as `timeline-root` variables even though no part sets them. Found
during the 2026-10-24 documentation rewrite.
