import { expect, it } from 'vitest';

import type { Calendar_DayGridLayout, Calendar_TimeGridLayout, Calendar_TimelineLayout, Calendar_Views } from '@calendar-tsx/core';
import { timelineView } from '@calendar-tsx/core';
import {
  DayGridView,
  DayGridViewDay,
  DayGridViewDayTrigger,
  DayGridViewRow,
  DayGridViewRowEvent,
  TimeGridView,
  TimeGridViewBody,
  TimeGridViewColumn,
  TimeGridViewEvent,
  TimelineView,
  TimelineViewBody,
  TimelineViewEvent,
  TimelineViewLane,
  TimelineViewRow,
  useCalendarSelector,
  DayGridViewSection,
} from '@calendar-tsx/react';
import type { ThemesSetup_EventData } from '#tests/themes.setup';
import '../../high-contrast.css';

import { themesSetup_allDay, themesSetup_part, themesSetup_render, themesSetup_timed } from '#tests/themes.setup';

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
          </TimeGridViewColumn>
        ))}
      </TimeGridViewBody>
    </TimeGridView>
  );
};

const Month = () => {
  const month = useCalendarSelector(state => state.layout) as Calendar_DayGridLayout<ThemesSetup_EventData>;

  return (
    <DayGridView model={month}>
      {month.sections.map(section => (
        <DayGridViewSection key={section.key} section={section}>
          {section.rows.map(week => (
            <DayGridViewRow key={week.key} row={week}>
              {week.days.map(day => (
                <DayGridViewDay key={day.key} day={day}>
                  <DayGridViewDayTrigger day={day} view='month'>
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

const Timeline = () => {
  const timeline = useCalendarSelector(state => state.layout) as Calendar_TimelineLayout<ThemesSetup_EventData, null>;

  return (
    <TimelineView model={timeline}>
      <TimelineViewBody>
        {timeline.rows.map(row => (
          <TimelineViewRow key={row.key} row={row}>
            <TimelineViewLane row={row}>
              {row.segments.map(segment => (
                <TimelineViewEvent key={segment.key} segment={segment}>
                  {segment.event.data.title}
                </TimelineViewEvent>
              ))}
            </TimelineViewLane>
          </TimelineViewRow>
        ))}
      </TimelineViewBody>
    </TimelineView>
  );
};

const timelineViews: Calendar_Views = { timeline: timelineView({ days: 1 }) };

it.each([
  ['light', 'rgb(255, 255, 255)', 'rgb(0, 0, 0)', 'rgb(0, 53, 168)'],
  ['dark', 'rgb(0, 0, 0)', 'rgb(255, 255, 255)', 'rgb(255, 213, 0)'],
] as const)('outlines events in the text color and marks today in the accent in %s mode', async (colorScheme, surface, text, accent) => {
  await themesSetup_render(<TimeGrid />, { colorScheme, events: [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })] });
  const yoga = getComputedStyle(themesSetup_part('time-grid-event')[0]!);

  expect([yoga.backgroundColor, yoga.borderTopColor, yoga.borderTopWidth, yoga.color]).toEqual([surface, text, '2px', text]);

  await themesSetup_render(<Month />, { view: 'month', colorScheme });
  const today = themesSetup_part('day-grid-day', '[data-today]').at(-1)?.querySelector('[data-part="day-grid-day-trigger"]');

  expect(today && getComputedStyle(today).backgroundColor).toBe(accent);
});

it.each([
  ['light', 'rgb(0, 0, 0)', 'rgb(255, 255, 255)'],
  ['dark', 'rgb(255, 255, 255)', 'rgb(0, 0, 0)'],
] as const)('fills all-day bars solid in the text color in %s mode', async (colorScheme, fill, text) => {
  await themesSetup_render(<Month />, {
    view: 'month',
    colorScheme,
    events: [themesSetup_allDay('Fair', { start: '2026-03-11', end: '2026-03-11' })],
  });
  const fair = getComputedStyle(themesSetup_part('day-grid-row-event')[0]!);

  expect([fair.backgroundColor, fair.color]).toEqual([fill, text]);
});

it('dashes the edge where a bar continues into the next week, in a color that shows on the solid fill', async () => {
  await themesSetup_render(<Month />, { view: 'month', events: [themesSetup_allDay('Fair', { start: '2026-03-14', end: '2026-03-16' })] });
  const [before, after] = themesSetup_part('day-grid-row-event').map(bar => getComputedStyle(bar));

  expect([before?.borderRightStyle, before?.borderLeftStyle]).toEqual(['dashed', 'solid']);
  expect([after?.borderLeftStyle, after?.borderRightStyle]).toEqual(['dashed', 'solid']);
  expect([before?.borderRightColor, after?.borderLeftColor]).toEqual(['rgb(255, 255, 255)', 'rgb(255, 255, 255)']);
});

it('lets --calendar-event override the outline fill', async () => {
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = '.fill { --calendar-event: rgb(1, 2, 3); }';

  await themesSetup_render(<TimeGrid />, {
    className: 'fill',
    events: [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })],
  });

  expect(getComputedStyle(themesSetup_part('time-grid-event')[0]!).backgroundColor).toBe('rgb(1, 2, 3)');
  style.remove();
});

it.each([
  ['light', 'rgb(255, 255, 255)', 'rgb(0, 0, 0)'],
  ['dark', 'rgb(0, 0, 0)', 'rgb(255, 255, 255)'],
] as const)('outlines timeline events in the text color in %s mode', async (colorScheme, surface, text) => {
  await themesSetup_render(<Timeline />, {
    views: timelineViews,
    view: 'timeline',
    colorScheme,
    events: [themesSetup_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' })],
  });
  const yoga = getComputedStyle(themesSetup_part('timeline-event')[0]!);

  expect([yoga.backgroundColor, yoga.borderTopColor, yoga.borderTopWidth, yoga.color]).toEqual([surface, text, '2px', text]);
});

it('dashes the edges where a timeline event continues past the range', async () => {
  await themesSetup_render(<Timeline />, {
    views: timelineViews,
    view: 'timeline',
    events: [themesSetup_allDay('Fair', { start: '2026-03-10', end: '2026-03-12' })],
  });
  const fair = getComputedStyle(themesSetup_part('timeline-event')[0]!);
  const edges = getComputedStyle(themesSetup_part('timeline-event')[0]!, '::before');

  expect([fair.borderLeftStyle, fair.borderRightStyle]).toEqual(['dashed', 'dashed']);
  expect([edges.borderLeftStyle, edges.borderRightStyle, edges.borderLeftWidth]).toEqual(['dashed', 'dashed', '2px']);
});

it('keeps thick timeline outlines from widening adjacent short events', async () => {
  await themesSetup_render(<Timeline />, {
    views: { timeline: timelineView({ period: 'month', slotMinutes: 1440, minSlotWidth: '6rem', minEventMinutes: 0 }) },
    view: 'timeline',
    events: [
      themesSetup_timed('First', { date: '2026-03-11', start: '09:00', end: '09:15' }),
      themesSetup_timed('Second', { date: '2026-03-11', start: '09:15', end: '09:30' }),
    ],
  });
  const [first, second] = themesSetup_part('timeline-event');
  expect(first!.getBoundingClientRect().right).toBeLessThanOrEqual(second!.getBoundingClientRect().left + 0.05);
});
