import * as Parts from '@calendar-tsx/react';
import type { Calendar_StateOf } from '@calendar-tsx/core';
import type { ReactNode } from 'react';
import type { DayCalendar } from '../../../docs/examples/core/setup';
import type { Scenario } from './fixtures';
import type { useCalendar } from '@calendar-tsx/react';
import './stories.css';

type State = Calendar_StateOf<
  ReturnType<
    typeof useCalendar<
      import('./fixtures').EventData,
      import('./fixtures').ResourceData,
      Scenario['views'],
      Scenario['features']
    >
  >
>;
export type StoryLayout = State['layout'];
type Props = {
  calendar: DayCalendar;
  layout: StoryLayout;
  locale?: string;
  onOverflow?: (date: string, events: string[]) => void;
  onSelect?: (title: string) => void;
  preventDayNavigation?: boolean;
  eventContent?: 'custom' | 'element' | 'function';
  accessibleLabel?: string;
};

export const CalendarLayout = ({
  calendar,
  layout,
  locale = 'en-US',
  onOverflow,
  onSelect,
  preventDayNavigation,
  eventContent,
  accessibleLabel,
}: Props) => {
  const dayClick = (event: React.MouseEvent) => {
    if (preventDayNavigation) event.preventDefault();
  };
  const content = (title: string): ReactNode =>
    eventContent === 'custom' ? (
      <>
        <strong>{title}</strong>
        <span> · Sample booking</span>
      </>
    ) : (
      title
    );
  const eventRender = eventContent === 'element' ? <button type='button' data-custom-event='element' /> : undefined;
  if (layout.kind === 'dayGrid')
    return (
      <Parts.DayGridView model={layout} aria-label={accessibleLabel}>
        {layout.sections.map(section => (
          <Parts.DayGridViewSection key={section.key} section={section}>
            {(section.month || section.resource) && (
              <Parts.DayGridViewSectionHeader>
                {section.resource?.title} {section.month?.toLocaleString(locale, { month: 'long', year: 'numeric' })}
              </Parts.DayGridViewSectionHeader>
            )}
            <Parts.DayGridViewHeader>
              {section.columns.map(column => (
                <Parts.DayGridViewHeaderCell key={column.key} column={column}>
                  {column.resource?.title} {column.date.toLocaleString(locale, { weekday: 'short' })}
                </Parts.DayGridViewHeaderCell>
              ))}
            </Parts.DayGridViewHeader>
            {section.rows.map(row => (
              <Parts.DayGridViewRow key={row.key} row={row}>
                {row.days.map(day => (
                  <Parts.DayGridViewDay key={day.key} day={day}>
                    {day.backgrounds.map(layer => (
                      <Parts.DayGridViewDayBackground key={layer.key} background={layer} />
                    ))}
                    <Parts.DayGridViewDayTrigger calendar={calendar} day={day} view='day' onClick={dayClick}>
                      {day.date.day}
                    </Parts.DayGridViewDayTrigger>
                    <Parts.DayGridViewOverflow
                      day={day}
                      onClick={() =>
                        onOverflow?.(
                          day.date.toString(),
                          day.events.map(event => event.data.title),
                        )
                      }
                    >
                      {day.hiddenCount ? `${day.hiddenCount} more` : 'More events'}
                    </Parts.DayGridViewOverflow>
                  </Parts.DayGridViewDay>
                ))}
                {row.backgroundEvents.map(segment => (
                  <Parts.DayGridViewRowBackgroundEvent key={segment.key} segment={segment} />
                ))}
                {row.segments.map(segment => (
                  <Parts.DayGridViewRowEvent
                    key={segment.key}
                    segment={segment}
                    render={eventRender}
                    onClick={() => onSelect?.(segment.event.data.title)}
                  >
                    {content(segment.event.data.title)}
                  </Parts.DayGridViewRowEvent>
                ))}
              </Parts.DayGridViewRow>
            ))}
          </Parts.DayGridViewSection>
        ))}
      </Parts.DayGridView>
    );
  if (layout.kind === 'timeGrid')
    return (
      <Parts.TimeGridView model={layout} aria-label={accessibleLabel}>
        <Parts.TimeGridViewHeader>
          {layout.columns.map(column => (
            <Parts.TimeGridViewColumnHeader key={column.key} column={column}>
              {column.resource?.title}{' '}
              <Parts.TimeGridViewColumnTrigger calendar={calendar} column={column} view='day' onClick={dayClick}>
                {column.date.toLocaleString(locale, { weekday: 'short', day: 'numeric' })}
              </Parts.TimeGridViewColumnTrigger>
            </Parts.TimeGridViewColumnHeader>
          ))}
        </Parts.TimeGridViewHeader>
        {layout.allDay && (
          <Parts.TimeGridViewAllDay>
            {layout.allDay.backgroundEvents.map(segment => (
              <Parts.TimeGridViewAllDayBackgroundEvent key={segment.key} segment={segment} />
            ))}
            {layout.allDay.segments.map(segment => (
              <Parts.TimeGridViewAllDayEvent
                key={segment.key}
                segment={segment}
                onClick={() => onSelect?.(segment.event.data.title)}
              >
                {content(segment.event.data.title)}
              </Parts.TimeGridViewAllDayEvent>
            ))}
          </Parts.TimeGridViewAllDay>
        )}
        <Parts.TimeGridViewBody model={layout}>
          <Parts.TimeGridViewAxis>
            {layout.slots.map(slot => (
              <Parts.TimeGridViewAxisLabel key={slot.key} slot={slot}>
                {slot.time.toLocaleString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}
                {slot.dayOffset ? ' +1d' : ''}
              </Parts.TimeGridViewAxisLabel>
            ))}
          </Parts.TimeGridViewAxis>
          {layout.columns.map(column => (
            <Parts.TimeGridViewColumn key={column.key} column={column}>
              {column.backgrounds.map(layer => (
                <Parts.TimeGridViewBackground key={layer.key} background={layer} />
              ))}
              {column.backgroundEvents.map(segment => (
                <Parts.TimeGridViewBackgroundEvent key={segment.key} segment={segment} />
              ))}
              {column.unavailable.map(segment => (
                <Parts.TimeGridViewUnavailable key={segment.key} segment={segment} />
              ))}
              {column.segments.map(segment => (
                <Parts.TimeGridViewEvent
                  key={segment.key}
                  segment={segment}
                  data-highlighted={'isHighlighted' in segment && segment.isHighlighted ? '' : undefined}
                  render={
                    eventContent === 'function'
                      ? (props, state) => (
                          <button
                            {...props}
                            type='button'
                            data-custom-event='function'
                            data-event-id={state.event.id}
                          />
                        )
                      : eventRender
                  }
                  onClick={() => onSelect?.(segment.event.data.title)}
                >
                  {content(segment.event.data.title)}
                </Parts.TimeGridViewEvent>
              ))}
              <Parts.TimeGridViewNowIndicator column={column} />
            </Parts.TimeGridViewColumn>
          ))}
        </Parts.TimeGridViewBody>
      </Parts.TimeGridView>
    );
  if (layout.kind === 'list')
    return (
      <Parts.ListView model={layout} aria-label={accessibleLabel}>
        {layout.sections.map(section => (
          <Parts.ListViewSection key={section.key} section={section}>
            {(section.resource || section.date) && (
              <Parts.ListViewSectionHeader section={section}>
                {section.resource?.title ?? section.date?.toLocaleString(locale, { dateStyle: 'full' })}
              </Parts.ListViewSectionHeader>
            )}
            {section.days.map(day => (
              <Parts.ListViewDay key={day.key} day={day}>
                <Parts.ListViewDayHeader day={day}>
                  {section.date ? (
                    day.resource?.title
                  ) : (
                    <time dateTime={day.date.toString()}>
                      <strong>{day.date.day}</strong>
                      <span>
                        {day.date.toLocaleString(locale, { weekday: 'short', month: 'short', year: 'numeric' })}
                      </span>
                    </time>
                  )}
                </Parts.ListViewDayHeader>
                {day.events.map(event => (
                  <Parts.ListViewEvent
                    key={event.id}
                    event={event}
                    render={eventRender}
                    onClick={() => onSelect?.(event.data.title)}
                  >
                    {content(event.data.title)}
                  </Parts.ListViewEvent>
                ))}
              </Parts.ListViewDay>
            ))}
          </Parts.ListViewSection>
        ))}
        <Parts.ListViewEmpty>No bookings in this range</Parts.ListViewEmpty>
      </Parts.ListView>
    );
  return (
    <Parts.TimelineView model={layout} aria-label={accessibleLabel}>
      <Parts.TimelineViewHeader>
        {layout.days.map(day => (
          <Parts.TimelineViewDayHeader key={day.key} day={day}>
            <Parts.TimelineViewDayTrigger calendar={calendar} day={day} view='day' onClick={dayClick}>
              {day.date.toLocaleString(locale, { month: 'short', day: 'numeric' })}
            </Parts.TimelineViewDayTrigger>
          </Parts.TimelineViewDayHeader>
        ))}
        {layout.days.some(day => day.colSpan > 1) &&
          layout.slots.map(slot => (
            <Parts.TimelineViewSlotLabel key={slot.key} slot={slot}>
              {slot.time.toLocaleString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}
              {slot.dayOffset ? ' +1d' : ''}
            </Parts.TimelineViewSlotLabel>
          ))}
      </Parts.TimelineViewHeader>
      <Parts.TimelineViewBody>
        {layout.rows.map(row => (
          <Parts.TimelineViewRow key={row.key} row={row}>
            <Parts.TimelineViewResource row={row}>
              {calendar.api.resourceExpansion && (
                <Parts.TimelineViewResourceToggle
                  row={row}
                  calendar={{ api: { resourceExpansion: calendar.api.resourceExpansion } }}
                >
                  <span aria-hidden='true'>{row.isExpanded ? '−' : '+'}</span>
                </Parts.TimelineViewResourceToggle>
              )}
              {row.resource?.title}
            </Parts.TimelineViewResource>
            <Parts.TimelineViewLane row={row}>
              {row.backgrounds.map(layer => (
                <Parts.TimelineViewBackground key={layer.key} background={layer} />
              ))}
              {row.backgroundEvents.map(segment => (
                <Parts.TimelineViewBackgroundEvent key={segment.key} segment={segment} />
              ))}
              {row.unavailable.map(segment => (
                <Parts.TimelineViewUnavailable key={segment.key} segment={segment} />
              ))}
              {row.segments.map(segment => (
                <Parts.TimelineViewEvent
                  key={segment.key}
                  segment={segment}
                  onClick={() => onSelect?.(segment.event.data.title)}
                >
                  {content(segment.event.data.title)}
                </Parts.TimelineViewEvent>
              ))}
            </Parts.TimelineViewLane>
          </Parts.TimelineViewRow>
        ))}
        <Parts.TimelineViewNowIndicator model={layout} />
      </Parts.TimelineViewBody>
    </Parts.TimelineView>
  );
};
