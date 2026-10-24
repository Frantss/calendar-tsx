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
  TimelineView,
  TimelineViewHeader,
  TimelineViewDayHeader,
  TimelineViewDayTrigger,
  TimelineViewSlotLabel,
  TimelineViewBody,
  TimelineViewRow,
  TimelineViewResource,
  TimelineViewLane,
  TimelineViewEvent,
  TimelineViewUnavailable,
  TimelineViewBackgroundEvent,
  TimelineViewNowIndicator,
} from '@calendar-tsx/react';
import type { Calendar_Event } from '@calendar-tsx/core';
import type { CSSProperties } from 'react';
import { dayGridSurface, timeGridSurface, timelineSurface } from '@calendar-tsx/core';
import { DraftOverlay, ResizeHandles } from './interaction-preview';
import type { PreviewBindings } from './interaction-preview';
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
  bindings,
  resizing,
}: {
  calendar: DayCalendar;
  view: PlaygroundView;
  onSelect: (event: Calendar_Event<Booking>) => void;
  bindings: PreviewBindings;
  resizing: boolean;
}) => {
  const layout = useCalendarSelector((state: PlaygroundState) => state.layout);
  const { instance, locale } = useCalendarContext();

  if (layout.kind === 'timeline')
    return (
      <TimelineView model={layout}>
        <TimelineViewHeader>
          {layout.days.map(day => (
            <TimelineViewDayHeader key={day.key} day={day}>
              <TimelineViewDayTrigger calendar={calendar} day={day} view='day'>
                {day.date.toLocaleString(locale, { month: 'short', day: 'numeric' })}
              </TimelineViewDayTrigger>
            </TimelineViewDayHeader>
          ))}
          {layout.days.some(day => day.colSpan > 1) &&
            layout.slots.map(slot => (
              <TimelineViewSlotLabel key={slot.key} slot={slot}>
                {slot.time.toLocaleString(locale, { hour: 'numeric', minute: '2-digit' })}
              </TimelineViewSlotLabel>
            ))}
        </TimelineViewHeader>
        <TimelineViewBody>
          {layout.rows.map(row => (
            <TimelineViewRow key={row.key} row={row}>
              <TimelineViewResource row={row}>{row.resource?.title}</TimelineViewResource>
              <TimelineViewLane row={row} ref={bindings.surface(timelineSurface(row.key))}>
                {row.backgroundEvents.map(segment => (
                  <TimelineViewBackgroundEvent key={segment.key} segment={segment} />
                ))}
                {row.unavailable.map(segment => (
                  <TimelineViewUnavailable key={segment.key} segment={segment} />
                ))}
                {row.segments.map(segment => (
                  <TimelineViewEvent
                    key={segment.key}
                    segment={segment}
                    ref={bindings.source(segment.key, { eventId: segment.event.id, resourceId: row.resource?.id })}
                    onClick={() => onSelect(segment.event)}
                  >
                    {segment.event.data.title}
                    <ResizeHandles
                      bindings={bindings}
                      event={segment.event}
                      sourceKey={segment.key}
                      resourceId={row.resource?.id}
                      enabled={resizing}
                    />
                  </TimelineViewEvent>
                ))}
                <DraftOverlay preview={bindings.preview} surface={`lane:${row.key}`} />
              </TimelineViewLane>
            </TimelineViewRow>
          ))}
          <TimelineViewNowIndicator model={layout} />
        </TimelineViewBody>
      </TimelineView>
    );

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
              <DayGridViewRow key={week.key} row={week} ref={bindings.surface(dayGridSurface(section.key, week.key))}>
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
                  <DayGridViewRowEvent
                    key={segment.key}
                    segment={segment}
                    onClick={() => onSelect(segment.event)}
                    ref={bindings.source(`${section.key}:${segment.key}`, {
                      eventId: segment.event.id,
                      resourceId: section.resource?.id,
                    })}
                  >
                    {segment.event.data.title}
                    <ResizeHandles
                      bindings={bindings}
                      event={segment.event}
                      sourceKey={`${section.key}:${segment.key}`}
                      resourceId={section.resource?.id}
                      enabled={resizing}
                    />
                  </DayGridViewRowEvent>
                ))}
                <DraftOverlay preview={bindings.preview} surface={`row:${section.key}:${week.key}`} />
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
            <div className='interaction-allday-track' ref={bindings.surface(timeGridSurface())}>
              {layout.allDay.segments.map(segment => (
                <TimeGridViewAllDayEvent
                  key={segment.key}
                  segment={segment}
                  onClick={() => onSelect(segment.event)}
                  ref={bindings.source(segment.key, {
                    eventId: segment.event.id,
                    resourceId: layout.columns[segment.colStart]?.resource?.id,
                  })}
                >
                  {segment.event.data.title}
                  <ResizeHandles
                    bindings={bindings}
                    event={segment.event}
                    sourceKey={segment.key}
                    resourceId={layout.columns[segment.colStart]?.resource?.id}
                    enabled={resizing}
                  />
                </TimeGridViewAllDayEvent>
              ))}
              <DraftOverlay preview={bindings.preview} surface='allDay' />
            </div>
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
            <TimeGridViewColumn key={column.key} column={column} ref={bindings.surface(timeGridSurface(column.key))}>
              {column.unavailable.map(segment => (
                <TimeGridViewUnavailable key={segment.key} segment={segment} />
              ))}
              {column.segments.map(segment => (
                <TimeGridViewEvent
                  key={segment.key}
                  segment={segment}
                  onClick={() => onSelect(segment.event)}
                  ref={bindings.source(segment.key, { eventId: segment.event.id, resourceId: column.resource?.id })}
                >
                  {segment.event.data.title}
                  <ResizeHandles
                    bindings={bindings}
                    event={segment.event}
                    sourceKey={segment.key}
                    resourceId={column.resource?.id}
                    vertical
                    enabled={resizing}
                  />
                </TimeGridViewEvent>
              ))}
              <TimeGridViewNowIndicator column={column} />
              <DraftOverlay preview={bindings.preview} surface={`column:${column.key}`} vertical />
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
