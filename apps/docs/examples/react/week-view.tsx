import {
  TimeGridView,
  TimeGridViewAllDay,
  TimeGridViewAllDayBackgroundEvent,
  TimeGridViewAllDayEvent,
  TimeGridViewAxis,
  TimeGridViewAxisLabel,
  TimeGridViewBackgroundEvent,
  TimeGridViewBody,
  TimeGridViewColumn,
  TimeGridViewColumnHeader,
  TimeGridViewColumnTrigger,
  TimeGridViewEvent,
  TimeGridViewHeader,
  TimeGridViewNowIndicator,
} from '@calendar-tsx/react';
import { useCalendarSelector } from '@calendar-tsx/react';

import type { State } from '../core/setup';

// #region view
export const Week = () => {
  const grid = useCalendarSelector((state: State) => state.layout);

  if (grid.kind !== 'timeGrid') return null;

  return (
    <TimeGridView model={grid}>
      <TimeGridViewHeader>
        {grid.columns.map(column => (
          <TimeGridViewColumnHeader key={column.key} column={column}>
            <TimeGridViewColumnTrigger column={column} view='day'>
              {column.date.toLocaleString('en-US', { weekday: 'short', day: 'numeric' })}
            </TimeGridViewColumnTrigger>
          </TimeGridViewColumnHeader>
        ))}
      </TimeGridViewHeader>
      {grid.allDay && (
        <TimeGridViewAllDay>
          {/* before the bars: grid items paint in DOM order */}
          {grid.allDay.backgroundEvents.map(segment => (
            <TimeGridViewAllDayBackgroundEvent key={segment.key} segment={segment} />
          ))}
          {grid.allDay.segments.map(segment => (
            <TimeGridViewAllDayEvent key={segment.key} segment={segment}>
              {segment.event.data.title}
            </TimeGridViewAllDayEvent>
          ))}
        </TimeGridViewAllDay>
      )}
      <TimeGridViewBody model={grid}>
        <TimeGridViewAxis>
          {grid.slots.map(slot => (
            <TimeGridViewAxisLabel key={slot.key} slot={slot}>
              {slot.time.minute === 0 ? slot.time.toLocaleString('en-US', { hour: 'numeric' }) : null}
            </TimeGridViewAxisLabel>
          ))}
        </TimeGridViewAxis>
        {grid.columns.map(column => (
          <TimeGridViewColumn key={column.key} column={column}>
            {column.backgroundEvents.map(segment => (
              <TimeGridViewBackgroundEvent key={segment.key} segment={segment} />
            ))}
            {column.segments.map(segment => (
              <TimeGridViewEvent key={segment.key} segment={segment}>
                {segment.event.data.title}
              </TimeGridViewEvent>
            ))}
            <TimeGridViewNowIndicator column={column} />
          </TimeGridViewColumn>
        ))}
      </TimeGridViewBody>
    </TimeGridView>
  );
};
// #endregion view
