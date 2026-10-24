import {
  DayGridViewDay,
  DayGridViewDayBackground,
  TimeGridViewBackground,
  TimeGridViewColumn,
} from '@calendar-tsx/solid';
import { For } from 'solid-js';

import type { BackgroundState } from '../core/backgrounds';

type Grid = Extract<BackgroundState['layout'], { kind: 'timeGrid' }>;
type Month = Extract<BackgroundState['layout'], { kind: 'dayGrid' }>;

// #region parts
// in the time grid: under the column's events
export const Column = (props: { column: Grid['columns'][number] }) => (
  <TimeGridViewColumn column={props.column}>
    <For each={props.column.backgrounds}>{background => <TimeGridViewBackground background={background} />}</For>
    {/* background events, events and the now indicator as usual */}
  </TimeGridViewColumn>
);

// in the month view: inside the day, beneath its content
export const Day = (props: { day: Month['sections'][number]['rows'][number]['days'][number] }) => (
  <DayGridViewDay day={props.day}>
    <For each={props.day.backgrounds}>{background => <DayGridViewDayBackground background={background} />}</For>
    {props.day.date.day}
  </DayGridViewDay>
);
// #endregion parts
