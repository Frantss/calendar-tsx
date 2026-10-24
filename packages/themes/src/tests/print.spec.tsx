/// <reference types="@vitest/browser-playwright" />

import { afterEach, expect, it } from 'vitest';
import { cdp } from 'vitest/browser';

import type { Calendar_DayGridLayout, Calendar_TimeGridLayout } from '@calendar-tsx/core';
import {
  DayGridView,
  DayGridViewDay,
  DayGridViewDayTrigger,
  DayGridViewRow,
  DayGridViewRowEvent,
  DayGridViewSection,
  TimeGridView,
  TimeGridViewBody,
  TimeGridViewColumn,
  TimeGridViewColumnHeader,
  TimeGridViewEvent,
  TimeGridViewHeader,
  TimeGridViewNowIndicator,
  useCalendarContext,
  useCalendarSelector,
} from '@calendar-tsx/react';
import type { ThemesSetup_EventData } from '#tests/themes.setup';
import '../../default.css';
import '../../print.css';

import { themesSetup_allDay, themesSetup_part, themesSetup_render, themesSetup_timed } from '#tests/themes.setup';

const TimeGrid = () => {
  const grid = useCalendarSelector(state => state.layout) as Calendar_TimeGridLayout<ThemesSetup_EventData, null>;

  return (
    <TimeGridView model={grid}>
      <TimeGridViewHeader>
        {grid.columns.map(column => (
          <TimeGridViewColumnHeader key={column.key} column={column}>
            {column.date.day}
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
            <TimeGridViewNowIndicator column={column} />
          </TimeGridViewColumn>
        ))}
      </TimeGridViewBody>
    </TimeGridView>
  );
};

const Month = () => {
  const { instance: calendar } = useCalendarContext();
  const month = useCalendarSelector(state => state.layout) as Calendar_DayGridLayout<ThemesSetup_EventData>;

  return (
    <DayGridView model={month}>
      {month.sections.map(section => (
        <DayGridViewSection key={section.key} section={section}>
          {section.rows.map(week => (
            <DayGridViewRow key={week.key} row={week}>
              {week.days.map(day => (
                <DayGridViewDay key={day.key} day={day}>
                  <DayGridViewDayTrigger calendar={calendar} day={day} view='day'>
                    {day.date.day}
                  </DayGridViewDayTrigger>
                </DayGridViewDay>
              ))}
              {week.segments.map(segment => (
                <DayGridViewRowEvent key={segment.key} segment={segment}>
                  {segment.event.data.title}
                </DayGridViewRowEvent>
              ))}
            </DayGridViewRow>
          ))}
        </DayGridViewSection>
      ))}
    </DayGridView>
  );
};

const emulatePrint = (print: boolean) => cdp().send('Emulation.setEmulatedMedia', { media: print ? 'print' : '' });

afterEach(() => emulatePrint(false));

const conference = [themesSetup_allDay('Conference', { start: '2026-03-11', end: '2026-03-13' })];

it('leaves the screen theme alone', async () => {
  await themesSetup_render(<Month />, { view: 'month', events: conference });
  const bar = themesSetup_part('day-grid-row-event')[0];

  expect(bar && getComputedStyle(bar).backgroundColor).toBe('rgb(47, 99, 214)');
});

it.each(['light', 'dark'] as const)('outlines solid bars in the event color on paper in %s mode', async colorScheme => {
  await emulatePrint(true);
  await themesSetup_render(<Month />, { view: 'month', events: conference, colorScheme });
  const bar = themesSetup_part('day-grid-row-event')[0];
  const style = bar && getComputedStyle(bar);

  expect(matchMedia('print').matches).toBe(true);
  expect(style?.backgroundColor).toBe('rgb(255, 255, 255)');
  expect(style?.borderBlockStartColor).toBe('rgb(47, 99, 214)');
  expect(style?.color).toBe('rgb(0, 0, 0)');
});

it('marks today with an outline rather than a fill', async () => {
  await emulatePrint(true);
  await themesSetup_render(<Month />, { view: 'month', colorScheme: 'dark' });
  const today = themesSetup_part('day-grid-day', '[data-today]')[0]?.querySelector('[data-part="day-grid-day-trigger"]');
  const style = today && getComputedStyle(today);

  expect(style?.backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(style?.outline).toBe('rgb(0, 0, 0) solid 2px');
  expect(style?.color).toBe('rgb(0, 0, 0)');
});

it('prints the whole time grid without the now line', async () => {
  await emulatePrint(true);
  await themesSetup_render(<TimeGrid />, { events: [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })] });
  const root = themesSetup_part('time-grid-root')[0];
  const header = themesSetup_part('time-grid-header')[0];
  const now = themesSetup_part('time-grid-now')[0];
  const yoga = themesSetup_part('time-grid-event')[0];

  expect(root && getComputedStyle(root).overflow).toBe('clip');
  expect(root && getComputedStyle(root).maxBlockSize).toBe('none');
  expect(header && getComputedStyle(header).position).toBe('static');
  expect(now && getComputedStyle(now).display).toBe('none');
  expect(yoga && getComputedStyle(yoga).breakInside).toBe('avoid');
  // slot and hour lines are background gradients on the column, which a print drops unless told otherwise
  expect(getComputedStyle(themesSetup_part('time-grid-column')[0]!).printColorAdjust).toBe('exact');
});

it('keeps month weeks whole across pages', async () => {
  await emulatePrint(true);
  await themesSetup_render(<Month />, { view: 'month' });
  const row = themesSetup_part('day-grid-row')[0];

  expect(row && getComputedStyle(row).breakInside).toBe('avoid');
});
