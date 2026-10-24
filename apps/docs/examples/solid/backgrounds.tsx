import { MonthViewDay, MonthViewDayBackground, TimeGridViewBackground, TimeGridViewColumn } from '@calendar-tsx/solid';
import { For } from 'solid-js';

import type { BackgroundState } from '../core/backgrounds';

type Grid = Extract<BackgroundState['layout'], { kind: 'timeGrid' }>;
type Month = Extract<BackgroundState['layout'], { kind: 'month' }>;

// #region parts
// in the time grid: under the column's events
export const Column = (props: { column: Grid['columns'][number] }) => (
  <TimeGridViewColumn column={props.column}>
    <For each={props.column.backgrounds}>{background => <TimeGridViewBackground background={background} />}</For>
    {/* background events, events and the now indicator as usual */}
  </TimeGridViewColumn>
);

// in the month view: inside the day, beneath its content
export const Day = (props: { day: Month['weeks'][number]['days'][number] }) => (
  <MonthViewDay day={props.day}>
    <For each={props.day.backgrounds}>{background => <MonthViewDayBackground background={background} />}</For>
    {props.day.date.day}
  </MonthViewDay>
);
// #endregion parts
