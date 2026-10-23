import { Temporal } from 'temporal-polyfill';
import { expect, expectTypeOf, it } from 'vitest';

import { createEvent } from '#calendar-events';
import type { Calendar_AllDayEventInput, Calendar_EventInput, Calendar_TimedEventInput } from '#calendar.types';
import type { Fixtures_EventData } from '#tests/calendar.fixtures';
import { fixtures_at, fixtures_timed } from '#tests/calendar.fixtures';

it('returns the event it is given', () => {
  const input = { id: 'fair', kind: 'allDay' as const, start: Temporal.PlainDate.from('2026-03-11'), data: { title: 'Fair' } };

  expect(createEvent(input)).toBe(input);
});

it('infers the payload and keeps the timed or all-day variant', () => {
  const timed = createEvent({
    id: 'yoga',
    kind: 'timed',
    start: fixtures_at('2026-03-11', '09:00'),
    end: fixtures_at('2026-03-11', '10:00'),
    data: { title: 'Yoga' },
  });
  const allDay = createEvent<Fixtures_EventData>({
    id: 'fair',
    kind: 'allDay',
    start: Temporal.PlainDate.from('2026-03-11'),
    data: { title: 'Fair' },
  });

  expectTypeOf(timed).toEqualTypeOf<Calendar_TimedEventInput<{ title: string }>>();
  expectTypeOf(allDay).toEqualTypeOf<Calendar_AllDayEventInput<Fixtures_EventData>>();
});

it('rejects an event that mixes the timed and all-day shapes', () => {
  createEvent({
    id: 'mixed',
    // @ts-expect-error an all-day event takes a PlainDate start
    kind: 'allDay',
    start: fixtures_at('2026-03-11', '09:00'),
    data: null,
  });
});

it('requires the kind discriminant and narrows on it', () => {
  // @ts-expect-error a timed event must say `kind: 'timed'`
  createEvent({ id: 'yoga', start: fixtures_at('2026-03-11', '09:00'), end: fixtures_at('2026-03-11', '10:00'), data: null });

  const event = fixtures_timed('yoga', { date: '2026-03-11', start: '09:00', end: '10:00' }) as Calendar_EventInput<Fixtures_EventData>;

  if (event.kind === 'allDay') expectTypeOf(event.start).toEqualTypeOf<Temporal.PlainDate>();
  else expectTypeOf(event.start).toEqualTypeOf<Temporal.ZonedDateTime>();
});
