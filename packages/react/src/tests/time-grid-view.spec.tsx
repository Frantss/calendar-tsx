import { expect, it } from 'vitest';
import { page } from 'vitest/browser';

import type { Calendar_TimeGridLayout } from '@calendar-tsx/core';
import type { Fixtures_EventData } from '#tests/calendar.fixtures';
import { fixtures_allDay, fixtures_background, fixtures_resource, fixtures_timed } from '#tests/calendar.fixtures';
import {
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
  TimeGridView,
  TimeGridViewUnavailable,
} from '#time-grid-view';
import { useCalendarSelector } from '#use-calendar';
import type { CalendarReactSetup_Overrides } from '#tests/calendar-react.setup';
import { calendarReactSetup_render } from '#tests/calendar-react.setup';

const TimeGridBody = () => {
  const grid = useCalendarSelector(state => state.layout) as Calendar_TimeGridLayout<Fixtures_EventData, null>;

  return (
    <TimeGridView model={grid}>
      <TimeGridViewHeader>
        {grid.columns.map(column => (
          <TimeGridViewColumnHeader key={column.key} column={column}>
            {column.resource?.title}
            <TimeGridViewColumnTrigger column={column} view='day' />
          </TimeGridViewColumnHeader>
        ))}
      </TimeGridViewHeader>
      {grid.allDay && (
        <TimeGridViewAllDay>
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
            <TimeGridViewAxisLabel key={slot.key} slot={slot} />
          ))}
        </TimeGridViewAxis>
        {grid.columns.map(column => (
          <TimeGridViewColumn key={column.key} column={column}>
            {column.backgroundEvents.map(segment => (
              <TimeGridViewBackgroundEvent key={segment.key} segment={segment} />
            ))}
            {column.unavailable.map(segment => (
              <TimeGridViewUnavailable key={segment.key} segment={segment} />
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

const setup = async (overrides: CalendarReactSetup_Overrides = {}) => {
  const utils = await calendarReactSetup_render(<TimeGridBody />, { view: 'day', ...overrides });
  const part = (name: string) => [...document.querySelectorAll<HTMLElement>(`[data-part="${name}"]`)];

  const ui = {
    region: page.getByRole('region', { name: 'Time grid' }),
    event: (title: string) => page.getByRole('button', { name: title, exact: true }),
    part,
  };

  return { ...utils, ui };
};

it('exposes a labelled region with grid geometry', async () => {
  const { ui } = await setup({ view: 'week' });

  await expect.element(ui.region).toHaveAttribute('data-part', 'time-grid-root');
  expect(ui.region.element().getAttribute('style')).toBe('--cal-columns: 7; --cal-slots: 48; --cal-all-day-rows: 0;');
});

it('positions timed events and flags overlaps', async () => {
  const { ui } = await setup({
    events: [
      fixtures_timed('Yoga', { date: '2026-03-11', start: '09:00', end: '10:00' }),
      fixtures_timed('Pilates', { date: '2026-03-11', start: '09:30', end: '11:00' }),
    ],
  });

  await expect.element(ui.event('Yoga')).toHaveAttribute('data-overlap', '');
  expect(ui.event('Yoga').element().getAttribute('style')).toMatch(
    /^--cal-start: 0\.375; --cal-span: 0\.0416+\d*; --cal-lane: 0; --cal-lanes: 2; --cal-inline-start: 0; --cal-inline-size: 0\.5;$/,
  );
  expect(ui.event('Pilates').element().getAttribute('style')).toContain('--cal-lane: 1; --cal-lanes: 2; --cal-inline-start: 0.5;');
  expect(ui.part('time-grid-column')[0]?.getAttribute('style')).toBe('--cal-column-lanes: 2;');
});

it('renders all-day events in the all-day row only', async () => {
  const { ui } = await setup({ events: [fixtures_allDay('Fair', { start: '2026-03-11' })] });

  await expect.element(ui.event('Fair')).toHaveAttribute('data-part', 'time-grid-all-day-event');
});

it('marks unavailable resources and shades their columns', async () => {
  const { ui } = await setup({
    view: 'resources',
    resources: [fixtures_resource('Ana', [{ date: '2026-03-11', start: '09:00', end: '17:00' }]), fixtures_resource('Room')],
  });
  const headers = ui.part('time-grid-column-header');

  expect(headers.map(header => [header.getAttribute('data-resource-id'), header.hasAttribute('data-unavailable')])).toEqual([
    ['Ana', false],
    ['Room', true],
  ]);
  expect(ui.part('time-grid-unavailable')).toHaveLength(3);
  expect(ui.part('time-grid-unavailable').every(shade => shade.getAttribute('aria-hidden') === 'true')).toBe(true);
});

it("renders the now indicator only in today's column", async () => {
  const { ui } = await setup({ view: 'week' });
  const indicators = ui.part('time-grid-now');

  expect(indicators).toHaveLength(1);
  expect(indicators[0]?.closest('[data-part="time-grid-column"]')?.hasAttribute('data-today')).toBe(true);
});

it('navigates from a column trigger', async () => {
  const { mocks } = await setup({ view: 'week' });

  await page.getByRole('button', { name: 'Go to Friday, March 13, 2026' }).click();

  expect(mocks.onNavigate.mock.calls[0]?.[0]).toMatchObject({ view: 'day' });
  expect(mocks.onNavigate.mock.calls[0]?.[0].date.toString()).toBe('2026-03-13');
});

it('renders background events as inert shades under the events', async () => {
  const { ui } = await setup({
    view: 'week',
    events: [
      fixtures_background(fixtures_timed('Closed', { date: '2026-03-11', start: '12:00', end: '18:00' })),
      fixtures_background(fixtures_allDay('Break', { start: '2026-03-12', end: '2026-03-13' })),
    ],
  });
  const [allDay] = ui.part('time-grid-all-day-background-event');
  const shades = ui.part('time-grid-background-event');

  expect(allDay?.getAttribute('style')).toBe('--cal-col-start: 4; --cal-col-span: 2;');
  expect(shades.map(shade => shade.getAttribute('style'))).toEqual([
    '--cal-start: 0.5; --cal-span: 0.25;',
    '--cal-start: 0; --cal-span: 1;',
    '--cal-start: 0; --cal-span: 1;',
  ]);
  expect(shades[1]?.hasAttribute('data-continues-after')).toBe(true);
  expect([allDay, ...shades].every(shade => shade?.getAttribute('aria-hidden') === 'true')).toBe(true);
});
