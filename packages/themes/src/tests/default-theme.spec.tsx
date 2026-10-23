/// <reference types="@vitest/browser-playwright" />

import { expect, it } from 'vitest';
import { cdp } from 'vitest/browser';

import type { Calendar_ListLayout, Calendar_MonthLayout, Calendar_TimeGridLayout } from '@calendar-tsx/core';
import { listView } from '@calendar-tsx/core';
import {
  ListView,
  ListViewDay,
  ListViewDayHeader,
  ListViewEvent,
  MonthViewDay,
  MonthViewDayTrigger,
  MonthViewOverflow,
  MonthView,
  MonthViewWeek,
  MonthViewWeekEvent,
  TimeGridViewBody,
  TimeGridViewColumn,
  TimeGridViewColumnHeader,
  TimeGridViewEvent,
  TimeGridViewHeader,
  TimeGridViewNowIndicator,
  TimeGridView,
  useCalendarSelector,
} from '@calendar-tsx/react';
import type { ThemesSetup_EventData } from '#tests/themes.setup';
import '../../default.css';

import { themesSetup_allDay, themesSetup_part, themesSetup_rect, themesSetup_render, themesSetup_timed } from '#tests/themes.setup';

const TimeGrid = ({ eventClassName }: { eventClassName?: string }) => {
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
              <TimeGridViewEvent key={segment.key} segment={segment} className={eventClassName}>
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
  const month = useCalendarSelector(state => state.layout) as Calendar_MonthLayout<ThemesSetup_EventData>;

  return (
    <MonthView model={month}>
      {month.weeks.map(week => (
        <MonthViewWeek key={week.key} week={week}>
          {week.days.map(day => (
            <MonthViewDay key={day.key} day={day}>
              <MonthViewDayTrigger day={day} view='day'>
                {day.date.day}
              </MonthViewDayTrigger>
              <MonthViewOverflow day={day}>more</MonthViewOverflow>
            </MonthViewDay>
          ))}
          {week.segments.map(segment => (
            <MonthViewWeekEvent key={segment.key} segment={segment}>
              {segment.event.data.title}
            </MonthViewWeekEvent>
          ))}
        </MonthViewWeek>
      ))}
    </MonthView>
  );
};

const event = (title: string) => themesSetup_part('time-grid-event').find(element => element.textContent === title);

it('places a timed event at its fraction of the day', async () => {
  await themesSetup_render(<TimeGrid />, { events: [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })] });
  const column = themesSetup_rect(themesSetup_part('time-grid-column')[0]);
  const yoga = themesSetup_rect(event('Yoga'));

  expect(yoga.top - column.top).toBeCloseTo(column.height * 0.375, 0);
  expect(yoga.height).toBeCloseTo(column.height / 24, 0);
});

it('splits overlapping events into equal lanes', async () => {
  await themesSetup_render(<TimeGrid />, {
    events: [
      themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' }),
      themesSetup_timed('Pilates', { date: '2026-03-11', start: '09:30', end: '11:00' }),
    ],
  });
  const column = themesSetup_part('time-grid-column')[0];
  const pilates = themesSetup_rect(event('Pilates'));

  // lanes divide the column's padding box, inside its border
  expect(pilates.left - themesSetup_rect(column).left - (column?.clientLeft ?? 0)).toBeCloseTo((column?.clientWidth ?? 0) / 2, 0);
  expect(pilates.width).toBeCloseTo((column?.clientWidth ?? 0) / 2, 0);
});

it('lines column headers up with their columns', async () => {
  await themesSetup_render(<TimeGrid />, { view: 'week' });
  const headers = themesSetup_part('time-grid-column-header').map(header => themesSetup_rect(header).left);
  const columns = themesSetup_part('time-grid-column').map(column => themesSetup_rect(column).left);

  expect(headers).toHaveLength(7);
  expect(headers).toEqual(columns);
});

it('draws the now line at the clock time', async () => {
  await themesSetup_render(<TimeGrid />);
  const column = themesSetup_rect(themesSetup_part('time-grid-column')[0]);
  const now = themesSetup_rect(themesSetup_part('time-grid-now')[0]);

  expect(now.top - column.top).toBeCloseTo(column.height * ((10 + 40 / 60) / 24), 0);
});

it('spans a month bar across the days it covers', async () => {
  await themesSetup_render(<Month />, { view: 'month', events: [themesSetup_allDay('Fair', { start: '2026-03-10', end: '2026-03-12' })] });
  const first = themesSetup_rect(themesSetup_part('month-day', '[data-date="2026-03-10"]')[0]);
  const last = themesSetup_rect(themesSetup_part('month-day', '[data-date="2026-03-12"]')[0]);
  const bar = themesSetup_rect(themesSetup_part('month-week-event')[0]);

  expect(bar.left - first.left).toBeCloseTo(2, 0);
  expect(last.right - bar.right).toBeCloseTo(2, 0);
  expect(bar.top).toBeGreaterThanOrEqual(first.top);
});

it('keeps the overflow trigger below the visible bars', async () => {
  await themesSetup_render(<Month />, {
    view: 'month',
    events: ['A', 'B', 'C', 'D', 'E'].map(id => themesSetup_allDay(id, { start: '2026-03-11', end: '2026-03-11' })),
  });
  const bars = themesSetup_part('month-week-event').map(bar => themesSetup_rect(bar).bottom);
  const overflow = themesSetup_rect(themesSetup_part('month-overflow')[0]);

  expect(bars).toHaveLength(3);
  expect(overflow.top).toBeGreaterThanOrEqual(Math.max(...bars));
});

it.each([
  ['light', 'rgb(180, 68, 30)'],
  ['dark', 'rgb(240, 138, 93)'],
] as const)('marks today with the %s accent from color-scheme', async (colorScheme, accent) => {
  await themesSetup_render(<Month />, { view: 'month', colorScheme });
  const today = themesSetup_part('month-day', '[data-today]')[0]?.querySelector('[data-part="month-day-trigger"]');

  expect(today && getComputedStyle(today).backgroundColor).toBe(accent);
});

it('yields to unlayered consumer styles', async () => {
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = '.consumer-event { background: rgb(1, 2, 3); }';

  await themesSetup_render(<TimeGrid eventClassName='consumer-event' />, {
    events: [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })],
  });
  const yoga = event('Yoga');

  expect(yoga && getComputedStyle(yoga).backgroundColor).toBe('rgb(1, 2, 3)');
  style.remove();
});

it('resolves derived tokens below an override', async () => {
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = '.brand { --calendar-text: rgb(0, 128, 0); }';

  await themesSetup_render(<TimeGrid />, {
    className: 'brand',
    events: [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })],
  });
  const yoga = event('Yoga');

  expect(yoga && getComputedStyle(yoga).color).toBe('rgb(0, 128, 0)');
  style.remove();
});

it('restores the today marker with system colors in forced-colors mode', async () => {
  await cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
  await themesSetup_render(<Month />, { view: 'month' });
  const today = themesSetup_part('month-day', '[data-today]')[0]?.querySelector('[data-part="month-day-trigger"]');
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.cssText = 'forced-color-adjust: none; background: Highlight;';

  expect(matchMedia('(forced-colors: active)').matches).toBe(true);
  expect(today && getComputedStyle(today).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
  probe.remove();
  await cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'none' }] });
});

it.each([
  ['tints events from an accent set on an ancestor', 'accent', 'color-mix(in oklab, rgb(0, 0, 255) 16%, #ffffff)'],
  ['lets --calendar-event override the accent tint', 'accent fill', 'rgb(1, 2, 3)'],
] as const)('%s', async (_, className, expected) => {
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = '.accent { --calendar-accent: rgb(0, 0, 255); } .fill { --calendar-event: rgb(1, 2, 3); }';
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.color = expected;

  await themesSetup_render(<TimeGrid />, {
    className,
    events: [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })],
  });
  const yoga = event('Yoga');

  expect(yoga && getComputedStyle(yoga).backgroundColor).toBe(getComputedStyle(probe).color);
  probe.remove();
  style.remove();
});

it('leaves a gap between the day number and the first bar', async () => {
  await themesSetup_render(<Month />, { view: 'month', events: [themesSetup_allDay('Fair', { start: '2026-03-11', end: '2026-03-11' })] });
  const trigger = themesSetup_rect(
    themesSetup_part('month-day', '[data-date="2026-03-11"]')[0]?.querySelector('[data-part="month-day-trigger"]') ?? undefined,
  );
  const bar = themesSetup_rect(themesSetup_part('month-week-event')[0]);

  // 0.25rem at the default 16px root size
  expect(bar.top - trigger.bottom).toBeCloseTo(4, 0);
});

const List = () => {
  const list = useCalendarSelector(state => state.layout) as Calendar_ListLayout<ThemesSetup_EventData>;

  return (
    <ListView model={list}>
      {list.days.map(day => (
        <ListViewDay key={day.key} day={day}>
          <ListViewDayHeader day={day}>{day.key}</ListViewDayHeader>
          {day.events.map(event => (
            <ListViewEvent key={event.id} event={event}>
              {event.data.title}
            </ListViewEvent>
          ))}
        </ListViewDay>
      ))}
    </ListView>
  );
};

it('stacks list events as full-width rows under a muted day header', async () => {
  await themesSetup_render(<List />, {
    views: { list: listView({ days: 1 }) },
    view: 'list',
    events: ['Yoga', 'Swim'].map(id => themesSetup_timed(id, { date: '2026-03-11', start: '09:00', end: '10:00' })),
  });
  const header = themesSetup_part('list-day-header')[0];
  const [yoga, swim] = themesSetup_part('list-event').map(themesSetup_rect);
  const root = themesSetup_rect(themesSetup_part('list-root')[0]);

  expect(header && getComputedStyle(header).backgroundColor).toBe('rgb(245, 244, 241)');
  expect(swim?.top).toBeGreaterThanOrEqual(yoga?.bottom ?? Infinity);
  expect(yoga?.width).toBeCloseTo(root.width - 2, 0);
});
