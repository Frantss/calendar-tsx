/// <reference types="@vitest/browser-playwright" />

import { expect, it } from 'vitest';
import { cdp, page } from 'vitest/browser';

import type {
  Calendar_BackgroundSegment,
  Calendar_DayBackground,
  Calendar_ListLayout,
  Calendar_DayGridLayout,
  Calendar_TimeGridLayout,
} from '@calendar-tsx/core';
import { listView, dayGridView, timeGridView } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';
import {
  ListView,
  ListViewDay,
  ListViewDayHeader,
  ListViewEvent,
  ListViewSection,
  ListViewSectionHeader,
  DayGridViewDay,
  DayGridViewDayBackground,
  DayGridViewDayTrigger,
  DayGridViewOverflow,
  DayGridView,
  DayGridViewRow,
  DayGridViewRowBackgroundEvent,
  DayGridViewRowEvent,
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
  useCalendarContext,
  DayGridViewSection,
  DayGridViewSectionHeader,
  DayGridViewHeader,
  DayGridViewHeaderCell,
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
  const { instance: calendar } = useCalendarContext();
  const month = useCalendarSelector(state => state.layout) as Calendar_DayGridLayout<ThemesSetup_EventData>;

  return (
    <DayGridView model={month}>
      {month.sections.map(section => (
        <DayGridViewSection key={section.key} section={section}>
          {section.month && (
            <>
              <DayGridViewSectionHeader>{section.month.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</DayGridViewSectionHeader>
              <DayGridViewHeader>
                {section.columns.map(column => (
                  <DayGridViewHeaderCell key={column.key} column={column}>
                    {column.date.toLocaleString('en-US', { weekday: 'short' })}
                  </DayGridViewHeaderCell>
                ))}
              </DayGridViewHeader>
            </>
          )}
          {section.rows.map(week => (
            <DayGridViewRow key={week.key} row={week}>
              {week.days.map(day => (
                <DayGridViewDay key={day.key} day={day}>
                  {(day as { backgrounds?: Calendar_DayBackground[] }).backgrounds?.map(background => (
                    <DayGridViewDayBackground key={background.key} background={background} />
                  ))}
                  <DayGridViewDayTrigger calendar={calendar} day={day} view='day'>
                    {day.date.day}
                  </DayGridViewDayTrigger>
                  <DayGridViewOverflow day={day}>more</DayGridViewOverflow>
                </DayGridViewDay>
              ))}
              {week.backgroundEvents.map(segment => (
                <DayGridViewRowBackgroundEvent key={segment.key} segment={segment} />
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

const event = (title: string) => themesSetup_part('time-grid-event').find(element => element.textContent === title);

it('honors minimum column widths and keeps scrolling time-grid sections aligned', async () => {
  await themesSetup_render(<TimeGrid />, {
    view: 'week',
    views: { week: timeGridView({ days: 7, minColumnWidth: '480px' }) },
    events: [themesSetup_allDay('Conference', { start: '2026-03-11', end: '2026-03-13' })],
  });
  const root = themesSetup_part('time-grid-root')[0];
  const columns = themesSetup_part('time-grid-column').map(themesSetup_rect);
  const headers = themesSetup_part('time-grid-column-header').map(themesSetup_rect);
  const bar = themesSetup_rect(themesSetup_part('time-grid-all-day-event')[0]);

  expect(columns).toHaveLength(7);
  expect(headers).toHaveLength(7);
  for (const [index, column] of columns.entries()) {
    expect(column.width).toBeGreaterThanOrEqual(480);
    expect(headers[index].left).toBeCloseTo(column.left, 0);
    expect(headers[index].width).toBeCloseTo(column.width, 0);
  }
  expect(bar.left).toBeCloseTo(columns[3].left + 2, 0);
  expect(bar.right).toBeCloseTo(columns[5].right - 2, 0);
  expect(root.scrollWidth).toBeGreaterThan(root.clientWidth);
  root.scrollLeft = 100;
  expect(root.scrollLeft).toBe(100);
});

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

it('draws a brief event at the minimum length with its content on one line', async () => {
  await themesSetup_render(<TimeGrid />, {
    events: [themesSetup_timed('Call', { date: '2026-03-11', start: '09:00', end: '09:05' })],
  });
  const column = themesSetup_rect(themesSetup_part('time-grid-column')[0]);
  const call = event('Call');

  // 15 minutes of the day, less --calendar-event-gap
  expect(themesSetup_rect(call).height).toBeCloseTo(column.height / 96 - 4, 0);
  expect(call && getComputedStyle(call).flexDirection).toBe('row');
});

it('covers the label of an event too short for a line, and keeps it on one that fits', async () => {
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = '.dense { --calendar-slot-height: 2rem; }';

  await themesSetup_render(<TimeGrid />, {
    className: 'dense',
    views: { day: timeGridView({ days: 1, slotMinutes: 60 }) },
    events: [
      themesSetup_timed('Call', { date: '2026-03-11', start: '09:00', end: '09:05' }),
      themesSetup_timed('Yoga', { date: '2026-03-11', start: '11:00', end: '12:00' }),
    ],
  });
  const cover = (title: string) => {
    const element = event(title);
    return element && getComputedStyle(element, '::after');
  };

  // half of a 2rem hour, less --calendar-event-gap
  expect(themesSetup_rect(event('Call')).height).toBeCloseTo(12, 0);
  expect(cover('Call')?.content).not.toBe('none');
  expect(cover('Call')?.backgroundColor).toBe(event('Call') && getComputedStyle(event('Call')!).backgroundColor);
  expect(cover('Yoga')?.content).toBe('none');
  style.remove();
});

it('keeps the axis track when the grid has no columns', async () => {
  // grouped by resource with no resources
  await themesSetup_render(<TimeGrid />, { views: { day: timeGridView({ days: 1, groupBy: 'resource' }) }, resources: [] });
  const root = themesSetup_part('time-grid-root')[0];
  const tracks = root ? getComputedStyle(root).gridTemplateColumns.split(' ') : [];

  expect(themesSetup_part('time-grid-column')).toHaveLength(0);
  expect(tracks).toHaveLength(2);
  expect(tracks[0]).toBe('64px');
});

it('shows a one-day grid whose only date is a hidden weekday', async () => {
  // 2026-03-11 is a Wednesday
  await themesSetup_render(<TimeGrid />, { views: { day: timeGridView({ days: 1, hiddenDays: [3] }) } });

  expect(themesSetup_part('time-grid-column').map(column => column.dataset['weekday'])).toEqual(['3']);
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
  const first = themesSetup_rect(themesSetup_part('day-grid-day', '[data-date="2026-03-10"]')[0]);
  const last = themesSetup_rect(themesSetup_part('day-grid-day', '[data-date="2026-03-12"]')[0]);
  const bar = themesSetup_rect(themesSetup_part('day-grid-row-event')[0]);

  expect(bar.left - first.left).toBeCloseTo(2, 0);
  expect(last.right - bar.right).toBeCloseTo(2, 0);
  expect(bar.top).toBeGreaterThanOrEqual(first.top);
});

it('uses the visible column count for N-day event and background geometry', async () => {
  await themesSetup_render(<Month />, {
    views: { month: dayGridView({ days: 3, maxEventsPerDay: 3 }), day: timeGridView({ days: 1 }) },
    view: 'month',
    events: [
      themesSetup_allDay('Fair', { start: '2026-03-11', end: '2026-03-12' }),
      themesSetup_background(themesSetup_allDay('Holiday', { start: '2026-03-11', end: '2026-03-12' })),
    ],
  });
  const cells = themesSetup_part('day-grid-day').map(themesSetup_rect);
  const bar = themesSetup_rect(themesSetup_part('day-grid-row-event')[0]);
  const background = themesSetup_rect(themesSetup_part('day-grid-row-background-event')[0]);
  expect(cells).toHaveLength(3);
  expect(bar.left - cells[0]!.left).toBeCloseTo(2, 0);
  expect(cells[1]!.right - bar.right).toBeCloseTo(2, 0);
  expect(background.left).toBeCloseTo(cells[0]!.left, 0);
  expect(background.right).toBeCloseTo(cells[1]!.right, 0);
});

it('aligns compact month panels and their week rows in a responsive year grid', async () => {
  await themesSetup_render(
    <div style={{ inlineSize: 1000 }}>
      <Month />
    </div>,
    {
      views: { year: dayGridView({ period: 'year', groupBy: 'month', fixedWeekCount: true, maxEventsPerDay: 3 }) },
      view: 'year',
      events: ['One', 'Two', 'Three'].map(id => themesSetup_allDay(id, { start: '2026-01-06', end: '2026-01-07' })),
    },
  );
  const root = themesSetup_part('day-grid-root')[0]!;
  const sections = themesSetup_part('day-grid-section');
  expect(root.hasAttribute('data-multi-month')).toBe(true);
  expect(sections).toHaveLength(12);
  const january = sections[0]!;
  const february = sections[1]!;
  expect(themesSetup_rect(january).top).toBeCloseTo(themesSetup_rect(february).top, 0);
  expect(themesSetup_rect(february).left).toBeGreaterThan(themesSetup_rect(january).right);
  const januaryRows = [...january.querySelectorAll('[data-part="day-grid-row"]')].map(themesSetup_rect);
  const februaryRows = [...february.querySelectorAll('[data-part="day-grid-row"]')].map(themesSetup_rect);
  expect(januaryRows).toHaveLength(6);
  expect(februaryRows).toHaveLength(6);
  januaryRows.forEach((row, index) => {
    expect(row.top).toBeCloseTo(februaryRows[index]!.top, 0);
    expect(row.bottom).toBeCloseTo(februaryRows[index]!.bottom, 0);
  });
  expect(januaryRows[2]!.height).toBeLessThan(96);
  root.parentElement!.style.inlineSize = '320px';
  expect(themesSetup_rect(february).top).toBeGreaterThan(themesSetup_rect(january).bottom);
  expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
});

it('keeps the overflow trigger below the visible bars', async () => {
  await themesSetup_render(<Month />, {
    view: 'month',
    events: ['A', 'B', 'C', 'D', 'E'].map(id => themesSetup_allDay(id, { start: '2026-03-11', end: '2026-03-11' })),
  });
  const bars = themesSetup_part('day-grid-row-event').map(bar => themesSetup_rect(bar).bottom);
  const overflow = themesSetup_rect(themesSetup_part('day-grid-overflow')[0]);

  expect(bars).toHaveLength(3);
  expect(overflow.top).toBeGreaterThanOrEqual(Math.max(...bars));
});

it.each([
  ['light', 'rgb(24, 24, 27)'],
  ['dark', 'rgb(241, 241, 243)'],
] as const)('marks today with the %s accent from color-scheme', async (colorScheme, accent) => {
  await themesSetup_render(<Month />, { view: 'month', colorScheme });
  const today = themesSetup_part('day-grid-day', '[data-today]')[0]?.querySelector('[data-part="day-grid-day-trigger"]');

  expect(today && getComputedStyle(today).backgroundColor).toBe(accent);
});

it("rings today's marker on hover and keeps its fill", async () => {
  await themesSetup_render(<Month />, { view: 'month' });
  const today = themesSetup_part('day-grid-day', '[data-today]')[0]?.querySelector('[data-part="day-grid-day-trigger"]');
  if (!today) throw new Error('no today marker');
  await page.elementLocator(today).hover();
  const { backgroundColor, color, boxShadow } = getComputedStyle(today);
  await page.elementLocator(today).unhover();

  expect(backgroundColor).toBe('rgb(24, 24, 27)');
  expect(color).toBe('rgb(255, 255, 255)');
  expect(boxShadow).toMatch(/ 0px 0px 0px 3px$/);
});

it('mutes days outside the month without a fill, so they read apart from weekends', async () => {
  await themesSetup_render(<Month />, { view: 'month' });
  const outside = themesSetup_part('day-grid-day', '[data-outside]').find(day => !['6', '7'].includes(day.dataset.weekday ?? ''));

  expect(outside && getComputedStyle(outside).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(outside && getComputedStyle(outside).color).toBe('rgb(91, 91, 99)');
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

it.each([
  ['derives the header line from a border set below the root', '', 'color-mix(in oklab, rgb(0, 0, 255), #18181b 15%)'],
  ['lets --calendar-border-strong set the header line', '--calendar-border-strong: rgb(1, 2, 3);', 'rgb(1, 2, 3)'],
] as const)('%s', async (_, strong, line) => {
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = `.brand { --calendar-border: rgb(0, 0, 255); ${strong} }`;
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.color = line;

  await themesSetup_render(<TimeGrid />, { className: 'brand' });
  const header = themesSetup_part('time-grid-header')[0];

  expect(header && getComputedStyle(header).borderBlockEndColor).toBe(getComputedStyle(probe).color);
  probe.remove();
  style.remove();
});

it('restores the today marker with system colors in forced-colors mode', async () => {
  await cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
  await themesSetup_render(<Month />, { view: 'month' });
  const today = themesSetup_part('day-grid-day', '[data-today]')[0]?.querySelector('[data-part="day-grid-day-trigger"]');
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.cssText = 'forced-color-adjust: none; background: Highlight;';

  expect(matchMedia('(forced-colors: active)').matches).toBe(true);
  expect(today && getComputedStyle(today).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
  probe.remove();
  await cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'none' }] });
});

it.each([
  ['tints events from an event color set on an ancestor', 'events', 'light', 'color-mix(in oklab, rgb(0, 0, 255) 14%, #ffffff)'],
  ['tints events more deeply on a dark surface', 'events', 'dark', 'color-mix(in oklab, rgb(0, 0, 255) 26%, #161618)'],
  ['keeps events apart from an accent set on an ancestor', 'accent', 'light', 'color-mix(in oklab, #2f63d6 14%, #ffffff)'],
  ['lets --calendar-event override the tint', 'events fill', 'light', 'rgb(1, 2, 3)'],
] as const)('%s', async (_, className, colorScheme, expected) => {
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = `
    .events { --calendar-event-color: rgb(0, 0, 255); }
    .accent { --calendar-accent: rgb(0, 0, 255); }
    .fill { --calendar-event: rgb(1, 2, 3); }
  `;
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.color = expected;

  await themesSetup_render(<TimeGrid />, {
    className,
    colorScheme,
    events: [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })],
  });
  const yoga = event('Yoga');

  expect(yoga && getComputedStyle(yoga).backgroundColor).toBe(getComputedStyle(probe).color);
  probe.remove();
  style.remove();
});

it('draws timed events with a stripe in the event color', async () => {
  await themesSetup_render(<TimeGrid />, { events: [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })] });
  const yoga = event('Yoga');

  expect(yoga && getComputedStyle(yoga).borderInlineStartWidth).toBe('3px');
  expect(yoga && getComputedStyle(yoga).borderInlineStartColor).toBe('rgb(47, 99, 214)');
});

it('draws all-day and multi-day bars solid, and timed single-day bars tinted', async () => {
  await themesSetup_render(<Month />, {
    view: 'month',
    events: [
      themesSetup_allDay('Fair', { start: '2026-03-11', end: '2026-03-11' }),
      themesSetup_timed('Deploy', { date: '2026-03-12', start: '22:00', end: '02:00', endDate: '2026-03-13' }),
      themesSetup_timed('Yoga', { date: '2026-03-10', start: '09:00', end: '10:00' }),
    ],
  });
  const bar = (title: string) => themesSetup_part('day-grid-row-event').find(element => element.textContent === title)!;
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.color = 'color-mix(in oklab, #2f63d6 14%, #ffffff)';

  for (const title of ['Fair', 'Deploy']) {
    expect(getComputedStyle(bar(title)).backgroundColor).toBe('rgb(47, 99, 214)');
    expect(getComputedStyle(bar(title)).color).toBe('rgb(255, 255, 255)');
  }
  expect(getComputedStyle(bar('Yoga')).backgroundColor).toBe(getComputedStyle(probe).color);
  expect(getComputedStyle(bar('Yoga')).color).toBe('rgb(24, 24, 27)');
  probe.remove();
});

it('drops the stripe where a bar continues from an earlier week', async () => {
  await themesSetup_render(<Month />, { view: 'month', events: [themesSetup_allDay('Fair', { start: '2026-03-06', end: '2026-03-09' })] });
  const [first, second] = themesSetup_part('day-grid-row-event');

  expect(first && getComputedStyle(first).borderInlineStartWidth).toBe('3px');
  expect(second && getComputedStyle(second).borderInlineStartWidth).toBe('1px');
});

it("shades weekends and leaves today's column unshaded", async () => {
  await themesSetup_render(<TimeGrid />, { view: 'week' });
  const columns = themesSetup_part('time-grid-column');
  const probe = (color: string) => {
    const element = document.body.appendChild(document.createElement('div'));
    element.style.color = color;
    const resolved = getComputedStyle(element).color;
    element.remove();

    return resolved;
  };
  const background = (index: number) => columns[index] && getComputedStyle(columns[index]).backgroundColor;

  expect(background(0)).toBe(probe('color-mix(in oklab, #18181b 3%, transparent)'));
  expect(background(6)).toBe(probe('color-mix(in oklab, #18181b 3%, transparent)'));
  expect(background(1)).toBe('rgba(0, 0, 0, 0)');
  expect(background(3)).toBe('rgba(0, 0, 0, 0)');
});

/** Measures the slot and hour line spacing the column resolves, as a child laid out from the same lengths. */
const lineGeometry = (column: HTMLElement | undefined) => {
  const probe = column?.appendChild(document.createElement('div'));
  probe?.setAttribute('style', 'position: absolute; inset-block-start: var(--_calendar-hour-start); block-size: var(--_calendar-hour);');
  const rect = themesSetup_rect(probe);
  const top = themesSetup_rect(column).top + (column?.clientTop ?? 0);
  probe?.remove();

  return { hourStart: rect.top - top, hour: rect.height };
};

it.each([
  ['a full day', undefined, 24, 0],
  ['a window starting off the hour', { startMinutes: 8 * 60 + 30, endMinutes: 18 * 60 }, 9.5, 0.5],
] as const)('draws hour lines over half-hour slots across %s', async (_, timeWindow, hours, offset) => {
  await themesSetup_render(<TimeGrid />, { views: { day: timeGridView({ days: 1, timeWindow }) } });
  const column = themesSetup_part('time-grid-column')[0];
  const height = column?.clientHeight ?? 0;
  const { hourStart, hour } = lineGeometry(column);

  expect(column && getComputedStyle(column).backgroundImage.match(/repeating-linear-gradient/g)).toHaveLength(2);
  expect(hour).toBeCloseTo(height / hours, 0);
  expect(hourStart).toBeCloseTo((height / hours) * offset, 0);
});

it('draws the now line and background events in their own colors', async () => {
  await themesSetup_render(<TimeGrid />, {
    events: [themesSetup_background(themesSetup_timed('Closed', { date: '2026-03-11', start: '12:00', end: '18:00' }))],
  });
  const now = themesSetup_part('time-grid-now')[0];
  const shade = themesSetup_part('time-grid-background-event')[0];

  expect(now && getComputedStyle(now).borderTopColor).toBe('rgb(212, 50, 31)');
  expect(shade && getComputedStyle(shade).boxShadow).toBe('rgb(26, 138, 110) 0px 2px 0px 0px inset');
});

it('leaves a gap between the day number and the first bar', async () => {
  await themesSetup_render(<Month />, { view: 'month', events: [themesSetup_allDay('Fair', { start: '2026-03-11', end: '2026-03-11' })] });
  const trigger = themesSetup_rect(
    themesSetup_part('day-grid-day', '[data-date="2026-03-11"]')[0]?.querySelector('[data-part="day-grid-day-trigger"]') ?? undefined,
  );
  const bar = themesSetup_rect(themesSetup_part('day-grid-row-event')[0]);

  // 0.25rem at the default 16px root size
  expect(bar.top - trigger.bottom).toBeCloseTo(4, 0);
});

const backgroundViews = {
  day: timeGridView({ days: 1 }),
  month: dayGridView({ period: 'month', maxEventsPerDay: 3 }),
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
  const day = themesSetup_part('day-grid-day', '[data-date="2026-03-11"]')[0];
  const background = themesSetup_rect(themesSetup_part('day-grid-day-background')[0]);
  const trigger = day?.querySelector<HTMLElement>('[data-part="day-grid-day-trigger"]');
  const center = themesSetup_rect(trigger ?? undefined);

  expect(background).toEqual(themesSetup_rect(day));
  expect(document.elementFromPoint(center.x + center.width / 2, center.y + center.height / 2)).toBe(trigger);
});

const List = () => {
  const list = useCalendarSelector(state => state.layout) as Calendar_ListLayout<ThemesSetup_EventData>;

  return (
    <ListView model={list}>
      {list.sections.map(section => (
        <ListViewSection key={section.key} section={section}>
          {(section.resource || section.date) && (
            <ListViewSectionHeader section={section}>{section.resource?.title ?? section.date?.toString()}</ListViewSectionHeader>
          )}
          {section.days.map(day => (
            <ListViewDay key={day.key} day={day}>
              <ListViewDayHeader day={day} aria-label={section.date ? day.resource?.title : day.date.toLocaleString('en-US', { dateStyle: 'full' })}>
                {section.date ? (
                  day.resource?.title
                ) : (
                  <time dateTime={day.key}>
                    <strong>{day.date.day}</strong>{' '}
                    <span>
                      <span>{day.date.toLocaleString('en-US', { weekday: 'short' })}</span>{' '}
                      <span>{day.date.toLocaleString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </span>
                  </time>
                )}
              </ListViewDayHeader>
              {day.events.map(event => (
                <ListViewEvent key={event.id} event={event}>
                  {event.data.title}
                </ListViewEvent>
              ))}
            </ListViewDay>
          ))}
        </ListViewSection>
      ))}
    </ListView>
  );
};

it('aligns a date rail beside all of its event rows', async () => {
  await themesSetup_render(<List />, {
    views: { list: listView({ days: 1 }) },
    view: 'list',
    events: ['Yoga', 'Swim'].map(id => themesSetup_timed(id, { date: '2026-03-11', start: '09:00', end: '10:00' })),
  });
  const header = themesSetup_part('list-day-header')[0];
  const date = themesSetup_rect(header);
  const [yoga, swim] = themesSetup_part('list-event').map(themesSetup_rect);
  const root = themesSetup_rect(themesSetup_part('list-root')[0]);

  expect(header && getComputedStyle(header).backgroundColor).toBe('rgb(244, 244, 245)');
  expect(swim?.top).toBeGreaterThanOrEqual(yoga?.bottom ?? Infinity);
  expect(date.top).toBeCloseTo(yoga?.top ?? 0, 0);
  expect(date.bottom).toBeCloseTo(swim?.bottom ?? 0, 0);
  expect(yoga?.left).toBeCloseTo(date.right, 0);
  expect(yoga?.width).toBeCloseTo(root.width - date.width - 2, 0);
  expect(header?.getAttribute('aria-label')).toBe('Wednesday, March 11, 2026');
  expect(header?.querySelector('time')?.getAttribute('datetime')).toBe('2026-03-11');
  const label = themesSetup_rect(header?.querySelector('time') ?? undefined);
  const number = themesSetup_rect(header?.querySelector('strong') ?? undefined);
  const detail = themesSetup_rect(header?.querySelector('time > span') ?? undefined);
  expect(label.left).toBeCloseTo(date.left + Number.parseFloat(getComputedStyle(header!).paddingInlineStart), 0);
  expect(label.top).toBeCloseTo(date.top + Number.parseFloat(getComputedStyle(header!).paddingBlockStart), 0);
  expect(number.top + number.height / 2).toBeCloseTo(detail.top + detail.height / 2, 0);
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

it.each([{ groupBy: ['resource', 'date'] }, { groupBy: ['date', 'resource'] }] as const)(
  'places section headings above resource agenda rows with $groupBy',
  async ({ groupBy }) => {
    await themesSetup_render(<List />, {
      views: { list: listView({ weeks: 1, groupBy }) },
      view: 'list',
      resources: [{ id: 'a', title: 'Room A with a long resource name that wraps on narrow screens', data: null, availability: [] }],
      events: [{ ...themesSetup_timed('Meeting', { date: '2026-03-11', start: '09:00', end: '10:00' }), resourceIds: ['a'] }],
    });
    const root = themesSetup_part('list-root')[0]!;
    root.style.inlineSize = '20rem';
    const heading = themesSetup_rect(themesSetup_part('list-section-header')[0]);
    const day = themesSetup_rect(themesSetup_part('list-day')[0]);
    const date = themesSetup_rect(themesSetup_part('list-day-header')[0]);
    const event = themesSetup_rect(themesSetup_part('list-event')[0]);
    expect(heading.width).toBeCloseTo(themesSetup_rect(root).width - 2, 0);
    expect(day.top).toBeCloseTo(heading.bottom, 0);
    expect(event.left).toBeCloseTo(date.right, 0);
    expect(root.scrollWidth).toBe(root.clientWidth);
  },
);

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
  const first = themesSetup_rect(themesSetup_part('day-grid-day', '[data-date="2026-03-10"]')[0]);
  const last = themesSetup_rect(themesSetup_part('day-grid-day', '[data-date="2026-03-12"]')[0]);
  const shade = themesSetup_rect(themesSetup_part('day-grid-row-background-event')[0]);
  const trigger = themesSetup_part('day-grid-day', '[data-date="2026-03-11"]')[0]?.querySelector('[data-part="day-grid-day-trigger"]');
  const target = themesSetup_rect(trigger ?? undefined);

  expect(shade.left).toBeCloseTo(first.left, 0);
  expect(shade.right).toBeCloseTo(last.right, 0);
  expect(shade.height).toBeCloseTo(first.height, 0);
  expect(document.elementFromPoint(target.left + target.width / 2, target.top + target.height / 2)).toBe(trigger);
});
