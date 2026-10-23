import {
  TimeGridView,
  TimeGridViewBody,
  TimeGridViewColumn,
  TimeGridViewColumnHeader,
  TimeGridViewEvent,
  TimeGridViewHeader,
  TimeGridViewUnavailable,
  useCalendarSelector,
} from '@calendar-tsx/react';

import type { State } from '../core/setup';

// #region view
export const Rooms = () => {
  const grid = useCalendarSelector((state: State) => state.layout);

  if (grid.kind !== 'timeGrid') return null;

  return (
    <TimeGridView model={grid}>
      <TimeGridViewHeader>
        {grid.columns.map(column => (
          <TimeGridViewColumnHeader key={column.key} column={column}>
            {column.resource?.title}
            {column.isUnavailable && ' (closed)'}
          </TimeGridViewColumnHeader>
        ))}
      </TimeGridViewHeader>
      <TimeGridViewBody model={grid}>
        {grid.columns.map(column => (
          <TimeGridViewColumn key={column.key} column={column}>
            {column.unavailable.map(segment => (
              <TimeGridViewUnavailable key={segment.key} segment={segment} />
            ))}
            {column.segments.map(segment => (
              <TimeGridViewEvent key={segment.key} segment={segment}>
                {segment.event.data.title}
              </TimeGridViewEvent>
            ))}
          </TimeGridViewColumn>
        ))}
      </TimeGridViewBody>
    </TimeGridView>
  );
};
// #endregion view
