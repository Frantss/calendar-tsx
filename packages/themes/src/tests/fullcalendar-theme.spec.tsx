import { afterEach, expect, it } from 'vitest';

import type { Calendar_DayGridLayout, Calendar_ListLayout, Calendar_TimeGridLayout, Calendar_TimelineLayout } from '@calendar-tsx/core';
import { listView, timelineView } from '@calendar-tsx/core';
import {
  DayGridView,
  DayGridViewDay,
  DayGridViewDayTrigger,
  DayGridViewRow,
  DayGridViewRowEvent,
  DayGridViewSection,
  ListView,
  ListViewDay,
  ListViewDayHeader,
  ListViewEvent,
  ListViewSection,
  TimeGridView,
  TimeGridViewBody,
  TimeGridViewColumn,
  TimeGridViewEvent,
  TimeGridViewNowIndicator,
  TimelineView,
  TimelineViewDayHeader,
  TimelineViewHeader,
  useCalendarContext,
  useCalendarSelector,
} from '@calendar-tsx/react';
import type { ThemesSetup_EventData } from '#tests/themes.setup';
import '../../fullcalendar.css';

import { themesSetup_allDay, themesSetup_part, themesSetup_rect, themesSetup_render, themesSetup_timed } from '#tests/themes.setup';

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

const TimeGrid = () => {
  const grid = useCalendarSelector(state => state.layout) as Calendar_TimeGridLayout<ThemesSetup_EventData, null>;

  return (
    <TimeGridView model={grid}>
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

const List = () => {
  const list = useCalendarSelector(state => state.layout) as Calendar_ListLayout<ThemesSetup_EventData>;

  return (
    <ListView model={list}>
      {list.sections.map(section => (
        <ListViewSection key={section.key} section={section}>
          {section.days.map(day => (
            <ListViewDay key={day.key} day={day}>
              <ListViewDayHeader day={day}>{day.date.toString()}</ListViewDayHeader>
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

const Timeline = () => {
  const timeline = useCalendarSelector(state => state.layout) as Calendar_TimelineLayout<ThemesSetup_EventData, null>;

  return (
    <TimelineView model={timeline}>
      <TimelineViewHeader>
        {timeline.days.map(day => (
          <TimelineViewDayHeader key={day.key} day={day}>
            {day.date.day}
          </TimelineViewDayHeader>
        ))}
      </TimelineViewHeader>
    </TimelineView>
  );
};

const resolve = (color: string) => {
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.color = color;
  const resolved = getComputedStyle(probe).color;
  probe.remove();

  return resolved;
};

const monthEvents = [
  themesSetup_allDay('Conference', { start: '2026-03-11', end: '2026-03-13' }),
  themesSetup_timed('Yoga', { date: '2026-03-16', start: '09:00', end: '10:00' }),
];

const bar = (title: string) => themesSetup_part('day-grid-row-event').find(element => element.textContent === title);

afterEach(() => document.documentElement.removeAttribute('data-color-scheme'));

it('washes today in yellow and leaves its number plain', async () => {
  await themesSetup_render(<Month />, { view: 'month' });
  const today = themesSetup_part('day-grid-day', '[data-today]')[0];
  const trigger = today?.querySelector('[data-part="day-grid-day-trigger"]');

  expect(today && getComputedStyle(today).backgroundColor).toBe(resolve('#facc1526'));
  expect(trigger && getComputedStyle(trigger).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(trigger && getComputedStyle(trigger).color).toBe('rgb(3, 7, 18)');
});

it('marks no today in a timeline, as the reference does not', async () => {
  await themesSetup_render(<Timeline />, { views: { timeline: timelineView({ days: 1 }) }, view: 'timeline' });
  const today = themesSetup_part('timeline-day-header', '[data-today]')[0];

  expect(today && getComputedStyle(today).backgroundColor).toBe('rgba(0, 0, 0, 0)');
});

it('leaves weekends unshaded and fades days outside the month', async () => {
  await themesSetup_render(<Month />, { view: 'month' });
  const sunday = themesSetup_part('day-grid-day', '[data-weekday="7"]:not([data-outside]):not([data-today])')[0];
  const outside = themesSetup_part('day-grid-day', '[data-outside]')[0];

  expect(sunday && getComputedStyle(sunday).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(outside && getComputedStyle(outside).color).toBe('rgb(156, 163, 175)');
});

it('fills bars in the event color and draws timed events as a dot and a bold title', async () => {
  await themesSetup_render(<Month />, { view: 'month', events: monthEvents });
  const conference = bar('Conference');
  const yoga = bar('Yoga');

  expect(conference && getComputedStyle(conference).backgroundColor).toBe('rgb(55, 136, 216)');
  expect(conference && getComputedStyle(conference).color).toBe('rgb(255, 255, 255)');
  expect(yoga && getComputedStyle(yoga).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  expect(yoga && getComputedStyle(yoga).fontWeight).toBe('700');
  expect(yoga && getComputedStyle(yoga, '::before').backgroundColor).toBe('rgb(55, 136, 216)');
});

it('fills timed events solid and draws a 1px now line', async () => {
  await themesSetup_render(<TimeGrid />, { events: [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })] });
  const yoga = themesSetup_part('time-grid-event')[0];
  const now = themesSetup_part('time-grid-now')[0];

  expect(yoga && getComputedStyle(yoga).backgroundColor).toBe('rgb(55, 136, 216)');
  expect(yoga && getComputedStyle(yoga).borderInlineStartWidth).toBe('1px');
  expect(now && getComputedStyle(now).borderBlockStartWidth).toBe('1px');
  expect(now && getComputedStyle(now).borderBlockStartColor).toBe('rgb(239, 68, 68)');
});

it('keeps a 15-minute event on one 11px line', async () => {
  await themesSetup_render(<TimeGrid />, { events: [themesSetup_timed('Standup', { date: '2026-03-11', start: '09:00', end: '09:15' })] });
  const standup = themesSetup_part('time-grid-event')[0];
  const style = standup && getComputedStyle(standup);

  expect(standup?.hasAttribute('data-short')).toBe(true);
  expect(style?.fontSize).toBe('11px');
  // 25px slots less the 1px gap leave 11.5px, and without block borders the line is not covered
  expect(standup && standup.clientHeight).toBeGreaterThanOrEqual(11);
});

it("reads FullCalendar's own variables from the root, so a customized palette carries over", async () => {
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = ':root { --fc-classic-primary: rgb(0, 128, 0); --fc-classic-border: rgb(1, 2, 3); }';

  await themesSetup_render(<Month />, { view: 'month', events: monthEvents });
  const conference = bar('Conference');
  const root = themesSetup_part('day-grid-root')[0];

  expect(conference && getComputedStyle(conference).backgroundColor).toBe('rgb(0, 128, 0)');
  expect(root && getComputedStyle(root).borderBlockStartColor).toBe('rgb(1, 2, 3)');
  style.remove();
});

it("switches to the dark palette on FullCalendar's data-color-scheme", async () => {
  document.documentElement.setAttribute('data-color-scheme', 'dark');

  // no color-scheme of its own around the calendar, so the attribute on <html> decides
  await themesSetup_render(<Month />, { view: 'month', colorScheme: undefined });
  const root = themesSetup_part('day-grid-root')[0];

  expect(root && getComputedStyle(root).backgroundColor).toBe('rgb(3, 7, 18)');
  expect(root && getComputedStyle(root).color).toBe('rgb(255, 255, 255)');
});

it("puts each list day's header above its events", async () => {
  await themesSetup_render(<List />, {
    views: { list: listView({ days: 1 }) },
    view: 'list',
    events: [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })],
  });
  const header = themesSetup_rect(themesSetup_part('list-day-header')[0]);
  const yoga = themesSetup_rect(themesSetup_part('list-event')[0]);

  expect(yoga.top).toBeGreaterThanOrEqual(header.bottom);
  expect(yoga.left).toBeCloseTo(header.left, 0);
});
