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

type Formattable = { toLocaleString: (locale: string, options: Intl.DateTimeFormatOptions) => string };

const time = (value: Formattable, locale: string) =>
  value.toLocaleString(locale, { hour: 'numeric', minute: '2-digit' });

/** What an event click reports, as one line of text. */
export const describeEvent = (event: Calendar_Event<Booking>, locale: string) =>
  'allDay' in event
    ? `${event.data.title}, all day from ${event.start.toLocaleString(locale, { dateStyle: 'medium' })}`
    : `${event.data.title}, ${event.start.toLocaleString(locale, { dateStyle: 'medium' })} from ${time(event.start, locale)} to ${time(event.end, locale)}`;

/** Renders the active view's layout with the React parts, the way the docs' view pages compose them. */
export const PreviewLayout = ({ onSelect }: { onSelect: (event: Calendar_Event<Booking>) => void }) => {
  const layout = useCalendarSelector((state: PlaygroundState) => state.layout);
  const { instance, locale } = useCalendarContext();

  if (layout.kind === 'month') {
    return (
      <MonthView model={layout}>
        <MonthViewHeader>
          {layout.weekdays.map(weekday => (
            <MonthViewHeaderCell key={weekday.toString()} weekday={weekday}>
              {weekday.toLocaleString(locale, { weekday: 'short' })}
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
                  {column.date.toLocaleString(locale, { weekday: 'short', day: 'numeric' })}
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
                {slot.time.minute === 0 ? slot.time.toLocaleString(locale, { hour: 'numeric' }) : null}
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
          <ListViewDayHeader day={day}>{day.date.toLocaleString(locale, { dateStyle: 'full' })}</ListViewDayHeader>
          {day.events.map(event => (
            <ListViewEvent key={event.id} event={event} onClick={() => onSelect(event)}>
              {'allDay' in event ? 'All day' : time(event.start, locale)} · {event.data.title}
            </ListViewEvent>
          ))}
        </ListViewDay>
      ))}
      <ListViewEmpty>No events this week. Move to another week to see some.</ListViewEmpty>
    </ListView>
  );
};
