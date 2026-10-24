import { expect, it } from 'vitest';

import type { Calendar_TimeGridLayout, Calendar_TimelineLayout, Calendar_Views } from '@calendar-tsx/core';
import { timelineView } from '@calendar-tsx/core';
import {
  TimeGridViewBody,
  TimeGridViewColumn,
  TimeGridViewColumnHeader,
  TimeGridViewColumnTrigger,
  TimeGridViewEvent,
  TimeGridViewHeader,
  TimeGridView,
  TimelineView,
  TimelineViewDayHeader,
  TimelineViewHeader,
  useCalendarSelector,
} from '@calendar-tsx/react';
import type { ThemesSetup_EventData } from '#tests/themes.setup';
import '../../revenuecat.css';

import { themesSetup_part, themesSetup_render, themesSetup_timed } from '#tests/themes.setup';

const TimeGrid = () => {
  const grid = useCalendarSelector(state => state.layout) as Calendar_TimeGridLayout<ThemesSetup_EventData, null>;

  return (
    <TimeGridView model={grid}>
      <TimeGridViewHeader>
        {grid.columns.map(column => (
          <TimeGridViewColumnHeader key={column.key} column={column}>
            Wed
            <TimeGridViewColumnTrigger column={column} view='day'>
              {column.date.day}
            </TimeGridViewColumnTrigger>
          </TimeGridViewColumnHeader>
        ))}
      </TimeGridViewHeader>
      <TimeGridViewBody model={grid}>
        {grid.columns.map(column => (
          <TimeGridViewColumn key={column.key} column={column}>
            {column.segments.map(segment => (
              <TimeGridViewEvent key={segment.key} segment={segment}>
                {segment.event.data.title}
              </TimeGridViewEvent>
            ))}
          </TimeGridViewColumn>
        ))}
      </TimeGridViewBody>
    </TimeGridView>
  );
};

const Timeline = () => {
  const timeline = useCalendarSelector(state => state.layout) as Calendar_TimelineLayout<ThemesSetup_EventData, null>;

  return (
    <TimelineView model={timeline}>
      <TimelineViewHeader>
        {timeline.days.map(day => (
          <TimelineViewDayHeader key={day.key} day={day}>
            Wed
          </TimelineViewDayHeader>
        ))}
      </TimelineViewHeader>
    </TimelineView>
  );
};

const timelineViews: Calendar_Views = { timeline: timelineView({ days: 1 }) };

const events = [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })];
const style = (part: string, property: 'backgroundColor' | 'color') => {
  const element = themesSetup_part(part)[0];

  return element && getComputedStyle(element)[property];
};

it('marks today with the exact brand red and black purple numbers', async () => {
  await themesSetup_render(<TimeGrid />, { events });

  expect(style('time-grid-column-trigger', 'backgroundColor')).toBe('rgb(242, 84, 91)');
  expect(style('time-grid-column-trigger', 'color')).toBe('rgb(31, 31, 71)');
});

/** The default theme's timed-event fill: the event color tinted 14% (light) or 26% (dark) into the surface. */
const tint = (color: string) => {
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.color = color;
  const resolved = getComputedStyle(probe).color;
  probe.remove();

  return resolved;
};

it.each([
  ['light', 'color-mix(in oklab, #576cdb 14%, #ffffff)', 'rgb(31, 31, 71)'],
  ['dark', 'color-mix(in oklab, #8b9bf0 26%, #1f1f47)', 'rgb(242, 84, 91)'],
] as const)('tints events blue and keeps small red text off white in %s mode', async (colorScheme, event, header) => {
  await themesSetup_render(<TimeGrid />, { events, colorScheme });

  expect(style('time-grid-event', 'backgroundColor')).toBe(tint(event));
  expect(style('time-grid-column-header', 'color')).toBe(header);
});

it.each([
  ['light', 'rgb(31, 31, 71)'],
  ['dark', 'rgb(242, 84, 91)'],
] as const)("keeps today's timeline day header off brand red on white in %s mode", async (colorScheme, header) => {
  await themesSetup_render(<Timeline />, { views: timelineViews, view: 'timeline', colorScheme });

  expect(style('timeline-day-header', 'color')).toBe(header);
});
