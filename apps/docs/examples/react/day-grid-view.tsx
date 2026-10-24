import {
  DayGridViewSectionHeader,
  DayGridView,
  DayGridViewDay,
  DayGridViewDayTrigger,
  DayGridViewHeader,
  DayGridViewHeaderCell,
  DayGridViewOverflow,
  DayGridViewRow,
  DayGridViewRowBackgroundEvent,
  DayGridViewRowEvent,
  useCalendarSelector,
  DayGridViewSection,
} from '@calendar-tsx/react';

import type { DayCalendar, State } from '../core/setup';

// #region view
export const DayGrid = ({ calendar, onOverflow }: { calendar: DayCalendar; onOverflow: (date: string) => void }) => {
  const layout = useCalendarSelector((state: State) => state.layout);

  if (layout.kind !== 'dayGrid') return null;

  return (
    <DayGridView model={layout}>
      {layout.sections.map(section => (
        <DayGridViewSection key={section.key} section={section}>
          {section.month || section.resource ? (
            <DayGridViewSectionHeader>
              {section.resource?.title} {section.month?.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </DayGridViewSectionHeader>
          ) : null}

          <DayGridViewHeader>
            {section.columns.map(column => (
              <DayGridViewHeaderCell key={column.key} column={column}>
                {column.resource?.title} {column.date.toLocaleString('en-US', { weekday: 'short' })}
              </DayGridViewHeaderCell>
            ))}
          </DayGridViewHeader>
          {section.rows.map(week => (
            <DayGridViewRow key={week.key} row={week}>
              {week.days.map(day => (
                <DayGridViewDay key={day.key} day={day}>
                  <DayGridViewDayTrigger calendar={calendar} day={day} view='day'>
                    {day.date.day}
                  </DayGridViewDayTrigger>
                  <DayGridViewOverflow day={day} onClick={() => onOverflow(day.date.toString())}>
                    {day.hiddenCount} more
                  </DayGridViewOverflow>
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
// #endregion view
