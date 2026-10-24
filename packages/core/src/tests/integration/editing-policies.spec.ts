import { interactionTestViews } from '#tests/support/interaction.setup';
import { Temporal } from 'temporal-polyfill';
import { expect, it, vi } from 'vitest';
import { createCalendar } from '#calendar/calendar';
import { timeGridView, dayGridView } from '#views/views';
import { interactionFeature } from '#features/interaction/interaction-feature';
import { eventMoveFeature } from '#features/event-move/event-move-feature';
import { eventResizeFeature } from '#features/event-resize/event-resize-feature';
import { dateSelectionFeature } from '#features/date-selection/date-selection-feature';
import { constraintsFeature } from '#features/constraints/constraints-feature';
import { pointerFeature } from '#features/pointer/pointer-feature';
import { touchFeature } from '#features/touch/touch-feature';
import { autoScrollFeature } from '#features/auto-scroll/auto-scroll-feature';
import { externalDropFeature } from '#features/external-drop/external-drop-feature';
import { crossCalendarFeature } from '#features/cross-calendar/cross-calendar-feature';
import type { Calendar_DateTarget } from '#features/interaction/date-target.types';

const date = Temporal.PlainDate.from('2026-10-23');
const at = (hour: number) => date.toZonedDateTime({ timeZone: 'UTC', plainTime: `${String(hour).padStart(2, '0')}:00` });
const event = { id: 'a', kind: 'timed' as const, start: at(9), end: at(10), data: { title: 'A' }, resourceIds: ['a', 'b'] };
const target = (hour: number, resourceId = 'a'): Calendar_DateTarget => ({ kind: 'timed', at: at(hour), resourceId });
const features = {
  interactionFeature: interactionFeature(),
  eventMoveFeature: eventMoveFeature(),
  eventResizeFeature: eventResizeFeature(),
  dateSelectionFeature: dateSelectionFeature(),
  constraintsFeature: constraintsFeature(),
  externalDropFeature: externalDropFeature(),
  crossCalendarFeature: crossCalendarFeature(),
};
const views = interactionTestViews({
  grid: timeGridView({ days: 1, features }),
  month: dayGridView({ period: 'month', maxEventsPerDay: 5, groupBy: 'resource', features }),
});
const base = {
  ...views,
  view: 'grid' as const,
  date,
  timeZone: 'UTC',
  events: [event],
  constraints: { preventOverlap: false },
  onNavigate: () => {},
};

it('converts only when opted in, with reset defaults and precise same-kind durations', () => {
  const calendar = createCalendar(base);
  const allDay = { kind: 'allDay' as const, at: date.add({ days: 1 }) };
  expect(calendar.api.move.evaluate('a', allDay)).toMatchObject({ status: 'unavailable', reason: 'conversion-unsupported' });
  calendar['~update']({ ...calendar.options, movement: { relocationPolicy: { allowConversion: true } } });
  const converted = calendar.api.move.evaluate('a', allDay);
  if (converted.status !== 'valid' || converted.proposal.after.kind !== 'allDay') throw new Error('conversion');
  expect(converted.proposal.after.start.equals(allDay.at)).toBe(true);
  expect(converted.proposal.after.end!.equals(allDay.at)).toBe(true);
  calendar['~update']({ ...calendar.options, events: [converted.proposal.after] });
  const timed = calendar.api.move.evaluate('a', target(13));
  if (timed.status !== 'valid' || timed.proposal.after.kind !== 'timed') throw new Error('conversion');
  expect(timed.proposal.after.end.equals(at(14))).toBe(true);
  const precise = { ...event, end: event.end.add({ nanoseconds: 7 }) };
  const moved = createCalendar({ ...base, events: [precise] }).api.move.evaluate('a', target(11));
  if (moved.status !== 'valid' || moved.proposal.after.kind !== 'timed') throw new Error('move');
  expect(moved.proposal.after.end.epochNanoseconds - moved.proposal.after.start.epochNanoseconds).toBe(3_600_000_000_007n);
});

it('supports resource replacement modes and independent permission checks', () => {
  const calendar = createCalendar(base);
  const full = calendar.api.move.evaluate('a', target(11, 'c'));
  expect(full.status === 'valid' && full.proposal.after.resourceIds).toEqual(['c']);
  calendar['~update']({ ...calendar.options, movement: { relocationPolicy: { resourceMode: 'replace-source' } } });
  expect(calendar.api.move.evaluate('a', target(11, 'c'))).toMatchObject({ reason: 'source-resource-required' });
  const replaced = calendar.api.move.evaluate('a', target(11, 'c'), 'a');
  expect(replaced.status === 'valid' && replaced.proposal.after.resourceIds).toEqual(['c', 'b']);
  calendar['~update']({ ...calendar.options, movement: { relocationPolicy: { allowResourceChange: false } }, resizing: { fromStart: false } });
  expect(calendar.api.move.evaluate('a', target(11, 'c'))).toMatchObject({ reason: 'resource-change-disabled' });
  const retained = calendar.api.move.evaluate('a', target(11, 'a'));
  expect(retained.status === 'valid' && retained.proposal.after.resourceIds).toEqual(['a', 'b']);
  expect(calendar.api.resize.evaluate('a', 'start', target(8))).toMatchObject({ reason: 'event-not-editable' });
  expect(calendar.api.resize.evaluate('a', 'end', target(11)).status).toBe('valid');
});

it('enforces merged allowed windows, business hours, resources and all-day overlap at evaluation and commit', () => {
  const calendar = createCalendar({
    ...base,
    resources: [{ id: 'a', title: 'A', data: null, availability: [{ start: at(8), end: at(17) }] }],
    constraints: {
      preventOverlap: false,
      resourceAvailability: true,
      resourceIds: ['a'],
      allowedRanges: [
        { start: at(10), end: at(12) },
        { start: at(12), end: at(15) },
      ],
      businessHours: [{ daysOfWeek: [5], startTime: Temporal.PlainTime.from('11:00'), endTime: Temporal.PlainTime.from('16:00') }],
    },
  });
  expect(calendar.api.move.evaluate('a', target(10))).toMatchObject({ reason: 'outside-business-hours' });
  expect(calendar.api.move.evaluate('a', target(14)).status).toBe('valid');
  expect(calendar.api.move.evaluate('a', target(15))).toMatchObject({ reason: 'outside-allowed-range' });
  expect(calendar.api.move.evaluate('a', target(11, 'b'))).toMatchObject({ reason: 'resource-not-allowed' });
  calendar['~update']({ ...calendar.options, constraints: { resourceAvailability: true, preventOverlap: false } });
  expect(calendar.api.move.evaluate('a', target(17))).toMatchObject({ reason: 'resource-unavailable' });
  calendar['~update']({
    ...calendar.options,
    constraints: { preventOverlap: true },
    events: [event, { id: 'holiday', kind: 'allDay', start: date, data: event.data }],
  });
  expect(calendar.api.selection.evaluate(target(11), target(12))).toMatchObject({ reason: 'overlap' });
  calendar['~update']({ ...calendar.options, constraints: { preventOverlap: false }, events: [event] });
  const session = calendar.api.move.begin('a');
  if (session.status !== 'active') throw new Error('start');
  session.session.update(target(11));
  calendar['~update']({ ...calendar.options, constraints: { allow: () => 'policy-changed' } });
  expect(session.session.commit().status).toBe('rejected');
  expect(calendar.api.interactions.store.state.candidate).toMatchObject({ reason: 'policy-changed' });
});

it('creates from external input without movement or selection and rechecks acceptance and IDs', () => {
  const onExternalDrop = vi.fn();
  const registered = interactionTestViews({
    grid: timeGridView({
      days: 1,
      features: { interactionFeature: interactionFeature(), externalDropFeature: externalDropFeature() },
    }),
  });
  const calendar = createCalendar({ ...base, ...registered, events: [], onExternalDrop });
  expect('move' in calendar.api).toBe(false);
  expect('pointer' in calendar.api).toBe(false);
  const session = calendar.api.externalDrop.begin(event, { origin: 'palette' });
  if (session.status !== 'active') throw new Error('begin');
  session.session.update(target(12));
  expect(calendar.api.interactions.store.state.preview?.status).toBe('valid');
  expect(session.session.commit().status).toBe('committed');
  expect(onExternalDrop).toHaveBeenCalledOnce();
  expect(onExternalDrop.mock.calls[0]![0]).toMatchObject({ kind: 'create', metadata: { origin: 'palette' } });
  expect(calendar.options.events).toEqual([]);
  calendar['~update']({ ...calendar.options, externalDrop: { accept: () => false } });
  expect(calendar.api.externalDrop.evaluate(event, target(12))).toMatchObject({ reason: 'external-source-rejected' });
});

it('emits one atomic transfer from the source and keeps both input arrays unchanged', () => {
  const onEventTransfer = vi.fn();
  const source = createCalendar({ ...base, crossCalendar: { id: 'source' }, onEventTransfer });
  const destination = createCalendar({ ...base, events: [] as typeof base.events, crossCalendar: { id: 'destination' } });
  const transfer = source.api.transfer.prepare('a', 'a')!;
  expect(source.api.move.begin('a').status).toBe('busy');
  const session = destination.api.transfer.begin(transfer);
  if (session.status !== 'active') throw new Error('begin');
  session.session.update(target(12));
  expect(session.session.commit().status).toBe('committed');
  expect(session.session.commit().status).toBe('stale-session');
  expect(onEventTransfer).toHaveBeenCalledOnce();
  expect(onEventTransfer.mock.calls[0]![0]).toMatchObject({ kind: 'transfer', sourceId: 'source', destinationId: 'destination', before: event });
  expect(source.options.events).toEqual([event]);
  expect(destination.options.events).toEqual([]);
  expect(source.api.interactions.store.state.session).toBeNull();
  const changed = source.api.transfer.prepare('a')!;
  const next = destination.api.transfer.begin(changed);
  if (next.status !== 'active') throw new Error('begin');
  source['~update']({ ...source.options, events: [{ ...event, data: { title: 'Changed' } }] });
  expect(next.session.commit().status).toBe('stale-session');
  expect(onEventTransfer).toHaveBeenCalledOnce();
});

it('provides day-grid resource hits and previews matching actual spans', () => {
  const calendar = createCalendar({ ...base, view: 'month', resources: ['a', 'b'].map(id => ({ id, title: id, data: null, availability: [] })) });
  const layout = calendar.store.state.layout;
  if (layout.kind !== 'dayGrid') throw new Error('layout');
  const section = layout.sections[0]!,
    row = section.rows.find(row => row.days.some(day => day.date.equals(date)))!;
  const index = row.days.findIndex(day => day.date.equals(date) && day.resource?.id === 'b');
  const hit = calendar.api.interactions.locate({
    kind: 'dayGrid',
    surface: { kind: 'row', section: section.key, row: row.key },
    fraction: (index + 0.5) / row.days.length,
  });
  expect(hit.status === 'valid' && hit.target.resourceId).toBe('b');
  const proposal = { kind: 'move' as const, before: event, after: { ...event, kind: 'allDay' as const, start: date, end: date.add({ days: 3 }) } };
  const preview = calendar.api.interactions.project(proposal);
  if (preview.status !== 'valid' || preview.kind !== 'dayGrid') throw new Error('preview');
  const applied = createCalendar({ ...calendar.options, events: [proposal.after] }).store.state.layout;
  if (applied.kind !== 'dayGrid') throw new Error('layout');
  expect(preview.geometry).toEqual(
    applied.sections.flatMap(section =>
      section.rows.flatMap(row =>
        row.segments.map(segment => ({
          surface: `row:${section.key}:${row.key}`,
          start: segment.colStart / row.columnCount,
          span: segment.colSpan / row.columnCount,
        })),
      ),
    ),
  );
});

it('activates optional input settings per view and validates prerequisites', () => {
  const configured = interactionTestViews({
    grid: timeGridView({
      days: 1,
      features: {
        interactionFeature: interactionFeature(),
        pointerFeature: pointerFeature(),
        touchFeature: touchFeature(),
        autoScrollFeature: autoScrollFeature(),
      },
    }),
    month: dayGridView({ period: 'month', maxEventsPerDay: 5 }),
  });
  const calendar = createCalendar({ ...base, ...configured, touch: { delay: 600 }, autoScroll: { speed: 800 } });
  expect(calendar.api.pointer.settings()).toMatchObject({ pointer: { enabled: true }, touch: { delay: 600 }, autoScroll: { speed: 800 } });
  calendar['~update']({ ...calendar.options, view: 'month' });
  expect(calendar.api.pointer.settings()).toEqual({
    pointer: { enabled: false },
    touch: { enabled: false, delay: 600 },
    autoScroll: { enabled: false, speed: 800 },
  });
});

it('receives transfers without registering movement on the destination', () => {
  const source = createCalendar({ ...base, crossCalendar: { id: 'source' } });
  const registered = interactionTestViews({
    grid: timeGridView({
      days: 1,
      features: { interactionFeature: interactionFeature(), pointerFeature: pointerFeature(), crossCalendarFeature: crossCalendarFeature() },
    }),
  });
  const destination = createCalendar({ ...base, ...registered, events: [] as typeof base.events, crossCalendar: { id: 'destination' } });
  expect('move' in destination.api).toBe(false);
  const transfer = source.api.transfer.prepare('a')!;
  const result = destination.api.transfer.evaluate(transfer, target(11));
  expect(result.status).toBe('valid');
  transfer.release();
});

it('resolves a timed day-grid trailing edge at midnight to the next date', () => {
  const calendar = createCalendar({ ...base, view: 'month', resources: [{ id: 'a', title: 'A', data: null, availability: [] }] });
  const layout = calendar.store.state.layout;
  if (layout.kind !== 'dayGrid') throw new Error('layout');
  const section = layout.sections[0]!;
  const row = section.rows.find(row => row.days.some(day => day.date.equals(date)))!;
  const index = row.days.findIndex(day => day.date.equals(date));
  const point = {
    kind: 'dayGrid' as const,
    surface: { kind: 'row' as const, section: section.key, row: row.key },
    fraction: (index + 1) / row.columnCount,
    dateKind: 'timed' as const,
    edge: 'end' as const,
  };
  const midnight = calendar.api.interactions.locate({ ...point, time: '00:00' });
  const daytime = calendar.api.interactions.locate({ ...point, time: '10:00' });
  expect(
    midnight.status === 'valid' && midnight.target.kind === 'timed' && midnight.target.at.equals(date.add({ days: 1 }).toZonedDateTime('UTC')),
  ).toBe(true);
  expect(daytime.status === 'valid' && daytime.target.kind === 'timed' && daytime.target.at.equals(at(10))).toBe(true);
});
