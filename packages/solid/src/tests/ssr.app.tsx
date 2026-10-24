import { For } from 'solid-js';
import { Temporal } from 'temporal-polyfill';

import type { Calendar_EventInput, Calendar_TimeGridLayout } from '@calendar-tsx/core';
import { calendarViews, calendarFeatures, fixedClock, timeGridView } from '@calendar-tsx/core';
import { fixtures_at, fixtures_timeZone } from '#tests/calendar.fixtures';
import {
  TimeGridViewBody,
  TimeGridViewColumn,
  TimeGridViewColumnHeader,
  TimeGridViewColumnTrigger,
  TimeGridViewHeader,
  TimeGridViewNowIndicator,
  TimeGridView,
} from '#time-grid-view';
import { Calendar, useCalendarContext, useCalendarSelector } from '#use-calendar';

export const ssrApp_defaults = {
  views: calendarViews({ features: calendarFeatures({}), views: { week: timeGridView({ days: 7 }) } }),
  date: fixtures_at('2026-03-11', '12:00').toPlainDate(),
  events: [] as Calendar_EventInput<null>[],
  // the request is served just before midnight and hydrates just after it
  serverNow: fixtures_at('2026-03-11', '23:59:50').toInstant(),
  clientNow: fixtures_at('2026-03-12', '00:00:10').toInstant(),
};

/** Instants travel as strings: the server side runs in Node, behind a browser command. */
export type SsrApp_Props = { now: string; initialNow?: string | undefined };

const Week = () => {
  const { instance: calendar } = useCalendarContext();
  const grid = useCalendarSelector(state => state.layout as Calendar_TimeGridLayout<null, unknown>);

  return (
    <TimeGridView model={grid()}>
      <TimeGridViewHeader>
        <For each={grid().columns}>
          {column => (
            <TimeGridViewColumnHeader column={column}>
              <TimeGridViewColumnTrigger calendar={calendar} column={column} view='week' />
            </TimeGridViewColumnHeader>
          )}
        </For>
      </TimeGridViewHeader>
      <TimeGridViewBody model={grid()}>
        <For each={grid().columns}>
          {column => (
            <TimeGridViewColumn column={column}>
              <TimeGridViewNowIndicator column={column} />
            </TimeGridViewColumn>
          )}
        </For>
      </TimeGridViewBody>
    </TimeGridView>
  );
};

/** The same app on both sides; only the clock differs, as between a server and a browser. */
export const SsrApp = (props: SsrApp_Props) => (
  <Calendar
    timeZone={fixtures_timeZone}
    views={ssrApp_defaults.views}
    features={{}}
    view='week'
    date={ssrApp_defaults.date}
    events={ssrApp_defaults.events}
    onNavigate={() => {}}
    clock={fixedClock(Temporal.Instant.from(props.now))}
    initialNow={props.initialNow === undefined ? undefined : Temporal.Instant.from(props.initialNow)}
  >
    <Week />
  </Calendar>
);
