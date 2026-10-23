import { Temporal } from 'temporal-polyfill';
import { afterEach, expect, it, vi } from 'vitest';

import { calendarClock_interval } from '#calendar-clock';
import type { Calendar_Clock } from '#calendar.types';
import { fixtures_allDay, fixtures_at, fixtures_timed } from '#tests/calendar.fixtures';
import { calendarSetup_create, calendarSetup_defaults } from '#tests/calendar.setup';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const lastNavigation = (onNavigate: ReturnType<typeof vi.fn>) => onNavigate.mock.lastCall?.[0];

it('emits the next period without changing its own state', async () => {
  const utils = await calendarSetup_create({ view: 'month', date: Temporal.PlainDate.from('2026-03-11') });

  utils.instance.api.next();

  expect(lastNavigation(utils.mocks.onNavigate)).toMatchObject({ view: 'month' });
  expect(lastNavigation(utils.mocks.onNavigate).date.toString()).toBe('2026-04-01');
  expect(utils.state().context.date.toString()).toBe('2026-03-11');
});

it('steps by one period for each layout kind', async () => {
  const cases = [
    { view: 'month', prev: '2026-02-01' },
    { view: 'week', prev: '2026-03-04' },
    { view: 'day', prev: '2026-03-10' },
    { view: 'list_week', prev: '2026-03-04' },
  ];

  for (const { view, prev } of cases) {
    const utils = await calendarSetup_create({ view });

    utils.instance.api.prev();

    expect(lastNavigation(utils.mocks.onNavigate).date.toString()).toBe(prev);
  }
});

it('navigates to today from the injected clock, in the calendar time zone', async () => {
  const utils = await calendarSetup_create({
    date: Temporal.PlainDate.from('2026-01-05'),
    now: Temporal.Instant.from('2026-03-12T03:00:00Z'),
  });

  utils.instance.api.today();

  // 03:00Z on the 12th is still the 11th in New York
  expect(lastNavigation(utils.mocks.onNavigate).date.toString()).toBe('2026-03-11');
});

it('emits view and date together in one navigation', async () => {
  const utils = await calendarSetup_create({ view: 'month' });

  utils.instance.api.navigate({ view: 'day', date: Temporal.PlainDate.from('2026-03-14') });

  expect(utils.mocks.onNavigate).toHaveBeenCalledTimes(1);
  expect(lastNavigation(utils.mocks.onNavigate)).toMatchObject({ view: 'day' });
  expect(lastNavigation(utils.mocks.onNavigate).range.start.toString()).toBe('2026-03-14');
});

it('computes back-to-back actions from the current controlled values (last one wins)', async () => {
  const utils = await calendarSetup_create({ view: 'month' });

  utils.instance.api.setView('day');
  utils.instance.api.goTo(Temporal.PlainDate.from('2026-03-14'));

  expect(utils.mocks.onNavigate.mock.calls.map(([navigation]) => `${navigation.view} ${navigation.date}`)).toEqual([
    'day 2026-03-11',
    'month 2026-03-14',
  ]);
});

it('re-derives synchronously when a tracked option changes', async () => {
  const utils = await calendarSetup_create({ view: 'month' });

  utils.update({ view: 'day', date: Temporal.PlainDate.from('2026-03-14') });

  expect(utils.state().context).toMatchObject({ view: 'day', kind: 'timeGrid' });
  expect(utils.state().context.range.start.toString()).toBe('2026-03-14');
});

it('does not re-derive when re-rendered with referentially equal tracked options', async () => {
  const utils = await calendarSetup_create();
  const before = utils.state();

  utils.update({ date: Temporal.PlainDate.from('2026-03-11'), onNavigate: vi.fn() });

  expect(utils.state()).toBe(before);
});

it('re-derives when the events reference changes', async () => {
  const utils = await calendarSetup_create();
  const before = utils.state();

  utils.update({ events: [fixtures_timed('yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })] });

  expect(utils.state()).not.toBe(before);
});

it('reads eventOrder at derivation time without tracking it', async () => {
  const events = [
    fixtures_timed('a', { date: '2026-03-11', start: '09:00', end: '10:00' }),
    fixtures_timed('b', { date: '2026-03-11', start: '11:00', end: '12:00' }),
  ];
  const reversed = (a: { id: string }, b: { id: string }) => b.id.localeCompare(a.id);
  const utils = await calendarSetup_create({ view: 'list_week', events, eventOrder: reversed });

  const layout = utils.state().layout;

  expect(layout.kind === 'list' ? layout.days[0]?.events.map(event => event.id) : []).toEqual(['b', 'a']);
});

it('passes the active view context to eventOrder', async () => {
  const eventOrder = vi.fn((..._args: unknown[]) => 0);
  const events = [
    fixtures_timed('a', { date: '2026-03-11', start: '09:00', end: '10:00' }),
    fixtures_timed('b', { date: '2026-03-11', start: '11:00', end: '12:00' }),
  ];

  await calendarSetup_create({ view: 'week', events, eventOrder }).then(utils => utils.state());

  expect(eventOrder.mock.calls[0]?.[2]).toMatchObject({ view: 'week', kind: 'timeGrid' });
});

it('lays timed events out in the calendar time zone, whatever their input zone', async () => {
  const lisbon = {
    ...fixtures_timed('call', { date: '2026-03-11', start: '09:00', end: '10:00' }),
    start: fixtures_at('2026-03-11', '14:00', 'Europe/Lisbon'),
    end: fixtures_at('2026-03-11', '15:00', 'Europe/Lisbon'),
  };
  const utils = await calendarSetup_create({ view: 'day', events: [lisbon] });
  const layout = utils.state().layout;
  const segment = layout.kind === 'timeGrid' ? layout.columns[0]?.segments[0] : undefined;

  // 14:00 Lisbon is 10:00 New York (both on standard/daylight offsets that day: UTC+0 and UTC-4)
  expect(segment?.start).toBeCloseTo(10 / 24);
  expect(segment && 'timeZoneId' in segment.event.start ? segment.event.start.timeZoneId : undefined).toBe('America/New_York');
});

it('keeps all-day events out of timed columns', async () => {
  const utils = await calendarSetup_create({ view: 'day', events: [fixtures_allDay('fair', { start: '2026-03-11' })] });
  const layout = utils.state().layout;

  expect(layout.kind === 'timeGrid' && layout.columns[0]?.segments).toEqual([]);
  expect(layout.kind === 'timeGrid' && layout.allDay?.segments.map(segment => segment.event.id)).toEqual(['fair']);
});

it('reports duplicate event ids in development', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const event = fixtures_timed('dup', { date: '2026-03-11', start: '09:00', end: '10:00' });

  await calendarSetup_create({ events: [event, event] }).then(utils => utils.state());

  expect(error).toHaveBeenCalledWith(expect.stringContaining('duplicate event id "dup"'));
});

it('ticks now while mounted and stops after unmount', async () => {
  vi.useFakeTimers();
  let now = calendarSetup_defaults.now;
  const interval = calendarClock_interval({ every: Temporal.Duration.from({ minutes: 1 }) });
  const clock: Calendar_Clock = { now: () => now, subscribe: interval.subscribe };
  const utils = await calendarSetup_create({ clock });

  const unmount = utils.instance['~mount']();

  now = now.add({ minutes: 1 });
  vi.advanceTimersByTime(60_000);
  expect(utils.state().now.toString()).toContain('T10:41');

  unmount();
  now = now.add({ minutes: 1 });
  vi.advanceTimersByTime(60_000);
  expect(utils.state().now.toString()).toContain('T10:41');
});

it('never changes now with a fixed clock', async () => {
  vi.useFakeTimers();
  const utils = await calendarSetup_create();
  const unmount = utils.instance['~mount']();

  vi.advanceTimersByTime(10 * 60_000);

  expect(utils.state().now.toString()).toContain('T10:40');
  unmount();
});
