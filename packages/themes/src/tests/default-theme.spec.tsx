/// <reference types="@vitest/browser-playwright" />

import { expect, it } from 'vitest';
import { cdp } from 'vitest/browser';

import type {
  Calendar_BackgroundSegment,
  Calendar_DayBackground,
  Calendar_ListLayout,
  Calendar_MonthLayout,
  Calendar_TimeGridLayout,
} from '@calendar-tsx/core';
import { backgroundFeature, listView, monthView, timeGridView } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';
import {
  ListView,
  ListViewDay,
  ListViewDayHeader,
  ListViewEvent,
  MonthViewDay,
  MonthViewDayBackground,
  MonthViewDayTrigger,
  MonthViewOverflow,
  MonthView,
  MonthViewWeek,
  MonthViewWeekBackgroundEvent,
  MonthViewWeekEvent,
  TimeGridViewAllDay,
  TimeGridViewAllDayBackgroundEvent,
  TimeGridViewAllDayEvent,
  TimeGridViewBackground,
  TimeGridViewBackgroundEvent,
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

import {
  themesSetup_allDay,
  themesSetup_background,
  themesSetup_part,
  themesSetup_rect,
  themesSetup_render,
  themesSetup_timed,
} from '#tests/themes.setup';

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
      {grid.allDay && (
        <TimeGridViewAllDay>
          {grid.allDay.backgroundEvents.map(segment => (
            <TimeGridViewAllDayBackgroundEvent key={segment.key} segment={segment} />
          ))}
          {grid.allDay.segments.map(segment => (
            <TimeGridViewAllDayEvent key={segment.key} segment={segment}>
              {segment.event.data.title}
            </TimeGridViewAllDayEvent>
          ))}
        </TimeGridViewAllDay>
      )}
      <TimeGridViewBody model={grid}>
        {grid.columns.map(column => (
          <TimeGridViewColumn key={column.key} column={column}>
            {(column as { backgrounds?: Calendar_BackgroundSegment[] }).backgrounds?.map(background => (
              <TimeGridViewBackground key={background.key} background={background} />
            ))}
            {column.backgroundEvents.map(segment => (
              <TimeGridViewBackgroundEvent key={segment.key} segment={segment} />
            ))}
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
              {(day as { backgrounds?: Calendar_DayBackground[] }).backgrounds?.map(background => (
                <MonthViewDayBackground key={background.key} background={background} />
              ))}
              <MonthViewDayTrigger day={day} view='day'>
                {day.date.day}
              </MonthViewDayTrigger>
              <MonthViewOverflow day={day}>more</MonthViewOverflow>
            </MonthViewDay>
          ))}
          {week.backgroundEvents.map(segment => (
            <MonthViewWeekBackgroundEvent key={segment.key} segment={segment} />
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
  expect(yoga.height).toBeCloseTo(column.height / 24 - 4, 0);
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
  // less --calendar-event-gap, so neighbouring lanes do not touch
  expect(pilates.width).toBeCloseTo((column?.clientWidth ?? 0) / 2 - 4, 0);
  expect(pilates.left - themesSetup_rect(event('Yoga')).right).toBeCloseTo(4, 0);
});

it('cascades overlapping events with the later lane on top', async () => {
  await themesSetup_render(<TimeGrid />, {
    views: { day: timeGridView({ days: 1, overlap: 'cascade' }) },
    events: [
      themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' }),
      themesSetup_timed('Pilates', { date: '2026-03-11', start: '09:30', end: '11:00' }),
    ],
  });
  event('Pilates')?.scrollIntoView({ block: 'center' });
  const column = themesSetup_part('time-grid-column')[0];
  const yoga = themesSetup_rect(event('Yoga'));
  const pilates = themesSetup_rect(event('Pilates'));
  const at = (x: number, y: number) => document.elementFromPoint(x, y)?.textContent;

  // the earlier lane spans the column; the later one covers its right half where they overlap
  expect(yoga.width).toBeCloseTo((column?.clientWidth ?? 0) - 4, 0);
  expect(pilates.width).toBeCloseTo((column?.clientWidth ?? 0) / 2 - 4, 0);
  expect(at(pilates.left + pilates.width / 2, pilates.top + 4)).toBe('Pilates');
  expect(at(yoga.left + yoga.width / 4, pilates.top + 4)).toBe('Yoga');
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

const backgroundViews = {
  day: timeGridView({ days: 1, features: { backgroundFeature } }),
  month: monthView({ maxEventsPerDay: 3, features: { backgroundFeature } }),
};

it("shades a background layer's span across the column", async () => {
  await themesSetup_render(<TimeGrid />, {
    views: backgroundViews,
    backgrounds: [
      {
        id: 'lunch',
        kind: 'lunch',
        ranges: [
          {
            start: Temporal.ZonedDateTime.from('2026-03-11T12:00[America/New_York]'),
            end: Temporal.ZonedDateTime.from('2026-03-11T13:00[America/New_York]'),
          },
        ],
      },
    ],
  });
  const column = themesSetup_part('time-grid-column')[0];
  const lunch = themesSetup_rect(themesSetup_part('time-grid-background')[0]);

  expect(lunch.top - themesSetup_rect(column).top).toBeCloseTo(themesSetup_rect(column).height / 2, 0);
  expect(lunch.height).toBeCloseTo(themesSetup_rect(column).height / 24, 0);
  expect(lunch.width).toBeCloseTo(column?.clientWidth ?? 0, 0);
});

it('fills a month day beneath its day number', async () => {
  await themesSetup_render(<Month />, {
    views: backgroundViews,
    view: 'month',
    backgrounds: [{ id: 'holiday', kind: 'holiday', ranges: [{ allDay: true, start: Temporal.PlainDate.from('2026-03-11') }] }],
  });
  const day = themesSetup_part('month-day', '[data-date="2026-03-11"]')[0];
  const background = themesSetup_rect(themesSetup_part('month-day-background')[0]);
  const trigger = day?.querySelector<HTMLElement>('[data-part="month-day-trigger"]');
  const center = themesSetup_rect(trigger ?? undefined);

  expect(background).toEqual(themesSetup_rect(day));
  expect(document.elementFromPoint(center.x + center.width / 2, center.y + center.height / 2)).toBe(trigger);
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

it('scrolls a long list once its height is limited', async () => {
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = '[data-part="list-root"] { max-block-size: 6rem; }';

  await themesSetup_render(<List />, {
    views: { list: listView({ days: 7 }) },
    view: 'list',
    events: ['08', '09', '10', '11', '12'].map(day => themesSetup_timed(`Day ${day}`, { date: `2026-03-${day}`, start: '09:00', end: '10:00' })),
  });
  const root = themesSetup_part('list-root')[0];

  // `hidden` also clips and can be scrolled from script, but not by the user
  expect(root && root.scrollHeight).toBeGreaterThan(root?.clientHeight ?? Infinity);
  expect(root && getComputedStyle(root).overflowY).toBe('auto');
  style.remove();
});

it('shades a timed background event under the events it overlaps', async () => {
  await themesSetup_render(<TimeGrid />, {
    events: [
      themesSetup_timed('Yoga', { date: '2026-03-11', start: '12:00', end: '13:00' }),
      themesSetup_background(themesSetup_timed('Closed', { date: '2026-03-11', start: '12:00', end: '18:00' })),
    ],
  });
  event('Yoga')?.scrollIntoView({ block: 'center' });
  const column = themesSetup_rect(themesSetup_part('time-grid-column')[0]);
  const shade = themesSetup_rect(themesSetup_part('time-grid-background-event')[0]);
  const yoga = themesSetup_rect(event('Yoga'));

  expect(shade.top - column.top).toBeCloseTo(column.height * 0.5, 0);
  expect(shade.height).toBeCloseTo(column.height * 0.25, 0);
  expect(document.elementFromPoint(yoga.left + yoga.width / 2, yoga.top + yoga.height / 2)?.textContent).toBe('Yoga');
});

it('spans an all-day background event over every bar row of the all-day section', async () => {
  await themesSetup_render(<TimeGrid />, {
    view: 'week',
    events: [
      ...['A', 'B'].map(id => themesSetup_allDay(id, { start: '2026-03-11', end: '2026-03-11' })),
      themesSetup_background(themesSetup_allDay('Break', { start: '2026-03-11', end: '2026-03-12' })),
    ],
  });
  const shade = themesSetup_rect(themesSetup_part('time-grid-all-day-background-event')[0]);
  const bars = themesSetup_part('time-grid-all-day-event').map(bar => themesSetup_rect(bar));
  const headers = themesSetup_part('time-grid-column-header').map(header => themesSetup_rect(header));

  expect(shade.left).toBeCloseTo(headers[3]?.left ?? 0, 0);
  expect(shade.right).toBeCloseTo(headers[4]?.right ?? 0, 0);
  expect(shade.top).toBeLessThanOrEqual(Math.min(...bars.map(bar => bar.top)));
  expect(shade.bottom).toBeGreaterThanOrEqual(Math.max(...bars.map(bar => bar.bottom)));
});

it('tints month days under an all-day background event and keeps their triggers clickable', async () => {
  await themesSetup_render(<Month />, {
    view: 'month',
    events: [themesSetup_background(themesSetup_allDay('Break', { start: '2026-03-10', end: '2026-03-12' }))],
  });
  const first = themesSetup_rect(themesSetup_part('month-day', '[data-date="2026-03-10"]')[0]);
  const last = themesSetup_rect(themesSetup_part('month-day', '[data-date="2026-03-12"]')[0]);
  const shade = themesSetup_rect(themesSetup_part('month-week-background-event')[0]);
  const trigger = themesSetup_part('month-day', '[data-date="2026-03-11"]')[0]?.querySelector('[data-part="month-day-trigger"]');
  const target = themesSetup_rect(trigger ?? undefined);

  expect(shade.left).toBeCloseTo(first.left, 0);
  expect(shade.right).toBeCloseTo(last.right, 0);
  expect(shade.height).toBeCloseTo(first.height, 0);
  expect(document.elementFromPoint(target.left + target.width / 2, target.top + target.height / 2)).toBe(trigger);
});
