import { Temporal } from 'temporal-polyfill';

import { calendarNavigation_days, calendarNavigation_startOfWeek } from '#calendar-navigation';
import type { Calendar_DayOfWeek, Calendar_Range, Calendar_TimeViewSettings } from '#calendar.types';
import { layoutIntervals_merge } from '#layout/layout-intervals';

export type LayoutCoordinates_Settings = Calendar_TimeViewSettings;

/** Half-open nominal nanoseconds from anchor-date midnight, including offsets beyond 24 hours. */
type ClockRange = Readonly<{ start: bigint; end: bigint }>;
type InstantRange = Readonly<{ start: Temporal.Instant; end: Temporal.Instant }>;
type Position = Readonly<{ start: number; span: number }>;

export type LayoutCoordinates_DateAxis = {
  range: Calendar_Range;
  inputRange: Calendar_Range;
  clock: ClockRange;
  dates: readonly Temporal.PlainDate[];
  indexByDate: ReadonlyMap<string, number>;
  weeks: readonly { key: string; dateIndices: readonly number[] }[];
};

export type LayoutCoordinates_Branch = {
  key: string;
  source: InstantRange;
  offsetNanoseconds: number;
  occurrence: number;
};

export type LayoutCoordinates_Band = {
  clock: ClockRange;
  branches: readonly LayoutCoordinates_Branch[];
};

export type LayoutCoordinates_Plan = {
  dates: LayoutCoordinates_DateAxis;
  times: readonly {
    dateIndex: number;
    anchorDate: Temporal.PlainDate;
    bands: readonly LayoutCoordinates_Band[];
  }[];
  timeZone: string;
};

export type LayoutCoordinates_Fragment = {
  key: string;
  dateIndex: number;
  branch: LayoutCoordinates_Branch;
  source: InstantRange;
  clock: ClockRange;
  position: Position;
  cuts: { before: readonly CutReason[]; after: readonly CutReason[] };
};

type CutReason =
  | 'view-boundary'
  | 'anchor-boundary'
  | 'hidden-date'
  | 'hidden-hours'
  | 'offset-transition'
  | 'clock-band';
type DisplayPoint = { dateIndex: number; clockNanoseconds: bigint };
type Candidate = { instant: Temporal.Instant; branch: LayoutCoordinates_Branch };

export type LayoutCoordinates_Resolution =
  | { kind: 'outside' }
  | { kind: 'gap'; band: LayoutCoordinates_Band }
  | { kind: 'unique'; candidate: Candidate }
  | { kind: 'ambiguous'; candidates: readonly [Candidate, Candidate, ...Candidate[]] };

const NS_PER_MINUTE = 60_000_000_000n;
const NS_PER_DAY = 1440n * NS_PER_MINUTE;
const min = (a: bigint, b: bigint) => (a < b ? a : b);
const max = (a: bigint, b: bigint) => (a > b ? a : b);
const compare = (a: bigint, b: bigint) => (a < b ? -1 : a > b ? 1 : 0);
const at = (ns: bigint) => Temporal.Instant.fromEpochNanoseconds(ns);
const position = (clock: ClockRange, window: ClockRange): Position => ({
  start: Number(clock.start - window.start) / Number(window.end - window.start),
  span: Number(clock.end - clock.start) / Number(window.end - window.start),
});

export const layoutCoordinates_dates = (
  range: Calendar_Range,
  settings: LayoutCoordinates_Settings = {},
  firstDayOfWeek: Calendar_DayOfWeek = 7,
): LayoutCoordinates_DateAxis => {
  const { startMinutes = 0, endMinutes = 1440 } = settings.timeWindow ?? {};
  const hidden = new Set(settings.hiddenDays ?? []);

  if (
    !Number.isInteger(startMinutes) ||
    !Number.isInteger(endMinutes) ||
    startMinutes < 0 ||
    startMinutes >= 1440 ||
    endMinutes <= startMinutes ||
    endMinutes > startMinutes + 1440
  )
    throw new RangeError('[calendar] invalid coordinate time window');
  if (hidden.size === 7 || [...hidden].some(day => !Number.isInteger(day) || day < 1 || day > 7))
    throw new RangeError('[calendar] invalid hidden weekdays');
  if (!Number.isInteger(firstDayOfWeek) || firstDayOfWeek < 1 || firstDayOfWeek > 7)
    throw new RangeError('[calendar] invalid first weekday');
  if (Temporal.PlainDate.compare(range.start, range.end) > 0)
    throw new RangeError('[calendar] coordinate range ends before it starts');

  const dates: Temporal.PlainDate[] = [];
  const indexByDate = new Map<string, number>();
  const weeks: { key: string; dateIndices: number[] }[] = [];

  for (const day of calendarNavigation_days(range)) {
    const key = calendarNavigation_startOfWeek(day, firstDayOfWeek).toString();
    if (weeks[weeks.length - 1]?.key !== key) weeks.push({ key, dateIndices: [] });
    if (hidden.has(day.dayOfWeek as Calendar_DayOfWeek)) continue;
    const index = dates.length;
    weeks[weeks.length - 1].dateIndices.push(index);
    indexByDate.set(day.toString(), index);
    dates.push(day);
  }

  return {
    range,
    inputRange: dates.length
      ? {
          start: dates[0],
          end: dates[dates.length - 1].add({ days: Math.floor((endMinutes - 1) / 1440) }),
        }
      : range,
    clock: { start: BigInt(startMinutes) * NS_PER_MINUTE, end: BigInt(endMinutes) * NS_PER_MINUTE },
    dates,
    indexByDate,
    weeks,
  };
};

type OffsetPiece = { key: string; clock: ClockRange; source: ClockRange; offsetNanoseconds: number };

const buildBands = (anchor: Temporal.PlainDate, window: ClockRange, timeZone: string): LayoutCoordinates_Band[] => {
  const midnight = anchor.toZonedDateTime('UTC').epochNanoseconds;
  const localStart = midnight + window.start;
  const localEnd = midnight + window.end;
  // Every Temporal UTC offset is strictly less than 24 hours in magnitude.
  const searchStart = localStart - NS_PER_DAY;
  const searchEnd = localEnd + NS_PER_DAY;
  const pieces: OffsetPiece[] = [];
  let cursor = searchStart;

  while (cursor < searchEnd) {
    const zoned = at(cursor).toZonedDateTimeISO(timeZone);
    const next = zoned.getTimeZoneTransition('next');
    const end = min(next?.epochNanoseconds ?? searchEnd, searchEnd);
    const offset = BigInt(zoned.offsetNanoseconds);
    const startClock = max(cursor + offset, localStart);
    const endClock = min(end + offset, localEnd);

    if (endClock > startClock)
      pieces.push({
        key: `${cursor}/${end}`,
        clock: { start: startClock - midnight, end: endClock - midnight },
        source: { start: startClock - offset, end: endClock - offset },
        offsetNanoseconds: zoned.offsetNanoseconds,
      });
    cursor = end;
  }

  const boundaries = [
    ...new Set([window.start, window.end, ...pieces.flatMap(piece => [piece.clock.start, piece.clock.end])]),
  ].sort(compare);

  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    const candidates = pieces
      .filter(piece => piece.clock.start <= start && piece.clock.end >= end)
      .sort((a, b) => compare(a.source.start, b.source.start));

    return {
      clock: { start, end },
      branches: candidates.map((piece, occurrence) => ({
        key: piece.key,
        source: {
          start: at(piece.source.start + start - piece.clock.start),
          end: at(piece.source.start + end - piece.clock.start),
        },
        offsetNanoseconds: piece.offsetNanoseconds,
        occurrence,
      })),
    };
  });
};

export const layoutCoordinates_build = (
  dates: LayoutCoordinates_DateAxis,
  timeZone: string,
): LayoutCoordinates_Plan => {
  // Validate the zone even when every anchor date is hidden.
  Temporal.Instant.fromEpochNanoseconds(0n).toZonedDateTimeISO(timeZone);
  return {
    dates,
    timeZone,
    times: dates.dates.map((anchorDate, dateIndex) => ({
      dateIndex,
      anchorDate,
      bands: buildBands(anchorDate, dates.clock, timeZone),
    })),
  };
};

const plans = new WeakMap<LayoutCoordinates_Settings, { key: string; plan: LayoutCoordinates_Plan }>();

/** One plan per stable view definition; event, resource and clock updates reuse the axes. */
export const layoutCoordinates_plan = (
  range: Calendar_Range,
  settings: LayoutCoordinates_Settings,
  timeZone: string,
  firstDayOfWeek: Calendar_DayOfWeek = 7,
) => {
  const key = JSON.stringify([
    range.start.toString(),
    range.end.toString(),
    timeZone,
    firstDayOfWeek,
    settings.hiddenDays,
    settings.timeWindow,
  ]);
  const previous = plans.get(settings);
  if (previous?.key === key) return previous.plan;
  const plan = layoutCoordinates_build(layoutCoordinates_dates(range, settings, firstDayOfWeek), timeZone);
  plans.set(settings, { key, plan });
  return plan;
};

const cutReason = (
  plan: LayoutCoordinates_Plan,
  dateIndex: number,
  band: LayoutCoordinates_Band,
  branch: LayoutCoordinates_Branch,
  side: 'before' | 'after',
): CutReason => {
  const before = side === 'before';
  const edge = before ? band.clock.start : band.clock.end;

  if (edge === (before ? plan.dates.clock.start : plan.dates.clock.end)) {
    if (plan.dates.clock.start !== 0n || plan.dates.clock.end !== NS_PER_DAY) return 'hidden-hours';
    const adjacent = plan.dates.dates[dateIndex].add({ days: before ? -1 : 1 });
    if (
      Temporal.PlainDate.compare(adjacent, plan.dates.range.start) < 0 ||
      Temporal.PlainDate.compare(adjacent, plan.dates.range.end) > 0
    )
      return 'view-boundary';
    return plan.dates.indexByDate.has(adjacent.toString()) ? 'anchor-boundary' : 'hidden-date';
  }

  const probe = before ? branch.source.start.subtract({ nanoseconds: 1 }) : branch.source.end;
  return probe.toZonedDateTimeISO(plan.timeZone).offsetNanoseconds !== branch.offsetNanoseconds
    ? 'offset-transition'
    : 'clock-band';
};

export const layoutCoordinates_projectTime = (
  plan: LayoutCoordinates_Plan,
  source: InstantRange,
  sourceKey: string,
): LayoutCoordinates_Fragment[] => {
  const fragments: LayoutCoordinates_Fragment[] = [];
  if (Temporal.Instant.compare(source.start, source.end) > 0)
    throw new RangeError('[calendar] reversed instant interval');

  for (const axis of plan.times)
    for (const band of axis.bands)
      for (const branch of band.branches) {
        const start = max(source.start.epochNanoseconds, branch.source.start.epochNanoseconds);
        const end = min(source.end.epochNanoseconds, branch.source.end.epochNanoseconds);
        if (end <= start) continue;
        const clock = {
          start: band.clock.start + start - branch.source.start.epochNanoseconds,
          end: band.clock.start + end - branch.source.start.epochNanoseconds,
        };
        fragments.push({
          key: JSON.stringify([sourceKey, axis.anchorDate.toString(), branch.key, band.clock.start.toString()]),
          dateIndex: axis.dateIndex,
          branch,
          source: { start: at(start), end: at(end) },
          clock,
          position: position(clock, plan.dates.clock),
          cuts: {
            before:
              start > source.start.epochNanoseconds ? [cutReason(plan, axis.dateIndex, band, branch, 'before')] : [],
            after: end < source.end.epochNanoseconds ? [cutReason(plan, axis.dateIndex, band, branch, 'after')] : [],
          },
        });
      }

  return fragments.sort((a, b) => Temporal.Instant.compare(a.source.start, b.source.start));
};

export const layoutCoordinates_projectInstant = (
  plan: LayoutCoordinates_Plan,
  instant: Temporal.Instant,
): (DisplayPoint & Candidate & { position: number }) | undefined => {
  const ns = instant.epochNanoseconds;
  for (const axis of plan.times)
    for (const band of axis.bands)
      for (const branch of band.branches) {
        if (ns < branch.source.start.epochNanoseconds || ns >= branch.source.end.epochNanoseconds) continue;
        const clockNanoseconds = band.clock.start + ns - branch.source.start.epochNanoseconds;
        return {
          dateIndex: axis.dateIndex,
          clockNanoseconds,
          instant,
          branch,
          position:
            Number(clockNanoseconds - plan.dates.clock.start) / Number(plan.dates.clock.end - plan.dates.clock.start),
        };
      }
};

export const layoutCoordinates_resolve = (
  plan: LayoutCoordinates_Plan,
  point: DisplayPoint,
): LayoutCoordinates_Resolution => {
  const axis = Number.isInteger(point.dateIndex) ? plan.times[point.dateIndex] : undefined;
  const band = axis?.bands.find(
    item => point.clockNanoseconds >= item.clock.start && point.clockNanoseconds < item.clock.end,
  );
  if (!band) return { kind: 'outside' };
  const candidates = band.branches.map(branch => ({
    instant: at(branch.source.start.epochNanoseconds + point.clockNanoseconds - band.clock.start),
    branch,
  }));
  if (!candidates.length) return { kind: 'gap', band };
  if (candidates.length === 1) return { kind: 'unique', candidate: candidates[0] };
  return { kind: 'ambiguous', candidates: [candidates[0], candidates[1], ...candidates.slice(2)] };
};

/** Enclose one source interval's fragments per date for D40; exact coverage stays on the fragments. */
export const layoutCoordinates_enclose = (
  plan: LayoutCoordinates_Plan,
  fragments: readonly LayoutCoordinates_Fragment[],
) =>
  layoutCoordinates_bounds(fragments).map(({ dateIndex, clock }) => ({
    dateIndex,
    position: position(clock, plan.dates.clock),
  }));

export const layoutCoordinates_bounds = (fragments: readonly LayoutCoordinates_Fragment[]) => {
  const bounds = new Map<number, ClockRange>();
  for (const fragment of fragments) {
    const previous = bounds.get(fragment.dateIndex);
    bounds.set(
      fragment.dateIndex,
      previous
        ? {
            start: min(previous.start, fragment.clock.start),
            end: max(previous.end, fragment.clock.end),
          }
        : fragment.clock,
    );
  }
  return [...bounds].sort(([a], [b]) => a - b).map(([dateIndex, clock]) => ({ dateIndex, clock }));
};

export const layoutCoordinates_timelinePosition = (
  plan: LayoutCoordinates_Plan,
  fragment: LayoutCoordinates_Fragment,
): Position => {
  const count = plan.dates.dates.length;
  if (!count) throw new RangeError('[calendar] empty timeline axis');
  return { start: (fragment.dateIndex + fragment.position.start) / count, span: fragment.position.span / count };
};

export const layoutCoordinates_projectDates = (
  axis: LayoutCoordinates_DateAxis,
  source: { start: Temporal.PlainDate; endExclusive: Temporal.PlainDate },
) => {
  if (Temporal.PlainDate.compare(source.start, source.endExclusive) > 0)
    throw new RangeError('[calendar] reversed date interval');
  const contains = (day: Temporal.PlainDate) =>
    Temporal.PlainDate.compare(day, source.start) >= 0 && Temporal.PlainDate.compare(day, source.endExclusive) < 0;

  return axis.weeks.flatMap(week => {
    const matching = week.dateIndices.filter(index => contains(axis.dates[index]));
    if (!matching.length) return [];
    const weekStart = Temporal.PlainDate.from(week.key);
    const omittedDates = calendarNavigation_days({ start: weekStart, end: weekStart.add({ days: 6 }) }).filter(
      day =>
        contains(day) &&
        Temporal.PlainDate.compare(day, axis.range.start) >= 0 &&
        Temporal.PlainDate.compare(day, axis.range.end) <= 0 &&
        !axis.indexByDate.has(day.toString()),
    );
    return [
      {
        weekKey: week.key,
        firstDateIndex: matching[0],
        column: week.dateIndices.indexOf(matching[0]),
        count: matching.length,
        omittedDates,
        continuesBefore: Temporal.PlainDate.compare(source.start, axis.dates[matching[0]]) < 0,
        continuesAfter:
          Temporal.PlainDate.compare(source.endExclusive, axis.dates[matching[matching.length - 1]].add({ days: 1 })) >
          0,
      },
    ];
  });
};

export const layoutCoordinates_slots = (axis: LayoutCoordinates_DateAxis, slotMinutes: number) => {
  if (!Number.isSafeInteger(slotMinutes) || slotMinutes <= 0) throw new RangeError('[calendar] invalid slot minutes');
  const slots: { key: string; time: Temporal.PlainTime; dayOffset: number; position: Position }[] = [];
  const step = BigInt(slotMinutes) * NS_PER_MINUTE;
  for (let start = axis.clock.start; start < axis.clock.end; start += step)
    slots.push({
      key: start.toString(),
      time: at(start).toZonedDateTimeISO('UTC').toPlainTime(),
      dayOffset: Number(start / NS_PER_DAY),
      position: position({ start, end: min(start + step, axis.clock.end) }, axis.clock),
    });
  return slots;
};

/** Slot units from the start of the visible clock window to its first hour boundary. */
export const layoutCoordinates_hourOffset = (axis: LayoutCoordinates_DateAxis, slotMinutes: number) => {
  const hour = 60n * NS_PER_MINUTE;
  const remainder = ((axis.clock.start % hour) + hour) % hour;

  return Number((hour - remainder) % hour) / Number(BigInt(slotMinutes) * NS_PER_MINUTE);
};

export const layoutCoordinates_length = (plan: LayoutCoordinates_Plan) =>
  Number(plan.dates.clock.end - plan.dates.clock.start) / 1_000_000;

/** D40 shading combines exact source coverage on the shared clock axis before taking its complement. */
export const layoutCoordinates_coverage = (
  plan: LayoutCoordinates_Plan,
  sources: readonly InstantRange[],
  dateIndex?: number,
) => {
  return layoutCoordinates_coverFragments(
    plan,
    sources.flatMap((source, index) => layoutCoordinates_projectTime(plan, source, String(index))),
    dateIndex,
  );
};

export const layoutCoordinates_coverFragments = (
  plan: LayoutCoordinates_Plan,
  fragments: readonly LayoutCoordinates_Fragment[],
  dateIndex?: number,
) => {
  const length = layoutCoordinates_length(plan);
  const intervals = fragments
    .filter(fragment => dateIndex === undefined || fragment.dateIndex === dateIndex)
    .map(fragment => {
      const offset = dateIndex === undefined ? fragment.dateIndex * length : 0;
      return {
        startMs: offset + Number(fragment.clock.start - plan.dates.clock.start) / 1_000_000,
        endMs: offset + Number(fragment.clock.end - plan.dates.clock.start) / 1_000_000,
      };
    })
    .sort((a, b) => a.startMs - b.startMs);
  return layoutIntervals_merge(intervals);
};

export const layoutCoordinates_dateColumns = (columns: readonly Temporal.PlainDate[], span: Calendar_Range) => {
  const indices = columns.flatMap((day, index) =>
    Temporal.PlainDate.compare(day, span.start) >= 0 && Temporal.PlainDate.compare(day, span.end) <= 0 ? [index] : [],
  );
  if (!indices.length) return undefined;
  const colStart = indices[0];
  const colEnd = indices[indices.length - 1];
  return {
    colStart,
    colEnd,
    continuesBefore: Temporal.PlainDate.compare(span.start, columns[colStart]) < 0,
    continuesAfter: Temporal.PlainDate.compare(span.end, columns[colEnd]) > 0,
  };
};
