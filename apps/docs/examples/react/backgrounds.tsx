import {
  DayGridViewDay,
  DayGridViewDayBackground,
  TimeGridViewBackground,
  TimeGridViewColumn,
} from '@calendar-tsx/react';

import type { BackgroundState } from '../core/backgrounds';

type Grid = Extract<BackgroundState['layout'], { kind: 'timeGrid' }>;
type Month = Extract<BackgroundState['layout'], { kind: 'dayGrid' }>;

// #region parts
// in the time grid: under the column's events
export const Column = ({ column }: { column: Grid['columns'][number] }) => (
  <TimeGridViewColumn column={column}>
    {column.backgrounds.map(background => (
      <TimeGridViewBackground key={background.key} background={background} />
    ))}
    {/* background events, events and the now indicator as usual */}
  </TimeGridViewColumn>
);

// in the month view: inside the day, beneath its content
export const Day = ({ day }: { day: Month['weeks'][number]['days'][number] }) => (
  <DayGridViewDay day={day}>
    {day.backgrounds.map(background => (
      <DayGridViewDayBackground key={background.key} background={background} />
    ))}
    {day.date.day}
  </DayGridViewDay>
);
// #endregion parts
