import {
  MonthView,
  MonthViewDay,
  MonthViewDayTrigger,
  MonthViewHeader,
  MonthViewHeaderCell,
  MonthViewOverflow,
  MonthViewWeek,
  MonthViewWeekBackgroundEvent,
  MonthViewWeekEvent,
  useCalendarSelector,
} from '@calendar-tsx/react';

import type { State } from '../core/setup';

// #region view
export const Month = ({ onOverflow }: { onOverflow: (date: string) => void }) => {
  const layout = useCalendarSelector((state: State) => state.layout);

  if (layout.kind !== 'month') return null;

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
              <MonthViewOverflow day={day} onClick={() => onOverflow(day.date.toString())}>
                {day.hiddenCount} more
              </MonthViewOverflow>
            </MonthViewDay>
          ))}
          {week.backgroundEvents.map(segment => (
            <MonthViewWeekBackgroundEvent key={segment.key} segment={segment} />
          ))}
          {week.segments.map(segment => (
            <MonthViewWeekEvent key={segment.key} segment={segment}>
              {segment.event.data.title}
            </MonthViewWeekEvent>
          ))}
        </MonthViewWeek>
      ))}
    </MonthView>
  );
};
// #endregion view
