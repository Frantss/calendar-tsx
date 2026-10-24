import {
  DayGridViewSectionHeader,
  ListView,
  ListViewDay,
  ListViewDayHeader,
  ListViewEmpty,
  ListViewEvent,
  ListViewSection,
  ListViewSectionHeader,
  DayGridView,
  DayGridViewDay,
  DayGridViewDayTrigger,
  DayGridViewHeader,
  DayGridViewHeaderCell,
  DayGridViewOverflow,
  DayGridViewRow,
  DayGridViewRowEvent,
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
  DayGridViewSection,
} from '@calendar-tsx/react';
import type { Calendar_Event } from '@calendar-tsx/core';
import type { CSSProperties } from 'react';
import { Timeline } from '../../examples/react/timeline-view';
import type { DayCalendar } from '../../examples/core/setup';

import type { Booking } from './sample-data';
import type { PlaygroundState, PlaygroundView } from './views';

type Formattable = { toLocaleString: (locale: string, options: Intl.DateTimeFormatOptions) => string };

const time = (value: Formattable, locale: string) =>
  value.toLocaleString(locale, { hour: 'numeric', minute: '2-digit' });

/** What an event click reports, as one line of text. */
export const describeEvent = (event: Calendar_Event<Booking>, locale: string) =>
  event.kind === 'allDay'
    ? `${event.data.title}, all day from ${event.start.toLocaleString(locale, { dateStyle: 'medium' })}`
    : `${event.data.title}, ${event.start.toLocaleString(locale, { dateStyle: 'medium' })} from ${time(event.start, locale)} to ${time(event.end, locale)}`;

/** Renders the active view's layout with the React parts, the way the docs' view pages compose them. */
export const PreviewLayout = ({
  calendar,
  view,
  onSelect,
}: {
  calendar: DayCalendar;
  view: PlaygroundView;
  onSelect: (event: Calendar_Event<Booking>) => void;
}) => {
  const layout = useCalendarSelector((state: PlaygroundState) => state.layout);
  const { instance, locale } = useCalendarContext();

  if (layout.kind === 'timeline') return <Timeline calendar={calendar} locale={locale} onSelect={onSelect} />;

  if (layout.kind === 'dayGrid') {
    return (
      <DayGridView model={layout} data-month-stack={view === 'year_stack' ? '' : undefined}>
        {layout.sections.map(section => (
          <DayGridViewSection key={section.key} section={section}>
            {section.month || section.resource ? (
              <DayGridViewSectionHeader>
                {section.resource?.title} {section.month?.toLocaleString(locale, { month: 'long', year: 'numeric' })}
              </DayGridViewSectionHeader>
            ) : null}

            <DayGridViewHeader>
              {section.columns.map(column => (
                <DayGridViewHeaderCell key={column.key} column={column}>
                  {column.resource?.title} {column.date.toLocaleString(locale, { weekday: 'short' })}
                </DayGridViewHeaderCell>
              ))}
            </DayGridViewHeader>
            {section.rows.map(week => (
              <DayGridViewRow key={week.key} row={week}>
                {week.days.map(day => (
                  <DayGridViewDay key={day.key} day={day}>
                    <DayGridViewDayTrigger calendar={calendar} day={day} view='day'>
                      {view === 'year_continuous' && day.date.day === 1
                        ? day.date.toLocaleString(locale, { month: 'short', day: 'numeric' })
                        : day.date.day}
                    </DayGridViewDayTrigger>
                    <DayGridViewOverflow
                      day={day}
                      onClick={() => instance.api.navigate({ view: 'day', date: day.date })}
                    >
                      {day.hiddenCount} more
                    </DayGridViewOverflow>
                  </DayGridViewDay>
                ))}
                {week.segments.map(segment => (
                  <DayGridViewRowEvent key={segment.key} segment={segment} onClick={() => onSelect(segment.event)}>
                    {segment.event.data.title}
                  </DayGridViewRowEvent>
                ))}
              </DayGridViewRow>
            ))}
          </DayGridViewSection>
        ))}
      </DayGridView>
    );
  }

  if (layout.kind === 'timeGrid') {
    return (
      <TimeGridView model={layout} style={{ '--cal-min-column-width': layout.minColumnWidth } as CSSProperties}>
        <TimeGridViewHeader>
          {layout.columns.map(column => (
            <TimeGridViewColumnHeader key={column.key} column={column}>
              {column.resource && <span>{column.resource.title} </span>}
              <TimeGridViewColumnTrigger calendar={calendar} column={column} view='day'>
                {column.date.toLocaleString(locale, { weekday: 'short', day: 'numeric' })}
              </TimeGridViewColumnTrigger>
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
      {layout.sections.map(section => (
        <ListViewSection
          key={section.key}
          section={section}
          aria-label={section.resource?.title ?? section.date?.toLocaleString(locale, { dateStyle: 'full' })}
        >
          {(section.resource || section.date) && (
            <ListViewSectionHeader section={section}>
              {section.resource?.title ?? section.date?.toLocaleString(locale, { dateStyle: 'full' })}
            </ListViewSectionHeader>
          )}
          {section.days.map(day => (
            <ListViewDay key={day.key} day={day}>
              <ListViewDayHeader
                day={day}
                aria-label={section.date ? day.resource?.title : day.date.toLocaleString(locale, { dateStyle: 'full' })}
              >
                {section.date ? (
                  day.resource?.title
                ) : (
                  <time dateTime={day.date.toString()}>
                    <strong>{day.date.toLocaleString(locale, { day: 'numeric' })}</strong>{' '}
                    <span>
                      <span>{day.date.toLocaleString(locale, { weekday: 'short' })}</span>{' '}
                      <span>{day.date.toLocaleString(locale, { month: 'short', year: 'numeric' })}</span>
                    </span>
                  </time>
                )}
              </ListViewDayHeader>
              {day.events.map(event => (
                <ListViewEvent key={event.id} event={event} onClick={() => onSelect(event)}>
                  {event.kind === 'allDay' ? 'All day' : time(event.start, locale)} · {event.data.title}
                </ListViewEvent>
              ))}
            </ListViewDay>
          ))}
        </ListViewSection>
      ))}
      <ListViewEmpty>No events in this period. Add an event or choose another date.</ListViewEmpty>
    </ListView>
  );
};
