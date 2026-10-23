import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import type { Temporal } from 'temporal-polyfill';
import { afterEach, expect, it, onTestFinished, vi } from 'vitest';

import type { Calendar_EventInput, Calendar_TimeGridLayout } from '@calendar-tsx/core';
import { calendarClock_fixed, calendarView_timeGrid } from '@calendar-tsx/core';
import { fixtures_at, fixtures_timeZone } from '#tests/calendar.fixtures';
import {
  TimeGridView_Body,
  TimeGridView_Column,
  TimeGridView_ColumnHeader,
  TimeGridView_ColumnTrigger,
  TimeGridView_Header,
  TimeGridView_NowIndicator,
  TimeGridView_Root,
} from '#time-grid-view';
import { Calendar_Root, useCalendarSelector } from '#use-calendar';

afterEach(() => {
  vi.restoreAllMocks();
});

const defaults = {
  views: { week: calendarView_timeGrid({ days: 7 }) },
  date: fixtures_at('2026-03-11', '12:00').toPlainDate(),
  events: [] as Calendar_EventInput<null>[],
  // the request is served just before midnight and hydrates just after it
  serverNow: fixtures_at('2026-03-11', '23:59:50').toInstant(),
  clientNow: fixtures_at('2026-03-12', '00:00:10').toInstant(),
};

const Week = () => {
  const grid = useCalendarSelector(state => state.layout) as Calendar_TimeGridLayout<null, unknown>;

  return (
    <TimeGridView_Root model={grid}>
      <TimeGridView_Header>
        {grid.columns.map(column => (
          <TimeGridView_ColumnHeader key={column.key} column={column}>
            <TimeGridView_ColumnTrigger column={column} view='week' />
          </TimeGridView_ColumnHeader>
        ))}
      </TimeGridView_Header>
      <TimeGridView_Body model={grid}>
        {grid.columns.map(column => (
          <TimeGridView_Column key={column.key} column={column}>
            <TimeGridView_NowIndicator column={column} />
          </TimeGridView_Column>
        ))}
      </TimeGridView_Body>
    </TimeGridView_Root>
  );
};

const App = ({ now, initialNow }: { now: Temporal.Instant; initialNow?: Temporal.Instant }) => (
  <Calendar_Root
    timeZone={fixtures_timeZone}
    views={defaults.views}
    view='week'
    date={defaults.date}
    events={defaults.events}
    onNavigate={() => {}}
    clock={calendarClock_fixed(now)}
    initialNow={initialNow}
  >
    <Week />
  </Calendar_Root>
);

/** Renders on a "server" clock, then hydrates the markup on a later "client" clock. */
const setup = async ({ initialNow }: { initialNow?: Temporal.Instant }) => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  const onRecoverableError = vi.fn();
  const container = document.createElement('div');

  container.innerHTML = renderToString(<App now={defaults.serverNow} initialNow={initialNow} />);
  document.body.append(container);

  const columns = () => [...container.querySelectorAll('[data-part="time-grid-column"]')];
  const ui = {
    todayIndex: () => columns().findIndex(column => column.hasAttribute('data-today')),
    serverTodayIndex: columns().findIndex(column => column.hasAttribute('data-today')),
  };

  const root = hydrateRoot(container, <App now={defaults.clientNow} initialNow={initialNow} />, { onRecoverableError });

  onTestFinished(() => {
    root.unmount();
    container.remove();
  });

  // the mount tick moves "today" to the client's day, so this waits for hydration and effects
  await vi.waitFor(() => expect(ui.todayIndex()).toBe(ui.serverTodayIndex + 1));

  return { ui, errors: () => [...consoleError.mock.calls, ...onRecoverableError.mock.calls] };
};

it('hydrates server markup without mismatches when both sides share initialNow', async () => {
  const { errors } = await setup({ initialNow: defaults.serverNow });

  expect(errors()).toEqual([]);
});

it('reports a hydration mismatch when the server and client derive different now values', async () => {
  const { errors } = await setup({});

  expect(errors().length).toBeGreaterThan(0);
});
