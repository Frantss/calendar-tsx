import {
  ListView,
  ListViewDay,
  ListViewDayHeader,
  ListViewEmpty,
  ListViewEvent,
  MonthView,
  MonthViewDay,
  MonthViewDayTrigger,
  MonthViewHeader,
  MonthViewHeaderCell,
  MonthViewOverflow,
  MonthViewWeek,
  MonthViewWeekEvent,
  TimeGridView,
  TimeGridViewAllDay,
  TimeGridViewAllDayEvent,
  TimeGridViewAxis,
  TimeGridViewAxisLabel,
  TimeGridViewBody,
  TimeGridViewColumn,
  TimeGridViewColumnHeader,
  TimeGridViewColumnTrigger,
  TimeGridViewEvent,
  TimeGridViewHeader,
  TimeGridViewNowIndicator,
  TimeGridViewUnavailable,
  useCalendarContext,
  useCalendarSelector,
} from '@calendar-tsx/react';
import type { Calendar_Event } from '@calendar-tsx/core';

import type { Booking } from './sample-data';
import type { PlaygroundState } from './views';

const time = (value: { toLocaleString: (locale: string, options: Intl.DateTimeFormatOptions) => string }) =>
  value.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' });

/** What an event click reports, as one line of text. */
export const describeEvent = (event: Calendar_Event<Booking>) =>
  'allDay' in event
    ? `${event.data.title}, all day from ${event.start.toLocaleString('en-US', { dateStyle: 'medium' })}`
    : `${event.data.title}, ${event.start.toLocaleString('en-US', { dateStyle: 'medium' })} from ${time(event.start)} to ${time(event.end)}`;

/** Renders the active view's layout with the React parts, the way the docs' view pages compose them. */
export const PreviewLayout = ({ onSelect }: { onSelect: (event: Calendar_Event<Booking>) => void }) => {
  const layout = useCalendarSelector((state: PlaygroundState) => state.layout);
  const { instance } = useCalendarContext();

  if (layout.kind === 'month') {
    return (
      <MonthView model={layout}>
        <MonthViewHeader>
          {layout.weekdays.map(weekday => (
            <MonthViewHeaderCell key={weekday.toString()} weekday={weekday}>
              {weekday.toLocaleString('en-US', { weekday: 'short' })}
            </MonthViewHeaderCell>
          ))}
        </MonthViewHeader>
        {layout.weeks.map(week => (
          <MonthViewWeek key={week.key} week={week}>
            {week.days.map(day => (
              <MonthViewDay key={day.key} day={day}>
                <MonthViewDayTrigger day={day} view='day'>
                  {day.date.day}
                </MonthViewDayTrigger>
                <MonthViewOverflow day={day} onClick={() => instance.api.navigate({ view: 'day', date: day.date })}>
                  {day.hiddenCount} more
                </MonthViewOverflow>
              </MonthViewDay>
            ))}
            {week.segments.map(segment => (
              <MonthViewWeekEvent key={segment.key} segment={segment} onClick={() => onSelect(segment.event)}>
                {segment.event.data.title}
              </MonthViewWeekEvent>
            ))}
          </MonthViewWeek>
        ))}
      </MonthView>
    );
  }

  if (layout.kind === 'timeGrid') {
    return (
      <TimeGridView model={layout}>
        <TimeGridViewHeader>
          {layout.columns.map(column => (
            <TimeGridViewColumnHeader key={column.key} column={column}>
              {column.resource ? (
                column.resource.title
              ) : (
                <TimeGridViewColumnTrigger column={column} view='day'>
                  {column.date.toLocaleString('en-US', { weekday: 'short', day: 'numeric' })}
                </TimeGridViewColumnTrigger>
              )}
            </TimeGridViewColumnHeader>
          ))}
        </TimeGridViewHeader>
        {layout.allDay && (
          <TimeGridViewAllDay>
            {layout.allDay.segments.map(segment => (
              <TimeGridViewAllDayEvent key={segment.key} segment={segment} onClick={() => onSelect(segment.event)}>
                {segment.event.data.title}
              </TimeGridViewAllDayEvent>
            ))}
          </TimeGridViewAllDay>
        )}
        <TimeGridViewBody model={layout}>
          <TimeGridViewAxis>
            {layout.slots.map(slot => (
              <TimeGridViewAxisLabel key={slot.key} slot={slot}>
                {slot.time.minute === 0 ? slot.time.toLocaleString('en-US', { hour: 'numeric' }) : null}
              </TimeGridViewAxisLabel>
            ))}
          </TimeGridViewAxis>
          {layout.columns.map(column => (
            <TimeGridViewColumn key={column.key} column={column}>
              {column.unavailable.map(segment => (
                <TimeGridViewUnavailable key={segment.key} segment={segment} />
              ))}
              {column.segments.map(segment => (
                <TimeGridViewEvent key={segment.key} segment={segment} onClick={() => onSelect(segment.event)}>
                  {segment.event.data.title}
                </TimeGridViewEvent>
              ))}
              <TimeGridViewNowIndicator column={column} />
            </TimeGridViewColumn>
          ))}
        </TimeGridViewBody>
      </TimeGridView>
    );
  }

  return (
    <ListView model={layout}>
      {layout.days.map(day => (
        <ListViewDay key={day.key} day={day}>
          <ListViewDayHeader day={day}>{day.date.toLocaleString('en-US', { dateStyle: 'full' })}</ListViewDayHeader>
          {day.events.map(event => (
            <ListViewEvent key={event.id} event={event} onClick={() => onSelect(event)}>
              {'allDay' in event ? 'All day' : time(event.start)} · {event.data.title}
            </ListViewEvent>
          ))}
        </ListViewDay>
      ))}
      <ListViewEmpty>No events this week. Move to another week to see some.</ListViewEmpty>
    </ListView>
  );
};
