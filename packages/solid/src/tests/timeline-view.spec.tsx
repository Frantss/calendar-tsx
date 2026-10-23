import { For } from 'solid-js';
import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';
import { page } from 'vitest/browser';

import type { Calendar_TimelineLayout, Calendar_Views } from '@calendar-tsx/core';
import { timeGridView, timelineView } from '@calendar-tsx/core';
import type { Fixtures_EventData } from '#tests/calendar.fixtures';
import { fixtures_allDay, fixtures_resource, fixtures_timed } from '#tests/calendar.fixtures';
import {
  TimelineViewBody,
  TimelineViewDayHeader,
  TimelineViewDayTrigger,
  TimelineViewEvent,
  TimelineViewHeader,
  TimelineViewLane,
  TimelineViewNowIndicator,
  TimelineViewResource,
  TimelineViewRow,
  TimelineViewSlotLabel,
  TimelineView,
  TimelineViewUnavailable,
} from '#timeline-view';
import { useCalendarSelector } from '#use-calendar';
import type { CalendarSolidSetup_Overrides } from '#tests/calendar-solid.setup';
import { calendarSolidSetup_render } from '#tests/calendar-solid.setup';

const views: Calendar_Views = {
  day: timeGridView({ days: 1 }),
  timeline: timelineView({ days: 1, groupBy: 'resource' }),
  timeline_week: timelineView({ days: 7, minSlotWidth: '2rem' }),
};

const Timeline = () => {
  const timeline = useCalendarSelector(state => state.layout as Calendar_TimelineLayout<Fixtures_EventData, null>);

  return (
    <TimelineView model={timeline()}>
      <TimelineViewHeader>
        <For each={timeline().days}>
          {day => (
            <TimelineViewDayHeader day={day}>
              <TimelineViewDayTrigger day={day} view='day' />
            </TimelineViewDayHeader>
          )}
        </For>
        <For each={timeline().slots}>{slot => <TimelineViewSlotLabel slot={slot} />}</For>
      </TimelineViewHeader>
      <TimelineViewBody>
        <For each={timeline().rows}>
          {row => (
            <TimelineViewRow row={row}>
              <TimelineViewResource row={row}>{row.resource?.title}</TimelineViewResource>
              <TimelineViewLane row={row}>
                <For each={row.unavailable}>{segment => <TimelineViewUnavailable segment={segment} />}</For>
                <For each={row.segments}>{segment => <TimelineViewEvent segment={segment}>{segment.event.data.title}</TimelineViewEvent>}</For>
              </TimelineViewLane>
            </TimelineViewRow>
          )}
        </For>
        <TimelineViewNowIndicator model={timeline()} />
      </TimelineViewBody>
    </TimelineView>
  );
};

const setup = (overrides: CalendarSolidSetup_Overrides = {}) => {
  const utils = calendarSolidSetup_render(() => <Timeline />, { views, view: 'timeline', ...overrides });
  const part = (name: string) => [...document.querySelectorAll<HTMLElement>(`[data-part="${name}"]`)];

  const ui = {
    region: page.getByRole('region', { name: 'Timeline' }),
    event: (title: string) => page.getByRole('button', { name: title, exact: true }),
    part,
  };

  return { ...utils, ui };
};

it('exposes a labelled region with slot geometry', async () => {
  const { ui } = setup({ view: 'timeline_week' });

  await expect.element(ui.region).toHaveAttribute('data-part', 'timeline-root');
  expect(ui.region.element().getAttribute('style')).toBe('--cal-slots: 168; --cal-min-slot-width: 2rem;');
  expect(ui.part('timeline-day-header')[1]?.getAttribute('style')).toBe('--cal-col-start: 24; --cal-col-span: 24;');
  expect(ui.part('timeline-slot-label')[25]?.getAttribute('style')).toBe('--cal-col-start: 25;');
});

it('positions events, stacks overlaps and flags all-day events', async () => {
  const { ui } = setup({
    view: 'timeline_week',
    events: [
      fixtures_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' }),
      fixtures_timed('Pilates', { date: '2026-03-11', start: '09:30', end: '11:00' }),
      fixtures_allDay('Fair', { start: '2026-03-13' }),
    ],
  });

  await expect.element(ui.event('Fair')).toHaveAttribute('data-all-day', '');
  expect(ui.event('Yoga').element().getAttribute('style')).toMatch(/^--cal-start: 0\.\d+; --cal-span: 0\.\d+; --cal-row: 0;$/);
  expect(ui.event('Pilates').element().getAttribute('style')).toContain('--cal-row: 1;');
  expect(ui.part('timeline-row')[0]?.getAttribute('style')).toBe('--cal-rows: 2;');
});

it('marks unavailable resources and shades their lanes', async () => {
  const { ui } = setup({
    resources: [fixtures_resource('Ana', [{ date: '2026-03-11', start: '09:00', end: '17:00' }]), fixtures_resource('Room')],
  });

  await expect.element(ui.region).toBeInTheDocument();
  expect(ui.part('timeline-resource').map(cell => [cell.getAttribute('data-resource-id'), cell.hasAttribute('data-unavailable')])).toEqual([
    ['Ana', false],
    ['Room', true],
  ]);
  expect(ui.part('timeline-unavailable')).toHaveLength(3);
  expect(ui.part('timeline-unavailable').every(shade => shade.getAttribute('aria-hidden') === 'true')).toBe(true);
});

it('renders the now indicator only when now is in the range', async () => {
  const { ui } = setup();

  await expect.element(ui.region).toBeInTheDocument();
  expect(ui.part('timeline-now')).toHaveLength(1);
});

it('omits the now indicator outside the range', async () => {
  const { ui } = setup({ date: Temporal.PlainDate.from('2026-03-20') });

  await expect.element(ui.region).toBeInTheDocument();
  expect(ui.part('timeline-now')).toHaveLength(0);
});

it('navigates from a day trigger', async () => {
  const { mocks } = setup({ view: 'timeline_week' });

  await page.getByRole('button', { name: 'Go to Friday, March 13, 2026' }).click();

  expect(mocks.onNavigate.mock.calls[0]?.[0]).toMatchObject({ view: 'day' });
  expect(mocks.onNavigate.mock.calls[0]?.[0].date.toString()).toBe('2026-03-13');
});
