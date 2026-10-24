import { expect, it } from 'vitest';

import type { Calendar_TimelineLayout, Calendar_Views } from '@calendar-tsx/core';
import { timelineView } from '@calendar-tsx/core';
import {
  TimelineViewBody,
  TimelineViewDayHeader,
  TimelineViewEvent,
  TimelineViewHeader,
  TimelineViewLane,
  TimelineViewNowIndicator,
  TimelineViewResource,
  TimelineViewRow,
  TimelineViewSlotLabel,
  TimelineView,
  TimelineViewUnavailable,
  useCalendarSelector,
} from '@calendar-tsx/react';
import type { ThemesSetup_EventData } from '#tests/themes.setup';
import '../../base.css';

import { themesSetup_allDay, themesSetup_part, themesSetup_rect, themesSetup_render, themesSetup_timed } from '#tests/themes.setup';

const views: Calendar_Views = {
  timeline: timelineView({ days: 1, groupBy: 'resource' }),
  timeline_week: timelineView({ days: 7, groupBy: 'resource', minSlotWidth: '1rem' }),
};

const resources = ['Ana', 'Room'].map(id => ({ id, title: id, availability: [], data: null }));

const Timeline = () => {
  const timeline = useCalendarSelector(state => state.layout) as Calendar_TimelineLayout<ThemesSetup_EventData, null>;

  return (
    <TimelineView model={timeline}>
      <TimelineViewHeader>
        {timeline.days.map(day => (
          <TimelineViewDayHeader key={day.key} day={day}>
            {day.date.day}
          </TimelineViewDayHeader>
        ))}
        {timeline.slots.map(slot => (
          <TimelineViewSlotLabel key={slot.key} slot={slot} />
        ))}
      </TimelineViewHeader>
      <TimelineViewBody>
        {timeline.rows.map(row => (
          <TimelineViewRow key={row.key} row={row}>
            <TimelineViewResource row={row}>{row.resource?.title}</TimelineViewResource>
            <TimelineViewLane row={row}>
              {row.unavailable.map(segment => (
                <TimelineViewUnavailable key={segment.key} segment={segment} />
              ))}
              {row.segments.map(segment => (
                <TimelineViewEvent key={segment.key} segment={segment}>
                  {segment.event.data.title}
                </TimelineViewEvent>
              ))}
            </TimelineViewLane>
          </TimelineViewRow>
        ))}
        <TimelineViewNowIndicator model={timeline} />
      </TimelineViewBody>
    </TimelineView>
  );
};

const render = (overrides: Parameters<typeof themesSetup_render>[1] = {}) =>
  themesSetup_render(<Timeline />, { views, view: 'timeline', resources, ...overrides });

const event = (title: string) => themesSetup_part('timeline-event').find(element => element.textContent === title);

it('places an event at its fraction of the track', async () => {
  await render({ events: [{ ...themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '12:00' }), resourceIds: ['Ana'] }] });
  const lane = themesSetup_rect(themesSetup_part('timeline-lane')[0]);
  const yoga = themesSetup_rect(event('Yoga'));

  expect(yoga.left - lane.left).toBeCloseTo(lane.width * 0.375, 0);
  expect(yoga.width).toBeCloseTo(lane.width / 8, 0);
});

it('lines the day headers and slot labels up with the track', async () => {
  await render({ view: 'timeline_week' });
  const lane = themesSetup_rect(themesSetup_part('timeline-lane')[0]);
  const days = themesSetup_part('timeline-day-header').map(themesSetup_rect);
  const slots = themesSetup_part('timeline-slot-label').map(themesSetup_rect);

  expect(days).toHaveLength(7);
  expect(days[0]?.left).toBeCloseTo(lane.left, 0);
  expect(days[6]?.right).toBeCloseTo(lane.right, 0);
  expect(days[3]?.left).toBeCloseTo(slots[72]?.left ?? 0, 0);
  expect(lane.width).toBeGreaterThanOrEqual(168 * 16 - 1);
});

it('aligns daily month headers and event bars across a DST transition', async () => {
  await render({
    views: { timeline: timelineView({ period: 'month', groupBy: 'resource', slotMinutes: 1440, minSlotWidth: '2rem' }) },
    events: [{ ...themesSetup_allDay('DST', { start: '2026-03-08', end: '2026-03-08' }), resourceIds: ['Ana'] }],
  });
  const shortDay = themesSetup_rect(themesSetup_part('timeline-day-header', '[data-date="2026-03-08"]')[0]);
  const normalDay = themesSetup_rect(themesSetup_part('timeline-day-header', '[data-date="2026-03-09"]')[0]);
  const bar = themesSetup_rect(event('DST'));
  expect(bar.left).toBeCloseTo(shortDay.left, 0);
  expect(bar.width).toBeCloseTo(shortDay.width, 0);
  expect(shortDay.width / normalDay.width).toBeCloseTo(1, 2);
  expect(shortDay.width).toBeGreaterThanOrEqual(31.9);
});

it('stacks overlapping events without overlap and grows the row', async () => {
  await render({
    events: [
      { ...themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' }), resourceIds: ['Ana'] },
      { ...themesSetup_timed('Pilates', { date: '2026-03-11', start: '09:30', end: '11:00' }), resourceIds: ['Ana'] },
    ],
  });
  const [ana, room] = themesSetup_part('timeline-lane').map(themesSetup_rect);
  const yoga = themesSetup_rect(event('Yoga'));
  const pilates = themesSetup_rect(event('Pilates'));

  expect(pilates.top).toBeGreaterThanOrEqual(yoga.bottom);
  expect(pilates.bottom).toBeLessThanOrEqual(ana?.bottom ?? 0);
  expect(ana?.height).toBeGreaterThan(room?.height ?? 0);
});

it('keeps native buttons within their calculated timeline span', async () => {
  await render({
    views: { timeline: timelineView({ period: 'month', groupBy: 'resource', slotMinutes: 1440, minSlotWidth: '6rem', minEventMinutes: 0 }) },
    events: [
      { ...themesSetup_timed('First', { date: '2026-03-11', start: '09:00', end: '09:15' }), resourceIds: ['Ana'] },
      { ...themesSetup_timed('Second', { date: '2026-03-11', start: '09:15', end: '09:30' }), resourceIds: ['Ana'] },
    ],
  });
  expect(themesSetup_rect(event('First')).right).toBeLessThanOrEqual(themesSetup_rect(event('Second')).left + 0.05);
  expect(getComputedStyle(event('First')!).overflowX).toBe('hidden');
});

it('draws the now line at the clock offset across all rows', async () => {
  await render();
  const lanes = themesSetup_part('timeline-lane').map(themesSetup_rect);
  const now = themesSetup_rect(themesSetup_part('timeline-now')[0]);
  const first = lanes[0];

  expect(now.left - (first?.left ?? 0)).toBeCloseTo((first?.width ?? 0) * ((10 + 40 / 60) / 24), 0);
  expect(now.top).toBeCloseTo(first?.top ?? 0, 0);
  expect(now.bottom).toBeCloseTo(lanes[1]?.bottom ?? 0, 0);
});

it('keeps the header corner over the resource column when the track scrolls', async () => {
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = '[data-part="timeline-header"] { background: rgb(255, 255, 255); }';

  await render({ view: 'timeline_week' });
  const root = themesSetup_part('timeline-root')[0];
  const header = themesSetup_part('timeline-header')[0];

  if (root) root.scrollLeft = 400;

  const corner = themesSetup_rect(themesSetup_part('timeline-resource')[0]);
  const day = themesSetup_rect(themesSetup_part('timeline-day-header')[0]);
  const hit = document.elementFromPoint(corner.left + corner.width / 2, day.top + day.height / 2);

  expect(root?.scrollLeft).toBe(400);
  expect(hit).toBe(header);
  style.remove();
});

it('scrolls the now line under the resource column', async () => {
  // base.css draws no line and ignores pointer events; give it a hit area without changing its stacking
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = '[data-part="timeline-now"] { inline-size: 2px; pointer-events: auto; }';

  await render({ view: 'timeline_week' });
  const root = themesSetup_part('timeline-root')[0];
  const resource = themesSetup_part('timeline-resource')[0];
  const before = themesSetup_rect(themesSetup_part('timeline-now')[0]);
  const column = themesSetup_rect(resource);

  if (root) root.scrollLeft = before.left - column.left - column.width / 2;

  const now = themesSetup_rect(themesSetup_part('timeline-now')[0]);
  const hit = document.elementFromPoint(now.left + 1, column.top + column.height / 2);

  expect(now.left).toBeGreaterThan(column.left);
  expect(now.left).toBeLessThan(column.right);
  expect(hit).toBe(resource);
  style.remove();
});

it('keeps the header over resource cells when the rows scroll', async () => {
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = '[data-part="timeline-root"] { max-block-size: 3rem; } [data-part="timeline-header"] { background: rgb(255, 255, 255); }';

  await render({ view: 'timeline_week' });
  const root = themesSetup_part('timeline-root')[0];
  const header = themesSetup_part('timeline-header')[0];

  if (root) root.scrollTop = 20;

  const day = themesSetup_rect(themesSetup_part('timeline-day-header')[0]);
  const column = themesSetup_rect(themesSetup_part('timeline-resource')[0]);
  const hit = document.elementFromPoint(column.left + column.width / 2, day.top + day.height / 2);

  expect(root?.scrollTop).toBe(20);
  expect(hit).toBe(header);
  style.remove();
});

it('stretches the lane and its shading to a taller resource cell', async () => {
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = '[data-part="timeline-resource"] { padding-block: 1rem; }';

  await render();
  const row = themesSetup_rect(themesSetup_part('timeline-row')[0]);
  const lane = themesSetup_rect(themesSetup_part('timeline-lane')[0]);
  const shade = themesSetup_rect(themesSetup_part('timeline-unavailable')[0]);

  expect(row.height).toBeGreaterThan(40);
  expect(lane.height).toBeCloseTo(row.height, 0);
  expect(shade.top).toBeCloseTo(row.top, 0);
  expect(shade.bottom).toBeCloseTo(row.bottom, 0);
  style.remove();
});
