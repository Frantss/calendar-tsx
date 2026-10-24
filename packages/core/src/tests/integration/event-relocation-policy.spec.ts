import { expect, it, vi } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import {
  createCalendar,
  calendarFeatures,
  calendarViews,
  timeGridView,
  interactionFeature,
  eventMoveFeature,
  externalDropFeature,
  crossCalendarFeature,
} from '../../../export/index';
import type { Calendar_EventRelocationPolicy } from '../../../export/index';

const date = Temporal.PlainDate.from('2026-10-23');
const at = date.toZonedDateTime({ timeZone: 'UTC', plainTime: '12:00' });
const event = { id: 'booking', kind: 'allDay' as const, start: date, data: { title: 'Booking' }, resourceIds: ['a', 'b'] };
const target = { kind: 'timed' as const, at, resourceId: 'c' };
const base = { date, timeZone: 'UTC', view: 'day' as const, events: [event], onNavigate: () => {} };
const globalPolicy: Calendar_EventRelocationPolicy = { allowConversion: true, defaultTimedMinutes: 15, allowResourceChange: false };

it.each([0, 1, 2, 3, 4, 5])('merges policy fields through precedence layer %i with consumer aliases', level => {
  const features = calendarFeatures({
    interactions: interactionFeature(),
    edit: eventMoveFeature({ relocationPolicy: level >= 1 ? { defaultTimedMinutes: 30, allowResourceChange: true } : undefined }),
  });
  const views = calendarViews({
    features,
    views: {
      day: {
        ...timeGridView({
          days: 1,
          features: { edit: { relocationPolicy: level >= 3 ? { defaultTimedMinutes: 90, resourceMode: 'replace-source' as const } : undefined } },
        }),
        movement: { relocationPolicy: level >= 4 ? { defaultTimedMinutes: level === 4 ? 120 : undefined, allowConversion: undefined } : undefined },
      },
    },
  });
  const calendar = createCalendar({
    ...base,
    features,
    views,
    eventRelocationPolicy: globalPolicy,
    movement: { relocationPolicy: level >= 2 ? { defaultTimedMinutes: 45 } : undefined },
  });
  const result = calendar.api.move.evaluate('booking', { ...target, resourceId: level === 0 ? 'a' : 'c' }, 'a');
  if (result.status !== 'valid' || result.proposal.after.kind !== 'timed') throw new Error(JSON.stringify(result));
  expect(result.proposal.after.end.equals(at.add({ minutes: [15, 30, 45, 90, 120, 90][level] }))).toBe(true);
  expect(result.proposal.after.resourceIds).toEqual(level === 0 ? ['a', 'b'] : level >= 3 ? ['c', 'b'] : ['c']);
});

it('inherits calendar defaults for external creation and lets false override true without movement', () => {
  const features = calendarFeatures({
    interactions: interactionFeature(),
    palette: externalDropFeature({ relocationPolicy: { allowResourceChange: true, allowConversion: false } }),
  });
  const calendar = createCalendar({
    ...base,
    events: [] as typeof base.events,
    features,
    views: calendarViews({ features, views: { day: timeGridView({ days: 1 }) } }),
    eventRelocationPolicy: globalPolicy,
  });
  expect(calendar.api.externalDrop.evaluate(event, target)).toMatchObject({ reason: 'conversion-unsupported' });
  calendar['~update']({ ...calendar.options, externalDrop: { relocationPolicy: { allowConversion: true, defaultTimedMinutes: undefined } } });
  const result = calendar.api.externalDrop.evaluate(event, target);
  if (result.status !== 'valid' || result.proposal.after.kind !== 'timed') throw new Error('creation');
  expect(result.proposal.after.end.equals(at.add({ minutes: 15 }))).toBe(true);
  expect(result.proposal.after.resourceIds).toEqual(['c']);
  expect('move' in calendar.api).toBe(false);
  expect('selection' in calendar.api).toBe(false);
});

it('uses receiver defaults and overrides for transfers without receiver movement', () => {
  const sourceFeatures = calendarFeatures({
    interactions: interactionFeature(),
    move: eventMoveFeature(),
    transfer: crossCalendarFeature(),
  });
  const source = createCalendar({
    ...base,
    crossCalendar: { id: 'source' },
    features: sourceFeatures,
    views: calendarViews({ features: sourceFeatures, views: { day: timeGridView({ days: 1 }) } }),
    eventRelocationPolicy: { allowConversion: false, allowResourceChange: false },
  });
  const features = calendarFeatures({
    interactions: interactionFeature(),
    receive: crossCalendarFeature({ relocationPolicy: { allowResourceChange: true } }),
  });
  const destination = createCalendar({
    ...base,
    events: [] as typeof base.events,
    features,
    views: calendarViews({
      features,
      views: { day: timeGridView({ days: 1, features: { receive: { relocationPolicy: { resourceMode: 'replace-source' } } } }) },
    }),
    eventRelocationPolicy: globalPolicy,
    crossCalendar: { id: 'destination', relocationPolicy: { defaultTimedMinutes: 90 } },
  });
  const prepared = source.api.transfer.prepare('booking', 'a')!;
  try {
    const result = destination.api.transfer.evaluate(prepared, target);
    if (result.status !== 'valid' || result.proposal.after.kind !== 'timed') throw new Error('transfer');
    expect(result.proposal.after.end.equals(at.add({ minutes: 90 }))).toBe(true);
    expect(result.proposal.after.resourceIds).toEqual(['c', 'b']);
    expect('move' in destination.api).toBe(false);
    expect('pointer' in destination.api).toBe(false);
  } finally {
    prepared.release();
  }
});

it.each(['move', 'create', 'transfer'] as const)('revalidates %s drafts and previews on global and feature policy changes', operation => {
  const features = calendarFeatures({
    interactions: interactionFeature(),
    move: eventMoveFeature(),
    palette: externalDropFeature(),
    transfer: crossCalendarFeature(),
  });
  const views = calendarViews({ features, views: { day: timeGridView({ days: 1 }) } });
  const source = createCalendar({ ...base, features, views, crossCalendar: { id: 'source' } });
  const calendar = createCalendar({
    ...base,
    features,
    views,
    events: operation === 'move' ? [event] : [],
    crossCalendar: { id: 'destination' },
    eventRelocationPolicy: { allowConversion: true, defaultTimedMinutes: 60 },
  });
  const prepared = operation === 'transfer' ? source.api.transfer.prepare('booking', 'a')! : undefined;
  const start =
    operation === 'move'
      ? calendar.api.move.begin('booking', 'a')
      : operation === 'create'
        ? calendar.api.externalDrop.begin(event)
        : calendar.api.transfer.begin(prepared!);
  if (start.status !== 'active') throw new Error('start');
  start.session.update(target);
  const preview = calendar.api.interactions.store.state.preview;
  expect(preview?.status).toBe('valid');
  calendar['~update']({ ...calendar.options, eventRelocationPolicy: { allowConversion: true, defaultTimedMinutes: 120 } });
  const candidate = calendar.api.interactions.store.state.candidate;
  if (candidate?.status !== 'valid' || !('after' in candidate.proposal) || candidate.proposal.after.kind !== 'timed') throw new Error('draft');
  expect(candidate.proposal.after.end.equals(at.add({ hours: 2 }))).toBe(true);
  expect(calendar.api.interactions.store.state.preview).not.toEqual(preview);
  const key = operation === 'move' ? 'movement' : operation === 'create' ? 'externalDrop' : 'crossCalendar';
  calendar['~update']({ ...calendar.options, [key]: { ...calendar.options[key], relocationPolicy: { allowConversion: false } } });
  expect(calendar.api.interactions.store.state.candidate).toMatchObject({ reason: 'conversion-unsupported' });
  expect(calendar.api.interactions.store.state.preview).toBeNull();
  expect(start.session.commit()).toMatchObject({ reason: 'conversion-unsupported' });
  calendar['~update']({ ...calendar.options, [key]: { ...calendar.options[key], relocationPolicy: { allowConversion: undefined } } });
  expect(calendar.api.interactions.store.state.candidate?.status).toBe('valid');
  expect(start.session.commit().status).toBe('committed');
  prepared?.release();
});

it('keeps drafts stable when policy objects change but effective values do not', () => {
  const canMove = vi.fn(() => true);
  const features = calendarFeatures({
    interactions: interactionFeature(),
    move: eventMoveFeature({ canMove, relocationPolicy: { defaultTimedMinutes: 90 } }),
  });
  const calendar = createCalendar({
    ...base,
    features,
    views: calendarViews({ features, views: { day: timeGridView({ days: 1 }) } }),
    eventRelocationPolicy: { allowConversion: true, defaultTimedMinutes: 60 },
  });
  const start = calendar.api.move.begin('booking');
  if (start.status !== 'active') throw new Error('start');
  start.session.update(target);
  canMove.mockClear();
  const draft = calendar.api.interactions.store.state.candidate;
  calendar['~update']({
    ...calendar.options,
    eventRelocationPolicy: { allowConversion: true, defaultTimedMinutes: 120 },
    movement: { relocationPolicy: { defaultTimedMinutes: 90 } },
  });
  expect(canMove).not.toHaveBeenCalled();
  expect(calendar.api.interactions.store.state.candidate).toBe(draft);
  start.session.cancel();
});
