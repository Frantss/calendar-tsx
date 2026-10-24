import { expect, it } from 'vitest';

import type { Calendar_TimeGridLayout } from '@calendar-tsx/core';
import {
  TimeGridViewBody,
  TimeGridViewColumn,
  TimeGridViewColumnHeader,
  TimeGridViewColumnTrigger,
  TimeGridViewEvent,
  TimeGridViewHeader,
  TimeGridView,
  useCalendarSelector,
} from '@calendar-tsx/react';
import type { ThemesSetup_EventData } from '#tests/themes.setup';
import '../../stripe.css';

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

const events = [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })];
const style = (part: string, property: 'backgroundColor' | 'color') => {
  const element = themesSetup_part(part)[0];

  return element && getComputedStyle(element)[property];
};

/** The default theme's timed-event fill: the event color tinted 14% (light) or 26% (dark) into the surface. */
const tint = (event: string, amount: number, surface: string) => {
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.color = `color-mix(in oklab, ${event} ${amount}%, ${surface})`;
  const color = getComputedStyle(probe).color;
  probe.remove();

  return color;
};

it.each([
  ['light', 'rgb(6, 27, 49)', 'rgb(255, 255, 255)', '#533afd', 14, '#ffffff'],
  ['dark', 'rgb(255, 255, 255)', 'rgb(13, 23, 56)', '#7389ff', 26, '#0d1738'],
] as const)('marks today in slate and tints events blurple in %s mode', async (colorScheme, accent, contrast, eventHex, amount, surfaceHex) => {
  await themesSetup_render(<TimeGrid />, { events, colorScheme });

  expect(style('time-grid-column-trigger', 'backgroundColor')).toBe(accent);
  expect(style('time-grid-column-trigger', 'color')).toBe(contrast);
  expect(style('time-grid-event', 'backgroundColor')).toBe(tint(eventHex, amount, surfaceHex));
});
