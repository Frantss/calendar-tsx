import { expect, it } from 'vitest';

import type { Calendar_DayGridLayout, Calendar_TimeGridLayout } from '@calendar-tsx/core';
import {
  DayGridView,
  DayGridViewDay,
  DayGridViewDayTrigger,
  DayGridViewHeader,
  DayGridViewHeaderCell,
  DayGridViewRow,
  DayGridViewRowEvent,
  DayGridViewSection,
  TimeGridView,
  TimeGridViewBody,
  TimeGridViewColumn,
  TimeGridViewColumnHeader,
  TimeGridViewColumnTrigger,
  TimeGridViewEvent,
  TimeGridViewHeader,
  TimeGridViewNowIndicator,
  useCalendarContext,
  useCalendarSelector,
} from '@calendar-tsx/react';
import type { ThemesSetup_EventData } from '#tests/themes.setup';
import '../../google-calendar.css';

import { themesSetup_allDay, themesSetup_part, themesSetup_rect, themesSetup_render, themesSetup_timed } from '#tests/themes.setup';

const Month = () => {
  const { instance: calendar } = useCalendarContext();
  const month = useCalendarSelector(state => state.layout) as Calendar_DayGridLayout<ThemesSetup_EventData>;

  return (
    <DayGridView model={month}>
      {month.sections.map(section => (
        <DayGridViewSection key={section.key} section={section}>
          <DayGridViewHeader>
            {section.columns.map(column => (
              <DayGridViewHeaderCell key={column.key} column={column}>
                {column.date.toLocaleString('en-US', { weekday: 'short' })}
              </DayGridViewHeaderCell>
            ))}
          </DayGridViewHeader>
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

const TimeGrid = () => {
  const { instance: calendar } = useCalendarContext();
  const grid = useCalendarSelector(state => state.layout) as Calendar_TimeGridLayout<ThemesSetup_EventData, null>;

  return (
    <TimeGridView model={grid}>
      <TimeGridViewHeader>
        {grid.columns.map(column => (
          <TimeGridViewColumnHeader key={column.key} column={column}>
            Wed
            <TimeGridViewColumnTrigger calendar={calendar} column={column} view='day'>
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
            <TimeGridViewNowIndicator column={column} />
          </TimeGridViewColumn>
        ))}
      </TimeGridViewBody>
    </TimeGridView>
  );
};

const events = [
  themesSetup_allDay('Conference', { start: '2026-03-11', end: '2026-03-13' }),
  themesSetup_timed('Yoga', { date: '2026-03-16', start: '09:00', end: '10:00' }),
];

const bar = (title: string) => themesSetup_part('day-grid-row-event').find(element => element.textContent === title);
const todayTrigger = () => themesSetup_part('day-grid-day', '[data-today]')[0]?.querySelector('[data-part="day-grid-day-trigger"]');

it.each([
  ['light', 'rgb(11, 87, 208)', 'rgb(255, 255, 255)'],
  ['dark', 'rgb(168, 199, 250)', 'rgb(6, 46, 111)'],
] as const)('marks today with a 24px circle in the primary blue in %s mode', async (colorScheme, fill, text) => {
  await themesSetup_render(<Month />, { view: 'month', colorScheme });
  const today = todayTrigger();
  const rect = themesSetup_rect(today ?? undefined);

  expect(today && getComputedStyle(today).backgroundColor).toBe(fill);
  expect(today && getComputedStyle(today).color).toBe(text);
  expect([rect.width, rect.height]).toEqual([24, 24]);
});

it('labels weekdays in small spaced capitals and leaves weekends unshaded', async () => {
  await themesSetup_render(<Month />, { view: 'month' });
  const label = themesSetup_part('day-grid-header-cell')[0];
  const sunday = themesSetup_part('day-grid-day', '[data-weekday="7"]:not([data-today])')[0];

  expect(label && getComputedStyle(label).textTransform).toBe('uppercase');
  expect(label && getComputedStyle(label).fontSize).toBe('11px');
  expect(label && getComputedStyle(label).color).toBe('rgb(68, 71, 70)');
  expect(sunday && getComputedStyle(sunday).backgroundColor).toBe('rgba(0, 0, 0, 0)');
});

it('fills bars in the event color and draws timed events in a month as a dot', async () => {
  await themesSetup_render(<Month />, { view: 'month', events });
  const conference = bar('Conference');
  const yoga = bar('Yoga');

  expect(conference && getComputedStyle(conference).backgroundColor).toBe('rgb(63, 81, 181)');
  expect(conference && getComputedStyle(conference).color).toBe('rgb(255, 255, 255)');
  expect(conference && getComputedStyle(conference).borderTopLeftRadius).toBe('6px');
  expect(yoga && getComputedStyle(yoga).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(yoga && getComputedStyle(yoga, '::before').backgroundColor).toBe('rgb(63, 81, 181)');
});

it('draws hour lines only, 40px apart, with a 12px dot on the now line', async () => {
  await themesSetup_render(<TimeGrid />, { events: [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })] });
  const column = themesSetup_part('time-grid-column')[0];
  const body = themesSetup_rect(themesSetup_part('time-grid-body')[0]);
  const now = themesSetup_part('time-grid-now')[0];
  const yoga = themesSetup_part('time-grid-event')[0];

  expect(body.height).toBe(24 * 40);
  expect(column && getComputedStyle(column).backgroundImage.match(/gradient\(/g)).toHaveLength(1);
  expect(now && getComputedStyle(now, '::before').width).toBe('12px');
  expect(now && getComputedStyle(now).borderBlockStartColor).toBe('rgb(219, 55, 45)');
  expect(yoga && getComputedStyle(yoga).backgroundColor).toBe('rgb(63, 81, 181)');
});

it("sets today's week-header number in a 46px circle", async () => {
  await themesSetup_render(<TimeGrid />, { view: 'week' });
  const header = themesSetup_part('time-grid-column-header', '[data-today]')[0];
  const trigger = header?.querySelector('[data-part="time-grid-column-trigger"]');

  expect(header && getComputedStyle(header).color).toBe('rgb(11, 87, 208)');
  expect(trigger && getComputedStyle(trigger).blockSize).toBe('46px');
  expect(trigger && getComputedStyle(trigger).backgroundColor).toBe('rgb(11, 87, 208)');
});
