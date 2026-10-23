import { expect, it } from 'vitest';

import type { Calendar_TimeGridLayout } from '@calendar-tsx/core';
import {
  TimeGridView_Body,
  TimeGridView_Column,
  TimeGridView_ColumnHeader,
  TimeGridView_ColumnTrigger,
  TimeGridView_Event,
  TimeGridView_Header,
  TimeGridView_Root,
  useCalendarSelector,
} from '@calendar-tsx/react';
import type { ThemesSetup_EventData } from '#tests/themes.setup';
import '../../revenuecat.css';

import { themesSetup_part, themesSetup_render, themesSetup_timed } from '#tests/themes.setup';

const TimeGrid = () => {
  const grid = useCalendarSelector(state => state.layout) as Calendar_TimeGridLayout<ThemesSetup_EventData, null>;

  return (
    <TimeGridView_Root model={grid}>
      <TimeGridView_Header>
        {grid.columns.map(column => (
          <TimeGridView_ColumnHeader key={column.key} column={column}>
            Wed
            <TimeGridView_ColumnTrigger column={column} view='day'>
              {column.date.day}
            </TimeGridView_ColumnTrigger>
          </TimeGridView_ColumnHeader>
        ))}
      </TimeGridView_Header>
      <TimeGridView_Body model={grid}>
        {grid.columns.map(column => (
          <TimeGridView_Column key={column.key} column={column}>
            {column.segments.map(segment => (
              <TimeGridView_Event key={segment.key} segment={segment}>
                {segment.event.data.title}
              </TimeGridView_Event>
            ))}
          </TimeGridView_Column>
        ))}
      </TimeGridView_Body>
    </TimeGridView_Root>
  );
};

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

it.each([
  ['light', 'rgb(221, 226, 248)', 'rgb(31, 31, 71)'],
  ['dark', 'rgb(49, 56, 118)', 'rgb(242, 84, 91)'],
] as const)('tints events blue and keeps small red text off white in %s mode', async (colorScheme, event, header) => {
  await themesSetup_render(<TimeGrid />, { events, colorScheme });

  expect(style('time-grid-event', 'backgroundColor')).toBe(event);
  expect(style('time-grid-column-header', 'color')).toBe(header);
});
