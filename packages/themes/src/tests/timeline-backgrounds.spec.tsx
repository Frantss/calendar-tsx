/// <reference types="@vitest/browser-playwright" />

import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';
import { cdp } from 'vitest/browser';

import type { Calendar_TimelineLayout } from '@calendar-tsx/core';
import { backgroundFeature, timelineView } from '@calendar-tsx/core';
import {
  TimelineView,
  TimelineViewBackground,
  TimelineViewBackgroundEvent,
  TimelineViewBody,
  TimelineViewEvent,
  TimelineViewLane,
  TimelineViewResource,
  TimelineViewRow,
  useCalendarSelector,
} from '@calendar-tsx/react';
import type { ThemesSetup_EventData } from '#tests/themes.setup';
import { themesSetup_background, themesSetup_part, themesSetup_rect, themesSetup_render, themesSetup_timed } from '#tests/themes.setup';
import '../../default.css';

const Timeline = () => {
  const layout = useCalendarSelector(state => state.layout) as Calendar_TimelineLayout<
    ThemesSetup_EventData,
    null,
    { backgroundFeature: typeof backgroundFeature }
  >;
  return (
    <TimelineView model={layout}>
      <TimelineViewBody>
        {layout.rows.map(row => (
          <TimelineViewRow key={row.key} row={row}>
            <TimelineViewResource row={row}>{row.resource?.title}</TimelineViewResource>
            <TimelineViewLane row={row}>
              {row.segments.map(segment => (
                <TimelineViewEvent key={segment.key} segment={segment}>
                  {segment.event.data.title}
                </TimelineViewEvent>
              ))}
              {row.backgrounds.map(background => (
                <TimelineViewBackground key={background.key} background={background} />
              ))}
              {row.backgroundEvents.map(segment => (
                <TimelineViewBackgroundEvent key={segment.key} segment={segment} />
              ))}
            </TimelineViewLane>
          </TimelineViewRow>
        ))}
      </TimelineViewBody>
    </TimelineView>
  );
};

const render = (colorScheme: 'light' | 'dark' = 'light') =>
  themesSetup_render(<Timeline />, {
    colorScheme,
    views: { timeline: timelineView({ days: 1, groupBy: 'resource', features: { backgroundFeature } }) },
    view: 'timeline',
    resources: [{ id: 'room', title: 'Room', availability: [], data: null }],
    events: [
      { ...themesSetup_timed('Booking', { date: '2026-03-11', start: '12:00', end: '13:00' }), resourceIds: ['room'] },
      themesSetup_background(themesSetup_timed('Closure', { date: '2026-03-11', start: '12:00', end: '15:00' })),
    ],
    backgrounds: [{ id: 'closed', kind: 'closed', ranges: [{ allDay: true, start: Temporal.PlainDate.from('2026-03-11') }] }],
  });

it('fills the lane height at exact timeline fractions and keeps events above later shading', async () => {
  await render();
  const lane = themesSetup_rect(themesSetup_part('timeline-lane')[0]);
  const layer = themesSetup_rect(themesSetup_part('timeline-background')[0]);
  const backgroundEvent = themesSetup_rect(themesSetup_part('timeline-background-event')[0]);
  expect(layer.left).toBeCloseTo(lane.left, 0);
  expect(layer.width).toBeCloseTo(lane.width, 0);
  expect(layer.top).toBeCloseTo(lane.top, 0);
  expect(layer.height).toBeCloseTo(lane.height, 0);
  expect(backgroundEvent.left - lane.left).toBeCloseTo(lane.width / 2, 0);
  expect(backgroundEvent.width).toBeCloseTo(lane.width / 8, 0);
  expect(backgroundEvent.height).toBeCloseTo(lane.height, 0);
  const event = themesSetup_part('timeline-event')[0];
  const box = themesSetup_rect(event);
  expect(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)).toBe(event);
  for (const node of [...themesSetup_part('timeline-background'), ...themesSetup_part('timeline-background-event')]) {
    expect(getComputedStyle(node).pointerEvents).toBe('none');
  }
});

it.each(['light', 'dark'] as const)('uses existing background tokens in %s mode', async colorScheme => {
  await render(colorScheme);
  const root = themesSetup_part('timeline-root')[0]!;
  root.style.setProperty('--calendar-background', 'rgb(1, 2, 3)');
  root.style.setProperty('--calendar-background-event', 'rgb(4, 5, 6)');
  expect(getComputedStyle(themesSetup_part('timeline-background')[0]!).backgroundColor).toBe('rgb(1, 2, 3)');
  expect(getComputedStyle(themesSetup_part('timeline-background-event')[0]!).backgroundColor).toBe('rgb(4, 5, 6)');
});

it('hatches layers and background events with distinct system colors in forced-colors mode', async () => {
  await cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
  try {
    await render();
    const layer = getComputedStyle(themesSetup_part('timeline-background')[0]!);
    const event = getComputedStyle(themesSetup_part('timeline-background-event')[0]!);
    expect(layer.forcedColorAdjust).toBe('none');
    expect(event.forcedColorAdjust).toBe('none');
    expect(layer.backgroundImage).toContain('repeating-linear-gradient');
    expect(event.backgroundImage).toContain('repeating-linear-gradient');
    expect(event.backgroundImage).not.toBe(layer.backgroundImage);
  } finally {
    await cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'none' }] });
  }
});
