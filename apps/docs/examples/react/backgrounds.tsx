import { MonthViewDay, MonthViewDayBackground, TimeGridViewBackground, TimeGridViewColumn } from '@calendar-tsx/react';

import type { BackgroundState } from '../core/backgrounds';

type Grid = Extract<BackgroundState['layout'], { kind: 'timeGrid' }>;
type Month = Extract<BackgroundState['layout'], { kind: 'month' }>;

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
  <MonthViewDay day={day}>
    {day.backgrounds.map(background => (
      <MonthViewDayBackground key={background.key} background={background} />
    ))}
    {day.date.day}
  </MonthViewDay>
);
// #endregion parts
