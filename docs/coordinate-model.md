# Shared date and time coordinates

Status: implemented for built-in layouts under D41 in [the accepted design](design.md). Public views expose hidden
weekdays and timed clock windows. Navigation, event filtering, backgrounds, availability, labels, now indicators,
React/Solid parts and themes use the shared coordinate model.

D40 remains the rendering policy: source fragments retain exact coverage, event rectangles enclose visited clock
positions, and shading combines display coverage before its complement. Fragmented event painting, branch-specific
inverse shading and minimum sizing constrained to each valid source piece remain separate proposals below.

## Agreed requirements

1. Clock-hour rows align across dates. A time grid puts 09:00 at the same position on ordinary and DST dates.
2. Visible hours support overnight windows. In 22:00–06:00, the portion after midnight belongs to the starting date.
3. Repeated autumn hours share clock rows. Preserve both occurrences, distinguish their events through lanes, and
   retain offset/occurrence metadata.

The model applies the same clock-coordinate basis to the timeline: concatenate the visible windows of the
visible dates. This extends D40's fixed clock axis with compressed dates and visible-hour windows.

## Implementation boundaries

- `packages/core/src/layout/layout-coordinates.ts` owns visible dates, clock windows, branches, source projection,
  reverse lookup, date runs, slot geometry and display coverage. It replaces the former `layout-axis.ts` helper.
- Built-in layouts retain their date axes or timed plans as `coordinates`; timed plans are cached per stable view
  definition and reused across event, resource and clock updates.
- `calendar-navigation.ts` asks each layout feature for its input range. Core filtering uses that envelope before
  layout projection. Custom layout features can omit the capability and receive the old range behavior.
- `calendar-backgrounds.ts` reads the layout's coordinate plan. The parts emit explicit geometry, and themes use
  actual column counts and partial-slot sizes.

## Two spaces, one projection plan

| Space               | Meaning                                                                              | Operations                                                                             |
| ------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Source time         | Real instants, with the configured zone; all-day events retain their calendar dates. | Chronological order, actual duration, availability and future interaction constraints. |
| Display coordinates | Visible date indices and local clock offsets within each date's window.              | Position, size, visual collision, labels and eventual coordinate lookup.               |

Keep source and display intervals separately. Display length is not elapsed duration. Never reconstruct an event's
end, duration or identity from its box.

Preserve Temporal instant precision in source operations. Convert bounded relative distances to numeric display
fractions; do not convert absolute epoch nanoseconds to floating-point numbers.

Use half-open intervals internally. Preserve existing inclusive public all-day ends and `Calendar_Range.end`;
convert them at the projection boundary. Keep the core free of DOM sizes and pixels, as required by D1 and D9.

### View settings

```ts
type Calendar_TimeViewSettings = {
  hiddenDays?: Calendar_DayOfWeek[]; // ISO: Monday 1 through Sunday 7
  timeWindow?: {
    startMinutes: number;
    endMinutes: number;
  };
};

// 08:00–18:00
const daytime: Calendar_TimeViewSettings = {
  timeWindow: { startMinutes: 8 * 60, endMinutes: 18 * 60 },
};

// Monday 22:00 through Tuesday 06:00, owned by Monday
const overnight: Calendar_TimeViewSettings = {
  timeWindow: { startMinutes: 22 * 60, endMinutes: 30 * 60 },
};
```

Defaults: no hidden weekdays and `[0, 1440)` for timed views. Start/end values are integer local-clock minutes;
`0 <= startMinutes < 1440` and `startMinutes < endMinutes <= startMinutes + 1440`. Thus a window covers at most
24 nominal clock hours, including overnight windows. Negative starts and windows longer than 24 hours are outside
this contract, rather than implied by a midnight wrap.

Keep `slotMinutes` as the label/slot interval. It is a positive integer. It need not divide the visible window:
the final slot may be shorter, and its geometry must reflect that shorter length.

The shared setting types are exposed on view definitions. `hiddenDays` applies to date-based views; `timeWindow` applies to
time-grid/timeline views. Calendar-wide defaults can be designed separately if needed.

## Date axis

Build an ordered list of visible dates and an internal date-to-index lookup. Columns refer to this list, never to
the number of calendar days since a range's start.

- `period` keeps its current navigation meaning.
- `range` remains the inclusive anchor-date envelope, including month padding.
- `visibleDates` identifies the dates that actually render; hidden weekdays remain inside the range envelope.
- Form calendar week rows before removing hidden weekdays. A month with six calendar weeks still has six rows.
- Preserve a row's calendar-week key even if its first visible weekday changes.
- Compose resource/date column order after constructing the date axis. Resources do not change date arithmetic.
- Project all-day spans by matching visible date cells. An event wholly on hidden dates yields no geometry.
- A bar may cover adjacent visible cells separated by hidden dates, with omission metadata. Calendar row boundaries
  still split month/day-grid bars.
- Hiding every weekday is an invalid configuration. When hidden weekdays would leave a range without a date, such as
  a one-day range on a hidden weekday, they do not apply to that range and its dates render. The coordinate layer
  does not change controlled dates. (Earlier, such a range produced an empty axis; see D44.)

For example, Friday and Monday become consecutive visible indices when the weekend is hidden. A Friday–Monday
all-day event occupies those two cells. A Saturday-only event occupies neither cell.

## Time axis

Each visible date owns an anchor-date window. Let `s` and `e` be its start/end offsets, and let `m` be a local clock
offset from that anchor date, including a day offset after midnight:

```text
u = (m - s) / (e - s)
time-grid coordinate = u
timeline coordinate = (visibleDateIndex + u) / visibleDateCount
```

These formulas apply inside a valid monotonic source piece. They are not a formula for subtracting arbitrary event
endpoint clock times.

The slot axis has the same nominal extent on every date. A 23-hour or 25-hour source day does not rescale the axis.
An overnight label retains both its `PlainTime` and its day offset, so 02:00 after midnight is distinguishable from
02:00 on the anchor date.

### Gaps and repeated hours

Build an offset-transition map for each date/window. Each source piece has a constant UTC offset and an increasing
mapping into local clock coordinates. Split bands at every local boundary where the candidate set changes.

Conceptual data, rather than public exports. The implemented internal model uses `bigint` nanoseconds for relative
clock bounds, preserving exact instant round-trips; the minute bounds below describe the same structure:

```ts
type InstantRange = { start: Temporal.Instant; end: Temporal.Instant };

type ClockBranch = {
  source: InstantRange;
  offsetNanoseconds: number;
  occurrence: number; // chronological candidate ordinal within a repeated band
};

type ClockBand = {
  startMinute: number;
  endMinute: number;
  branches: readonly ClockBranch[];
};

type TimeAxis = {
  anchorDate: Temporal.PlainDate;
  startMinute: number;
  endMinute: number;
  bands: readonly ClockBand[];
};
```

- A normal band has one branch.
- A skipped clock band has no branches. Keep its space for clock alignment and identify it as a time-zone gap.
- A repeated band has multiple branches at the same display coordinates. Preserve their offsets and source ranges.
- Handle actual transition sizes, including half-hour changes, midnight transitions and skipped calendar dates.
  Do not assume that a transition changes one hour.
- Enumerate actual offset pieces, then intersect their local images with the requested window. Resolving one start
  and one end with Temporal's default disambiguation does not describe the window correctly around a fold.

For example, a visible 01:30–01:45 window on a fall-back date contains two separate 15-minute source intervals. A
single interval from the earlier start to the later end would incorrectly include time outside that clock window.

The installed `temporal-polyfill@1.0.6` provides `getTimeZoneTransition`. Its behavior, including a half-hour change
and a skipped calendar date, was checked in a small runtime probe. The transition map remains independent of
events, resources and the current clock tick.

## Shared projection operations

The coordinate layer owns pure operations over its plan:

| Operation                    | Result                                                               |
| ---------------------------- | -------------------------------------------------------------------- |
| Project a calendar-date span | Visible cells/runs, with removed-date metadata.                      |
| Project an instant interval  | Zero or more source-preserving display fragments.                    |
| Project an instant point     | A visible point with branch metadata, or outside the axis.           |
| Resolve a display point      | Outside, gap, one candidate instant, or multiple candidate instants. |

Project intervals piece by piece, clipping against both the visible date set and each window's valid source pieces.
Return multiple fragments across offset changes, hidden time or hidden dates. Each fragment retains its source
interval, anchor date, offset/occurrence, normalized `start`/`span` and the reasons for cuts at either edge.

Generate segment keys from source identity, anchor date and source-piece bounds. Existing continuation flags can
summarize cuts, while richer metadata distinguishes a view boundary, hidden date, hidden hours or offset transition.

This layer does not assign lanes or stack rows. Layouts pack projected paint intervals, so two events from different
occurrences of the same clock hour cannot cover one another accidentally. Actual overlap permissions must continue
to use source instants. Source fragments from one event retain that common event identity.

### Missing hours and repeated-hour examples

- A spring-forward event from 01:30 to 03:30 projects to `[01:30, 02:00)` and `[03:00, 03:30)`. The nonexistent hour
  stays a gap; the event still has its actual one-hour duration.
- A fall-back event from 01:45 at the earlier offset to 01:15 at the later offset lasts 30 real minutes. It projects
  to `[01:45, 02:00)` on the earlier branch and `[01:00, 01:15)` on the later branch. No negative-length box occurs.
- Two distinct events at the two 01:30 occurrences occupy the same clock band, retain distinct source instants and
  participate in visual lane assignment.

The lossless projector implements this fragmentation. D40 event rectangles enclose the resulting fragments for
each date, including any intervening gap. The new helper provides that enclosing geometry separately from source
coverage. Built-in layouts use this enclosing geometry; fragmented event painting remains a possible future policy.

### Visible hours, all-day data and input coverage

- Hide timed geometry outside a window by clipping, not by changing event dates.
- Apply hidden weekdays to anchor dates. With Monday visible and Tuesday hidden, Monday's 22:00–Tuesday 06:00
  window still includes Tuesday morning. Tuesday's own window is omitted.
- All-day events and all-day background ranges use anchor-date membership. They cover the matching date's visible
  band regardless of the timed window. A Tuesday all-day item does not become a Monday item because Monday's
  overnight window reaches into Tuesday.
- Timed background rules use their actual local dates. A Tuesday 00:00 business-hours rule can therefore contribute
  to the after-midnight portion of Monday's overnight window.
- Produce an `inputRange` calendar-date envelope in navigation metadata, in addition to `range` and `period`.
  It covers every actual date reachable by the visible timed windows, including the following date for overnight
  windows. The instance-free navigation helper can compute this envelope without a time zone.
- Use that envelope for coarse event filtering and for range-based event/background inputs. Layout projection
  performs exact clipping afterward. Consumers fetching events for overnight views need the input envelope.
- Hidden dates/hours may remain inside the coarse envelope. It is a safe input bound, not a promise of contiguous
  display coverage. Exact valid instant pieces stay in the coordinate plan.

### Shading, minimum size and now

Project timed events, timed backgrounds, availability and the now indicator through the same plan.

The following branch-specific shading is a future proposal, not an amendment implemented here. D40 currently
combines projected coverage before taking its display complement. The coordinate foundation retains the source
branches needed to support a different policy later.

Compute inverse shading in source space before projection, separately for valid source branches. In a repeated
clock band one occurrence can be available while the other is unavailable. Preserve branch coverage and expose a
mixed state when a single display band has differing coverage. Complementing an already-merged display union
would lose that distinction. A missing clock band remains an axis gap, separate from business availability.

Likewise, restricting minimum paint size to a valid source piece is proposed; this foundation does not change
D40's minimum-size behavior. Apply minimum event size after projection, in nominal display minutes, without modifying source instants. Clip the
paint extension to the visible window and the valid source piece's display extent; it cannot fill a skipped clock
band. Use paint intervals for lanes and short-event flags. D40 already changed D39's thresholds to displayed clock
minutes; the additional piece boundary restriction would amend D40.

The now indicator projects its real instant, including its occurrence on a repeated hour. Omit it outside visible
dates/hours rather than clamping it onto an edge.

Keep `isToday` anchored to the column's calendar date. A Monday overnight column can contain the now indicator on
Tuesday at 05:00 even though its anchor date is not today. Availability summaries likewise inspect valid visible
source pieces rather than the entire anchor calendar day.

## Module and adapter responsibilities

Keep the initial coordinate helpers internal to core. Share their data types where built-in layout models require
them; do not introduce a public general-purpose geometry API as part of this integration.

- Coordinate construction owns visible dates, clock windows, transition branches, projection and resolution.
- Layout builders own resource composition, event lanes, bar rows and layout-specific model fields.
- React and Solid parts expose the computed geometry and metadata. They do not repeat time-zone arithmetic.
- Themes position from explicit geometry. Replace seven-column constants and equal-slot assumptions with the
  supplied column count and slot bounds. The final partial slot has its actual fraction.
- Future pointer hit-testing converts DOM positions to a coordinate and uses the resolver. It must preserve gap
  and ambiguity results. Pointer handling, snapping and interaction state are separate work.

The pluggable layout boundary now includes an optional `inputRange(range, settings)` capability to layout features,
with `range` as the fallback. Built-in timed layouts use it to report the extra input date for overnight windows.
Both navigation paths call that capability; core does not switch on built-in layout kinds. Each built-in builder
constructs/reuses its coordinate plan and includes the render-relevant axis data on its model. Decorators read that
same plan. Third-party layouts can retain their existing behavior without adopting this coordinate model.

At a gap, resolution returns no candidate. At a repeated time, it returns the candidates in instant order; it does
not silently choose Temporal's default `compatible` result. Hidden times/dates resolve as outside. End bounds are
exclusive. Future editing can require an explicit candidate choice without changing event-input semantics.

## Alternatives considered

| Approach                                    | Trade-off                                                                                  | Conclusion                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| One elapsed-time fraction for each real day | Simple and preserves duration ratios, but moves 09:00 between dates.                       | Conflicts with the agreed clock alignment.          |
| Subtract local endpoint times               | Small change, but a valid fold-crossing event can have an end clock time before its start. | Insufficient for intervals and availability.        |
| Separate repeated-hour rows                 | Provides a monotonic display sequence, but introduces another band across the grid.        | The user chose shared rows and occurrence metadata. |
| Piecewise wall-clock projection             | Requires fragment/ambiguity metadata, but preserves real instants and aligned clock rows.  | Recommended.                                        |

## Verification contract

Native coordinate and calendar integration tests cover the cases below. Adapter and theme browser tests cover
column counts, overnight ownership and partial-slot alignment. The optional branch-specific shading and paint
restriction proposals are excluded.

Required invariants:

- Resolving a projected valid instant includes that original instant among its candidates.
- Reprojecting a resolution candidate returns the same coordinate and branch.
- The union of source fragments equals the input interval intersected with visible valid source coverage, before
  minimum paint sizing. Projection neither invents nor loses coverage within that intersection.
- Every returned source interval and display fragment has positive length.
- Matching clock offsets have matching normalized positions on every date with the same visible window.

| Case                                                      | Expected result                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 08:00–18:00 window, 09:00–10:00 event                     | `start = 0.1`, `span = 0.1`, including on a DST date.                                |
| New York, 2026-03-08 at 02:30                             | Gap; no selectable instant.                                                          |
| New York, 2026-11-01 at 01:30                             | Two candidate instants at one display coordinate, with offsets -04:00 and -05:00.    |
| Earlier 01:45 to later 01:15 on that fall-back date       | Two nonnegative display fragments; actual duration remains 30 minutes.               |
| Visible 01:30–01:45 on that fall-back date                | Two 15-minute source intervals; no intermediate clock values outside the window.     |
| Lord Howe, 2026-10-04                                     | A 30-minute clock gap; no assumed one-hour transition.                               |
| Apia, 2011-12-30                                          | Calendar date may retain a date cell; its timed band has no valid source instants.   |
| Monday 22:00–Tuesday 06:00; event Tuesday 00:30–01:30     | Monday anchor; `start = 150 / 480`, `span = 60 / 480`.                               |
| Same overnight view with Tuesday hidden                   | Monday's Tuesday-morning portion remains visible; Tuesday's anchor column is absent. |
| Now is Tuesday 05:00 in that overnight view               | The now indicator appears in Monday's column independently of `isToday`.             |
| Weekend hidden; Friday–Monday all-day event               | Only Friday/Monday cells, with hidden-date metadata and normal calendar-row breaks.  |
| Event wholly on hidden dates or outside visible hours     | No geometry, no lane occupancy and no contribution to visible overflow.              |
| 08:10–09:00 window with 30-minute slots                   | Slots of 30 and 20 minutes, with proportional geometry.                              |
| One repeated-hour branch available, the other unavailable | Exact branch coverage retained; D40 display coverage is combined.                    |
| Valid range containing no visible anchor dates            | Empty axis, no invalid fractions and no implicit navigation.                         |
| Minimum-size event clipped at a window/transition edge    | Original dates unchanged; painted geometry stays within the visible window.          |

## Integration and decision impact

The internal foundation, built-in layouts, navigation input coverage, public view settings, adapters and themes are
integrated. Month/day-grid rows preserve calendar weeks; list days use visible anchors; time-grid and timeline
geometry share the same windows and date ordinals. Timeline backgrounds remain outside this change.

D41 records the accepted integration and its amendments to prior full-day and contiguous-column assumptions.
Controlled navigation (D5), event input ownership (D2), headless geometry (D9), consumer-owned formatting (D20) and
D40's enclosing/display-union policies remain in force.

Stack caps, resource trees, multi-month layout, virtualization, recurrence and interaction engines remain separate
features. The coordinate model supplies their shared basis without implementing them here.

## Sources and verification

- The original audit used `a4911b5`; the foundation was implemented after rebasing onto `fd13cd8`, including D40.
- [Temporal: time zones and ambiguity](https://tc39.es/proposal-temporal/docs/timezone.html) explains distinct instants
  for repeated times and why the default compatible conversion shifts missing times.
- [Temporal: offset transitions](https://tc39.es/proposal-temporal/docs/zoneddatetime.html)
  documents transitions and nonuniform day lengths. Actual behavior was also probed with polyfill 1.0.6.
- [FullCalendar visible-hour start](https://fullcalendar.io/docs/slotMinTime),
  [exclusive end](https://fullcalendar.io/docs/slotMaxTime) and [hidden weekdays](https://fullcalendar.io/docs/hiddenDays)
  supply the parity reference. The option names and ISO weekday values follow this repository's conventions.
- The worktree now has dependencies installed from its unchanged lockfile. Native Chromium tests exercise the
  model with `temporal-polyfill@1.0.6`, including half-hour and midnight changes, a skipped date, narrow repeated-hour
  windows, overnight DST changes, hidden weekdays, partial slots and exact instant round-trips.
