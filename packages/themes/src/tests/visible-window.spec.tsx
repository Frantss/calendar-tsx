import { expect, it } from 'vitest';
import { dayGridView, timeGridView, timelineView } from '@calendar-tsx/core';
import {
  DayGridView,
  DayGridViewDay,
  DayGridViewRow,
  DayGridViewSection,
  DayGridViewRowEvent,
  TimeGridView,
  TimeGridViewAxis,
  TimeGridViewAxisLabel,
  TimeGridViewBody,
  TimeGridViewColumn,
  TimeGridViewEvent,
  TimelineView,
  TimelineViewBody,
  TimelineViewDayHeader,
  TimelineViewEvent,
  TimelineViewHeader,
  TimelineViewLane,
  TimelineViewRow,
  TimelineViewSlotLabel,
  useCalendarSelector,
} from '@calendar-tsx/react';
import '../../base.css';
import { themesSetup_allDay, themesSetup_part, themesSetup_rect, themesSetup_render, themesSetup_timed } from '#tests/themes.setup';

const Calendar = () => {
  const model = useCalendarSelector(state => state.layout);
  if (model.kind === 'dayGrid')
    return (
      <DayGridView model={model}>
        {model.sections.map(section => (
          <DayGridViewSection key={section.key} section={section}>
            {section.rows.map(week => (
              <DayGridViewRow key={week.key} row={week}>
                {week.days.map(day => (
                  <DayGridViewDay key={day.key} day={day}>
                    {day.date.day}
                  </DayGridViewDay>
                ))}
                {week.segments.map(segment => (
                  <DayGridViewRowEvent key={segment.key} segment={segment}>
                    {segment.event.id}
                  </DayGridViewRowEvent>
                ))}
              </DayGridViewRow>
            ))}
          </DayGridViewSection>
        ))}
      </DayGridView>
    );
  if (model.kind === 'timeGrid')
    return (
      <TimeGridView model={model}>
        <TimeGridViewBody model={model}>
          <TimeGridViewAxis>
            {model.slots.map(slot => (
              <TimeGridViewAxisLabel key={slot.key} slot={slot} />
            ))}
          </TimeGridViewAxis>
          {model.columns.map(column => (
            <TimeGridViewColumn key={column.key} column={column}>
              {column.segments.map(segment => (
                <TimeGridViewEvent key={segment.key} segment={segment}>
                  {segment.event.id}
                </TimeGridViewEvent>
              ))}
            </TimeGridViewColumn>
          ))}
        </TimeGridViewBody>
      </TimeGridView>
    );
  if (model.kind === 'timeline')
    return (
      <TimelineView model={model}>
        <TimelineViewHeader>
          {model.days.map(day => (
            <TimelineViewDayHeader key={day.key} day={day} />
          ))}
          {model.slots.map(slot => (
            <TimelineViewSlotLabel key={slot.key} slot={slot} />
          ))}
        </TimelineViewHeader>
        <TimelineViewBody>
          {model.rows.map(row => (
            <TimelineViewRow key={row.key} row={row}>
              <TimelineViewLane row={row}>
                {row.segments.map(segment => (
                  <TimelineViewEvent key={segment.key} segment={segment}>
                    {segment.event.id}
                  </TimelineViewEvent>
                ))}
              </TimelineViewLane>
            </TimelineViewRow>
          ))}
        </TimelineViewBody>
      </TimelineView>
    );
  return null;
};

it('aligns month bars with five visible day cells', async () => {
  await themesSetup_render(<Calendar />, {
    view: 'month',
    views: { month: dayGridView({ period: 'month', maxEventsPerDay: 3, hiddenDays: [6, 7] }) },
    events: [themesSetup_allDay('span', { start: '2026-03-06', end: '2026-03-09' })],
  });
  const week = themesSetup_rect(themesSetup_part('day-grid-row')[0]);
  const day = themesSetup_rect(themesSetup_part('day-grid-day')[0]);
  const bar = themesSetup_rect(themesSetup_part('day-grid-row-event')[0]);
  expect(day.width).toBeCloseTo(week.width / 5, 0);
  expect(bar.left - week.left).toBeCloseTo((week.width * 4) / 5 + 2, 0);
  expect(bar.width).toBeCloseTo(week.width / 5 - 4, 0);
});

it('sizes a partial final time-grid slot in proportion to its minutes', async () => {
  await themesSetup_render(<Calendar />, {
    view: 'day',
    views: { day: timeGridView({ days: 1, slotMinutes: 30, timeWindow: { startMinutes: 490, endMinutes: 540 } }) },
    events: [themesSetup_timed('last', { date: '2026-03-11', start: '08:40', end: '09:00' })],
  });
  const body = themesSetup_rect(themesSetup_part('time-grid-body')[0]);
  const labels = themesSetup_part('time-grid-axis-label').map(themesSetup_rect);
  const event = themesSetup_rect(themesSetup_part('time-grid-event')[0]);
  expect(body.height).toBeCloseTo(80, 0);
  expect(labels[1].top - labels[0].top).toBeCloseTo(body.height * 0.6, 0);
  expect(labels[1].height).toBeCloseTo(body.height * 0.4, 0);
  expect(event.top - body.top).toBeCloseTo(body.height * 0.6, 0);
  expect(event.height).toBeCloseTo(body.height * 0.4 - 4, 0);
});

it('aligns unequal timeline slot columns, day headers and events', async () => {
  await themesSetup_render(<Calendar />, {
    view: 'timeline',
    views: { timeline: timelineView({ days: 2, slotMinutes: 30, timeWindow: { startMinutes: 490, endMinutes: 540 } }) },
    events: [themesSetup_timed('last', { date: '2026-03-12', start: '08:40', end: '09:00' })],
  });
  const lane = themesSetup_rect(themesSetup_part('timeline-lane')[0]);
  const slots = themesSetup_part('timeline-slot-label').map(themesSetup_rect);
  const days = themesSetup_part('timeline-day-header').map(themesSetup_rect);
  const event = themesSetup_rect(themesSetup_part('timeline-event')[0]);
  expect(slots.map(slot => Math.round(slot.width))).toEqual([162, 108, 162, 108]);
  expect(days[0].width).toBeCloseTo(lane.width / 2, 0);
  expect(days[1].left - lane.left).toBeCloseTo(lane.width / 2, 0);
  expect(event.left - lane.left).toBeCloseTo(lane.width * 0.8, 0);
  expect(event.width).toBeCloseTo(lane.width * 0.2, 0);
});
