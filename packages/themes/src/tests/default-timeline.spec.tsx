/// <reference types="@vitest/browser-playwright" />

import { expect, it } from 'vitest';
import { cdp } from 'vitest/browser';

import type { Calendar_TimelineLayout, Calendar_Views } from '@calendar-tsx/core';
import { timelineView } from '@calendar-tsx/core';
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
  useCalendarSelector,
} from '@calendar-tsx/react';
import type { ThemesSetup_EventData } from '#tests/themes.setup';
import '../../default.css';

import { themesSetup_part, themesSetup_rect, themesSetup_render, themesSetup_timed } from '#tests/themes.setup';

const views: Calendar_Views = {
  timeline: timelineView({ days: 1, groupBy: 'resource' }),
  timeline_week: timelineView({ days: 7, groupBy: 'resource', minSlotWidth: '1rem' }),
};

const workday = themesSetup_timed('workday', { date: '2026-03-11', start: '09:00', end: '17:00' });

const resources = [
  { id: 'Ana', title: 'Ana', availability: [{ start: workday.start, end: workday.end }], data: null },
  { id: 'Room', title: 'Room', availability: [], data: null },
];

const Timeline = () => {
  const timeline = useCalendarSelector(state => state.layout) as Calendar_TimelineLayout<ThemesSetup_EventData, null>;

  return (
    <TimelineView model={timeline}>
      <TimelineViewHeader>
        {timeline.days.map(day => (
          <TimelineViewDayHeader key={day.key} day={day}>
            <TimelineViewDayTrigger day={day} view='timeline'>
              {day.date.day}
            </TimelineViewDayTrigger>
          </TimelineViewDayHeader>
        ))}
        {timeline.slots.map(slot => (
          <TimelineViewSlotLabel key={slot.key} slot={slot}>
            {slot.time.hour}
          </TimelineViewSlotLabel>
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

const accent = 'rgb(180, 68, 30)';

const render = (overrides: Parameters<typeof themesSetup_render>[1] = {}) =>
  themesSetup_render(<Timeline />, { views, view: 'timeline', resources, ...overrides });

const todayTrigger = () => themesSetup_part('timeline-day-header', '[data-today]')[0]?.querySelector('[data-part="timeline-day-trigger"]');

it('tints timeline events from an accent set on an ancestor', async () => {
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = '.accent { --calendar-accent: rgb(0, 0, 255); }';
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.color = 'color-mix(in oklab, rgb(0, 0, 255) 16%, #ffffff)';

  await render({
    className: 'accent',
    events: [{ ...themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' }), resourceIds: ['Ana'] }],
  });
  const yoga = themesSetup_part('timeline-event')[0];

  expect(yoga && getComputedStyle(yoga).backgroundColor).toBe(getComputedStyle(probe).color);
  probe.remove();
  style.remove();
});

it("marks today's day with the accent", async () => {
  await render();
  const trigger = todayTrigger();

  expect(trigger && getComputedStyle(trigger).backgroundColor).toBe(accent);
});

it('keeps resource cells opaque and mutes unavailable ones', async () => {
  await render();
  const [ana, room] = themesSetup_part('timeline-resource');

  expect(ana && getComputedStyle(ana).backgroundColor).toBe('rgb(255, 255, 255)');
  expect(room && getComputedStyle(room).backgroundColor).toBe('rgb(245, 244, 241)');
});

it('hatches unavailable time', async () => {
  await render();
  const shade = themesSetup_part('timeline-unavailable')[0];

  expect(shade && getComputedStyle(shade).backgroundImage).toContain('repeating-linear-gradient');
});

it('draws the now line in the accent', async () => {
  await render();
  const now = themesSetup_part('timeline-now')[0];

  expect(now && getComputedStyle(now).borderInlineStartColor).toBe(accent);
  expect(now && getComputedStyle(now).borderInlineStartWidth).toBe('2px');
});

it('keeps a scrolled day label beside the resource column', async () => {
  await render({ view: 'timeline_week' });
  const root = themesSetup_part('timeline-root')[0];
  const day = themesSetup_part('timeline-day-header')[3];

  if (root && day) root.scrollLeft = day.offsetLeft - 160 + 100;

  const column = themesSetup_rect(themesSetup_part('timeline-resource')[0]);
  const label = themesSetup_rect(day?.querySelector('[data-part="timeline-day-trigger"]') ?? undefined);

  expect(themesSetup_rect(day).left).toBeLessThan(column.right);
  expect(label.left - column.right).toBeCloseTo(8, 0);
});

it('marks today with system colors in forced-colors mode', async () => {
  await cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
  await render();
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.cssText = 'forced-color-adjust: none; background: Highlight;';
  const trigger = todayTrigger();

  expect(trigger && getComputedStyle(trigger).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
  probe.remove();
  await cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'none' }] });
});

it.each(['month', 'year'] as const)('keeps exact-width adjacent events apart when the minimum is disabled in a %s timeline', async period => {
  await render({
    views: { timeline: timelineView({ period, groupBy: 'resource', slotMinutes: 1440, minSlotWidth: '6rem', minEventMinutes: 0 }) },
    events: [
      { ...themesSetup_timed('First', { date: '2026-03-11', start: '09:00', end: '09:15' }), resourceIds: ['Ana'] },
      { ...themesSetup_timed('Second', { date: '2026-03-11', start: '09:15', end: '09:30' }), resourceIds: ['Ana'] },
    ],
  });
  const [first, second] = themesSetup_part('timeline-event');
  const firstRect = themesSetup_rect(first);
  const secondRect = themesSetup_rect(second);
  expect(first?.style.getPropertyValue('--cal-row')).toBe('0');
  expect(second?.style.getPropertyValue('--cal-row')).toBe('0');
  expect(firstRect.right).toBeLessThanOrEqual(secondRect.left + 0.05);
});

it.each(['month', 'quarter', 'year'] as const)('keeps minimum-size events visible and separately selectable in a %s timeline', async period => {
  await render({
    views: { timeline: timelineView({ period, groupBy: 'resource', slotMinutes: 1440, minSlotWidth: '6rem' }) },
    events: [
      { ...themesSetup_timed('First', { date: '2026-03-11', start: '09:00', end: '09:15' }), resourceIds: ['Ana'] },
      { ...themesSetup_timed('Second', { date: '2026-03-11', start: '09:15', end: '09:30' }), resourceIds: ['Ana'] },
    ],
  });
  const [first, second] = themesSetup_part('timeline-event');
  const a = themesSetup_rect(first);
  const b = themesSetup_rect(second);

  expect(a.width).toBeGreaterThanOrEqual(48);
  expect(b.width).toBeGreaterThanOrEqual(48);
  expect(a.bottom).toBeLessThanOrEqual(b.top);
  expect(themesSetup_rect(themesSetup_part('timeline-lane')[0]).bottom).toBeGreaterThanOrEqual(b.bottom);
});
