import {
  DayGridView,
  DayGridViewDay,
  DayGridViewDayTrigger,
  DayGridViewHeader,
  DayGridViewHeaderCell,
  DayGridViewOverflow,
  DayGridViewWeek,
  DayGridViewWeekBackgroundEvent,
  DayGridViewWeekEvent,
  useCalendarSelector,
} from '@calendar-tsx/react';

import type { State } from '../core/setup';

// #region view
export const DayGrid = ({ onOverflow }: { onOverflow: (date: string) => void }) => {
  const layout = useCalendarSelector((state: State) => state.layout);

  if (layout.kind !== 'dayGrid') return null;

  return (
    <DayGridView model={layout}>
      <DayGridViewHeader>
        {layout.weekdays.map(weekday => (
          <DayGridViewHeaderCell key={weekday.toString()} weekday={weekday}>
            {weekday.toLocaleString('en-US', { weekday: 'short' })}
          </DayGridViewHeaderCell>
        ))}
      </DayGridViewHeader>
      {layout.weeks.map(week => (
        <DayGridViewWeek key={week.key} week={week}>
          {week.days.map(day => (
            <DayGridViewDay key={day.key} day={day}>
              <DayGridViewDayTrigger day={day} view='day'>
                {day.date.day}
              </DayGridViewDayTrigger>
              <DayGridViewOverflow day={day} onClick={() => onOverflow(day.date.toString())}>
                {day.hiddenCount} more
              </DayGridViewOverflow>
            </DayGridViewDay>
          ))}
          {week.backgroundEvents.map(segment => (
            <DayGridViewWeekBackgroundEvent key={segment.key} segment={segment} />
          ))}
          {week.segments.map(segment => (
            <DayGridViewWeekEvent key={segment.key} segment={segment}>
              {segment.event.data.title}
            </DayGridViewWeekEvent>
          ))}
        </DayGridViewWeek>
      ))}
    </DayGridView>
  );
};
// #endregion view
