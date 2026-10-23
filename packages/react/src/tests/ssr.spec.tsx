import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import type { Temporal } from 'temporal-polyfill';
import { afterEach, expect, it, onTestFinished, vi } from 'vitest';

import type { Calendar_EventInput, Calendar_TimeGridLayout } from '@calendar-tsx/core';
import { fixedClock, timeGridView, createCalendarViews } from '@calendar-tsx/core';
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
import { Calendar, useCalendarSelector } from '#use-calendar';

afterEach(() => {
  vi.restoreAllMocks();
});

const defaults = {
  views: createCalendarViews({ week: timeGridView({ days: 7 }) }),
  date: fixtures_at('2026-03-11', '12:00').toPlainDate(),
  events: [] as Calendar_EventInput<null>[],
  // the request is served just before midnight and hydrates just after it
  serverNow: fixtures_at('2026-03-11', '23:59:50').toInstant(),
  clientNow: fixtures_at('2026-03-12', '00:00:10').toInstant(),
};

const Week = () => {
  const grid = useCalendarSelector(state => state.layout) as Calendar_TimeGridLayout<null, unknown>;

  return (
    <TimeGridView model={grid}>
      <TimeGridViewHeader>
        {grid.columns.map(column => (
          <TimeGridViewColumnHeader key={column.key} column={column}>
            <TimeGridViewColumnTrigger column={column} view='week' />
          </TimeGridViewColumnHeader>
        ))}
      </TimeGridViewHeader>
      <TimeGridViewBody model={grid}>
        {grid.columns.map(column => (
          <TimeGridViewColumn key={column.key} column={column}>
            <TimeGridViewNowIndicator column={column} />
          </TimeGridViewColumn>
        ))}
      </TimeGridViewBody>
    </TimeGridView>
  );
};

const App = ({ now, initialNow }: { now: Temporal.Instant; initialNow?: Temporal.Instant }) => (
  <Calendar
    timeZone={fixtures_timeZone}
    views={defaults.views.views}
    features={defaults.views.features}
    view='week'
    date={defaults.date}
    events={defaults.events}
    onNavigate={() => {}}
    clock={fixedClock(now)}
    initialNow={initialNow}
  >
    <Week />
  </Calendar>
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
