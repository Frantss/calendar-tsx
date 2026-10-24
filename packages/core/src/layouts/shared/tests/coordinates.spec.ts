import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';

import {
  layoutCoordinates_build,
  layoutCoordinates_dates,
  layoutCoordinates_enclose,
  layoutCoordinates_projectDates,
  layoutCoordinates_projectInstant,
  layoutCoordinates_projectTime,
  layoutCoordinates_resolve,
  layoutCoordinates_slots,
  layoutCoordinates_timelinePosition,
} from '#layouts/shared/coordinates';
import type { LayoutCoordinates_Settings } from '#layouts/shared/coordinates';

const minute = 60_000_000_000n;
const date = (value: string) => Temporal.PlainDate.from(value);
const instant = (value: string) => Temporal.Instant.from(value);
const source = (start: string, end: string) => ({ start: instant(start), end: instant(end) });
const plan = (start: string, end = start, settings: LayoutCoordinates_Settings = {}, timeZone = 'America/New_York') =>
  layoutCoordinates_build(layoutCoordinates_dates({ start: date(start), end: date(end) }, settings, 1), timeZone);

it('aligns clock positions on normal, spring and autumn dates', () => {
  for (const day of ['2026-03-07', '2026-03-08', '2026-11-01']) {
    const coordinates = plan(day, day, { timeWindow: { startMinutes: 480, endMinutes: 1080 } });
    const start = Temporal.ZonedDateTime.from(`${day}T09:00[America/New_York]`);
    const fragments = layoutCoordinates_projectTime(coordinates, { start: start.toInstant(), end: start.add({ hours: 1 }).toInstant() }, 'event');

    expect(fragments).toHaveLength(1);
    expect(fragments[0].position).toEqual({ start: 0.1, span: 0.1 });
  }
});

it('preserves the spring gap and exact source coverage, with a D40 enclosing rectangle available separately', () => {
  const coordinates = plan('2026-03-08');
  const fragments = layoutCoordinates_projectTime(coordinates, source('2026-03-08T01:30-05:00', '2026-03-08T03:30-04:00'), 'spring');

  expect(fragments.map(part => part.clock)).toEqual([
    { start: 90n * minute, end: 120n * minute },
    { start: 180n * minute, end: 210n * minute },
  ]);
  expect(fragments.reduce((total, part) => total + part.source.end.epochNanoseconds - part.source.start.epochNanoseconds, 0n)).toBe(60n * minute);
  expect(layoutCoordinates_resolve(coordinates, { dateIndex: 0, clockNanoseconds: 150n * minute }).kind).toBe('gap');
  expect(layoutCoordinates_enclose(coordinates, fragments)).toEqual([{ dateIndex: 0, position: { start: 90 / 1440, span: 120 / 1440 } }]);
});

it('retains both occurrences in a narrow fall-back window without including the time between them', () => {
  const coordinates = plan('2026-11-01', '2026-11-01', { timeWindow: { startMinutes: 90, endMinutes: 105 } });
  const fragments = layoutCoordinates_projectTime(coordinates, source('2026-11-01T00:00-04:00', '2026-11-02T00:00-05:00'), 'fold');
  const resolved = layoutCoordinates_resolve(coordinates, { dateIndex: 0, clockNanoseconds: 95n * minute });

  expect(fragments.map(part => [part.source.start.toString(), part.source.end.toString(), part.branch.occurrence])).toEqual([
    ['2026-11-01T05:30:00Z', '2026-11-01T05:45:00Z', 0],
    ['2026-11-01T06:30:00Z', '2026-11-01T06:45:00Z', 1],
  ]);
  expect(fragments.map(part => part.position)).toEqual([
    { start: 0, span: 1 },
    { start: 0, span: 1 },
  ]);
  expect(resolved.kind).toBe('ambiguous');
  if (resolved.kind !== 'ambiguous') throw new Error('expected both occurrences');
  expect(resolved.candidates.map(candidate => candidate.instant.toString())).toEqual(['2026-11-01T05:35:00Z', '2026-11-01T06:35:00Z']);
  expect(resolved.candidates.map(candidate => candidate.branch.offsetNanoseconds)).toEqual([-4 * 3600e9, -5 * 3600e9]);
});

it('projects a rollback with reversed clock endpoints into positive source-preserving fragments', () => {
  const coordinates = plan('2026-11-01');
  const fragments = layoutCoordinates_projectTime(coordinates, source('2026-11-01T01:45-04:00', '2026-11-01T01:15-05:00'), 'rollback');

  expect(fragments.map(part => part.clock)).toEqual([
    { start: 105n * minute, end: 120n * minute },
    { start: 60n * minute, end: 75n * minute },
  ]);
  expect(fragments.every(part => part.position.span > 0)).toBe(true);
  expect(layoutCoordinates_enclose(coordinates, fragments)[0].position).toEqual({ start: 60 / 1440, span: 60 / 1440 });
});

it('uses the old offset at an exclusive transition end', () => {
  const coordinates = plan('2026-11-01');
  const fragments = layoutCoordinates_projectTime(coordinates, source('2026-11-01T01:30-04:00', '2026-11-01T06:00Z'), 'exclusive');

  expect(fragments).toHaveLength(1);
  expect(fragments[0].clock).toEqual({ start: 90n * minute, end: 120n * minute });
});

it('supports half-hour gaps and folds in Lord Howe', () => {
  const spring = plan('2026-10-04', '2026-10-04', {}, 'Australia/Lord_Howe');
  const autumn = plan('2026-04-05', '2026-04-05', {}, 'Australia/Lord_Howe');

  expect(layoutCoordinates_resolve(spring, { dateIndex: 0, clockNanoseconds: 135n * minute }).kind).toBe('gap');
  const repeated = layoutCoordinates_resolve(autumn, { dateIndex: 0, clockNanoseconds: 105n * minute });
  expect(repeated.kind).toBe('ambiguous');
  if (repeated.kind !== 'ambiguous') throw new Error('expected repeated half hour');
  expect(repeated.candidates[1].instant.epochNanoseconds - repeated.candidates[0].instant.epochNanoseconds).toBe(30n * minute);
});

it('retains a skipped calendar date as an empty timed axis', () => {
  const coordinates = plan('2011-12-30', '2011-12-30', {}, 'Pacific/Apia');

  expect(coordinates.dates.dates.map(String)).toEqual(['2011-12-30']);
  expect(coordinates.times[0].bands).toHaveLength(1);
  expect(coordinates.times[0].bands[0].branches).toEqual([]);
  expect(layoutCoordinates_resolve(coordinates, { dateIndex: 0, clockNanoseconds: 720n * minute }).kind).toBe('gap');
});

it('handles a midnight gap without shifting the anchor date', () => {
  const coordinates = plan('2026-09-06', '2026-09-06', {}, 'America/Santiago');

  expect(layoutCoordinates_resolve(coordinates, { dateIndex: 0, clockNanoseconds: 30n * minute }).kind).toBe('gap');
  expect(layoutCoordinates_resolve(coordinates, { dateIndex: 0, clockNanoseconds: 90n * minute }).kind).toBe('unique');
});

it('keeps Tuesday morning on Monday even when Tuesday is hidden, and extends input coverage', () => {
  const coordinates = plan('2026-03-09', '2026-03-10', { hiddenDays: [2], timeWindow: { startMinutes: 1320, endMinutes: 1800 } });
  const fragments = layoutCoordinates_projectTime(coordinates, source('2026-03-10T00:30-04:00', '2026-03-10T01:30-04:00'), 'night');

  expect(coordinates.dates.dates.map(String)).toEqual(['2026-03-09']);
  expect(coordinates.dates.inputRange.end.toString()).toBe('2026-03-10');
  expect(fragments).toHaveLength(1);
  expect(fragments[0].dateIndex).toBe(0);
  expect(fragments[0].position).toEqual({ start: 150 / 480, span: 60 / 480 });
  expect(layoutCoordinates_projectInstant(coordinates, instant('2026-03-10T05:00-04:00'))?.dateIndex).toBe(0);
  expect(layoutCoordinates_projectInstant(coordinates, instant('2026-03-10T06:00-04:00'))).toBeUndefined();
  expect(layoutCoordinates_projectDates(coordinates.dates, { start: date('2026-03-10'), endExclusive: date('2026-03-11') })).toEqual([]);
});

it('handles DST inside an overnight window', () => {
  const coordinates = plan('2026-03-07', '2026-03-07', { timeWindow: { startMinutes: 1320, endMinutes: 1800 } });
  const fragments = layoutCoordinates_projectTime(coordinates, source('2026-03-08T01:30-05:00', '2026-03-08T03:30-04:00'), 'overnight-spring');

  expect(fragments.map(part => part.clock)).toEqual([
    { start: 1530n * minute, end: 1560n * minute },
    { start: 1620n * minute, end: 1650n * minute },
  ]);
  expect(layoutCoordinates_resolve(coordinates, { dateIndex: 0, clockNanoseconds: 1590n * minute }).kind).toBe('gap');
});

it('compresses hidden weekdays and retains calendar week boundaries', () => {
  const coordinates = plan('2026-03-02', '2026-03-15', { hiddenDays: [6, 7] });
  const runs = layoutCoordinates_projectDates(coordinates.dates, { start: date('2026-03-06'), endExclusive: date('2026-03-10') });

  expect(coordinates.dates.dates).toHaveLength(10);
  expect(coordinates.dates.indexByDate.get('2026-03-09')).toBe(5);
  expect(coordinates.dates.weeks.map(week => week.key)).toEqual(['2026-03-02', '2026-03-09']);
  expect(runs.map(run => [run.weekKey, run.firstDateIndex, run.column, run.count])).toEqual([
    ['2026-03-02', 4, 4, 1],
    ['2026-03-09', 5, 0, 1],
  ]);
  expect(runs[0].omittedDates.map(String)).toEqual(['2026-03-07', '2026-03-08']);
  expect(layoutCoordinates_projectDates(coordinates.dates, { start: date('2026-03-07'), endExclusive: date('2026-03-09') })).toEqual([]);
});

it('allows a bar across compressed hidden dates within one calendar week', () => {
  const axis = layoutCoordinates_dates({ start: date('2026-03-06'), end: date('2026-03-12') }, { hiddenDays: [6, 7] }, 5);
  const runs = layoutCoordinates_projectDates(axis, { start: date('2026-03-06'), endExclusive: date('2026-03-10') });

  expect(runs).toHaveLength(1);
  expect(runs[0].count).toBe(2);
  expect(runs[0].omittedDates.map(String)).toEqual(['2026-03-07', '2026-03-08']);
});

it('uses visible date ordinals for timeline positions', () => {
  const coordinates = plan('2026-03-06', '2026-03-09', { hiddenDays: [6, 7] });
  const [fragment] = layoutCoordinates_projectTime(coordinates, source('2026-03-09T12:00-04:00', '2026-03-09T13:00-04:00'), 'monday');

  expect(fragment.dateIndex).toBe(1);
  expect(layoutCoordinates_timelinePosition(coordinates, fragment)).toEqual({ start: 0.75, span: 1 / 48 });
});

it('keeps the dates of a range that hidden weekdays would leave empty', () => {
  const coordinates = plan('2026-03-08', '2026-03-08', { hiddenDays: [7] });

  expect(coordinates.dates.dates.map(String)).toEqual(['2026-03-08']);
  expect(layoutCoordinates_projectTime(coordinates, source('2026-03-08T09:00-04:00', '2026-03-08T10:00-04:00'), 'shown')).toHaveLength(1);
});

it('returns no geometry for hidden dates and hidden hours', () => {
  const coordinates = plan('2026-03-08', '2026-03-09', { hiddenDays: [7] });

  expect(coordinates.dates.dates.map(String)).toEqual(['2026-03-09']);
  expect(layoutCoordinates_projectTime(coordinates, source('2026-03-08T09:00-04:00', '2026-03-08T10:00-04:00'), 'hidden')).toEqual([]);
  expect(layoutCoordinates_projectInstant(coordinates, instant('2026-03-08T09:00-04:00'))).toBeUndefined();
  const daytime = plan('2026-03-09', '2026-03-09', { timeWindow: { startMinutes: 480, endMinutes: 1080 } });
  expect(layoutCoordinates_projectTime(daytime, source('2026-03-09T07:00-04:00', '2026-03-09T08:00-04:00'), 'early')).toEqual([]);
  expect(layoutCoordinates_resolve(daytime, { dateIndex: 0, clockNanoseconds: 1080n * minute }).kind).toBe('outside');
});

it('gives the final partial slot its actual size and overnight labels their day offsets', () => {
  const coordinates = plan('2026-03-09', '2026-03-09', { timeWindow: { startMinutes: 490, endMinutes: 540 } });
  const slots = layoutCoordinates_slots(coordinates.dates, 30);

  expect(slots.map(slot => [slot.time.toString(), slot.dayOffset, slot.position])).toEqual([
    ['08:10:00', 0, { start: 0, span: 0.6 }],
    ['08:40:00', 0, { start: 0.6, span: 0.4 }],
  ]);
  const overnight = plan('2026-03-09', '2026-03-09', { timeWindow: { startMinutes: 1320, endMinutes: 1800 } });
  expect(layoutCoordinates_slots(overnight.dates, 60).map(slot => [slot.time.hour, slot.dayOffset])).toEqual([
    [22, 0],
    [23, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 1],
    [5, 1],
  ]);
});

it('round-trips nanosecond-precision instants through unique and repeated positions', () => {
  const coordinates = plan('2026-11-01');
  for (const time of ['00:30:00.123456789-04:00', '01:30:00.123456789-04:00', '01:30:00.123456789-05:00', '02:00:00.123456789-05:00']) {
    const original = instant(`2026-11-01T${time}`);
    const projected = layoutCoordinates_projectInstant(coordinates, original);
    if (!projected) throw new Error('expected visible instant');
    const resolved = layoutCoordinates_resolve(coordinates, projected);
    const candidates = resolved.kind === 'unique' ? [resolved.candidate] : resolved.kind === 'ambiguous' ? resolved.candidates : [];

    expect(candidates.some(candidate => candidate.instant.equals(original))).toBe(true);
    expect(candidates.map(candidate => layoutCoordinates_projectInstant(coordinates, candidate.instant)?.clockNanoseconds)).toEqual(
      candidates.map(() => projected.clockNanoseconds),
    );
  }
});

it('keeps fragment keys stable when an event is clipped differently within the same bands', () => {
  const coordinates = plan('2026-11-01');
  const first = layoutCoordinates_projectTime(coordinates, source('2026-11-01T01:15-04:00', '2026-11-01T01:45-04:00'), 'event');
  const second = layoutCoordinates_projectTime(coordinates, source('2026-11-01T01:20-04:00', '2026-11-01T01:40-04:00'), 'event');

  expect(first[0].key).toBe(second[0].key);
});

it('rejects invalid windows, weekdays, ranges and slot intervals', () => {
  for (const timeWindow of [
    { startMinutes: -1, endMinutes: 100 },
    { startMinutes: 1440, endMinutes: 1800 },
    { startMinutes: 60, endMinutes: 60 },
    { startMinutes: 0, endMinutes: 1441 },
    { startMinutes: 0.5, endMinutes: 60 },
    { startMinutes: 0, endMinutes: Number.NaN },
  ])
    expect(() => plan('2026-03-09', '2026-03-09', { timeWindow })).toThrow(RangeError);
  expect(() => plan('2026-03-09', '2026-03-09', { hiddenDays: [1, 2, 3, 4, 5, 6, 7] })).toThrow(RangeError);
  expect(() => plan('2026-03-10', '2026-03-09')).toThrow(RangeError);
  const coordinates = plan('2026-03-09');
  for (const step of [0, -1, 0.5, Number.NaN]) expect(() => layoutCoordinates_slots(coordinates.dates, step)).toThrow(RangeError);
});

for (const [day, timeZone, elapsedMinutes] of [
  ['2026-03-08', 'America/New_York', 1380],
  ['2026-11-01', 'America/New_York', 1500],
  ['2026-10-04', 'Australia/Lord_Howe', 1410],
  ['2026-04-05', 'Australia/Lord_Howe', 1470],
  ['2026-09-06', 'America/Santiago', 1380],
  ['2011-12-30', 'Pacific/Apia', 0],
] as const) {
  it(`conserves source coverage for ${day} in ${timeZone}`, () => {
    const coordinates = plan(day, day, {}, timeZone);
    const start = date(day).subtract({ days: 2 }).toZonedDateTime('UTC').toInstant();
    const end = start.add({ hours: 120 });
    const fragments = layoutCoordinates_projectTime(coordinates, { start, end }, 'coverage');

    expect(fragments.reduce((total, part) => total + part.source.end.epochNanoseconds - part.source.start.epochNanoseconds, 0n)).toBe(
      BigInt(elapsedMinutes) * minute,
    );
    expect(new Set(fragments.map(part => part.key)).size).toBe(fragments.length);
    for (let index = 1; index < fragments.length; index++) {
      expect(Temporal.Instant.compare(fragments[index - 1].source.end, fragments[index].source.start)).toBeLessThanOrEqual(0);
    }

    for (let point = start; Temporal.Instant.compare(point, end) < 0; point = point.add({ minutes: 17, nanoseconds: 1 })) {
      const expected = point.toZonedDateTimeISO(timeZone).toPlainDate().equals(date(day));
      const covered = fragments.filter(
        part => Temporal.Instant.compare(point, part.source.start) >= 0 && Temporal.Instant.compare(point, part.source.end) < 0,
      );
      expect(covered.length).toBe(expected ? 1 : 0);
      expect(Boolean(layoutCoordinates_projectInstant(coordinates, point))).toBe(expected);
    }
  });
}

it('keeps a wholly nonexistent visible window empty', () => {
  const coordinates = plan('2026-03-08', '2026-03-08', { timeWindow: { startMinutes: 120, endMinutes: 180 } });
  expect(layoutCoordinates_projectTime(coordinates, source('2026-03-08T00:00-05:00', '2026-03-09T00:00-04:00'), 'gap')).toEqual([]);
  expect(layoutCoordinates_enclose(coordinates, [])).toEqual([]);
  expect(layoutCoordinates_resolve(coordinates, { dateIndex: 0, clockNanoseconds: 120n * minute }).kind).toBe('gap');
  expect(layoutCoordinates_resolve(coordinates, { dateIndex: 0, clockNanoseconds: 180n * minute }).kind).toBe('outside');
});

it('retains both repeated occurrences in an overnight window', () => {
  const coordinates = plan('2026-10-31', '2026-10-31', { timeWindow: { startMinutes: 1320, endMinutes: 1800 } });
  const fragments = layoutCoordinates_projectTime(coordinates, source('2026-10-31T22:00-04:00', '2026-11-01T06:00-05:00'), 'night');

  expect(fragments.reduce((total, part) => total + part.source.end.epochNanoseconds - part.source.start.epochNanoseconds, 0n)).toBe(540n * minute);
  expect(layoutCoordinates_resolve(coordinates, { dateIndex: 0, clockNanoseconds: 1530n * minute }).kind).toBe('ambiguous');
  expect(layoutCoordinates_enclose(coordinates, fragments)).toEqual([{ dateIndex: 0, position: { start: 0, span: 1 } }]);
});

it('reports why exact fragments stop at transitions, hidden hours and hidden dates', () => {
  const spring = plan('2026-03-08');
  const parts = layoutCoordinates_projectTime(spring, source('2026-03-08T01:30-05:00', '2026-03-08T03:30-04:00'), 'spring');
  expect(parts[0].cuts).toEqual({ before: [], after: ['offset-transition'] });
  expect(parts[1].cuts).toEqual({ before: ['offset-transition'], after: [] });

  const daytime = plan('2026-03-09', '2026-03-09', { timeWindow: { startMinutes: 480, endMinutes: 1080 } });
  const [clipped] = layoutCoordinates_projectTime(daytime, source('2026-03-09T07:00-04:00', '2026-03-09T19:00-04:00'), 'daytime');
  expect(clipped.cuts).toEqual({ before: ['hidden-hours'], after: ['hidden-hours'] });

  const weekdays = plan('2026-03-06', '2026-03-09', { hiddenDays: [6, 7] });
  const weekend = layoutCoordinates_projectTime(weekdays, source('2026-03-06T12:00-05:00', '2026-03-09T12:00-04:00'), 'weekend');
  expect(weekend[0].cuts.after).toEqual(['hidden-date']);
  expect(weekend[1].cuts.before).toEqual(['hidden-date']);
});

it('excludes an exact midnight end from overnight input coverage and clips all-day ends exclusively', () => {
  const coordinates = plan('2026-03-09', '2026-03-09', { timeWindow: { startMinutes: 1320, endMinutes: 1440 } });
  expect(coordinates.dates.inputRange.end.toString()).toBe('2026-03-09');
  expect(layoutCoordinates_projectDates(coordinates.dates, { start: date('2026-03-08'), endExclusive: date('2026-03-09') })).toEqual([]);
  expect(layoutCoordinates_projectDates(coordinates.dates, { start: date('2026-03-09'), endExclusive: date('2026-03-10') })[0].count).toBe(1);
});

it('keeps six month rows when hiding the weekday that starts each row', () => {
  const axis = layoutCoordinates_dates({ start: date('2026-03-01'), end: date('2026-04-11') }, { hiddenDays: [7] }, 7);
  expect(axis.weeks).toHaveLength(6);
  expect(axis.weeks[0].key).toBe('2026-03-01');
  expect(axis.dates[0].toString()).toBe('2026-03-02');
  expect(axis.weeks.every(week => week.dateIndices.length === 6)).toBe(true);
});

it('validates zones even for an empty axis and handles fixed-offset zones', () => {
  const axis = layoutCoordinates_dates({ start: date('2026-03-08'), end: date('2026-03-08') }, { hiddenDays: [7] });
  expect(() => layoutCoordinates_build(axis, 'Invalid/Zone')).toThrow(RangeError);
  const coordinates = plan('2026-03-09', '2026-03-09', {}, '+05:30');
  const projected = layoutCoordinates_projectInstant(coordinates, instant('2026-03-09T09:00+05:30'));
  expect(projected?.position).toBe(9 / 24);
});
