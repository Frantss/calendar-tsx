import { For } from 'solid-js';
import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';

import type { Calendar_MonthLayout, Calendar_TimeGridLayout } from '@calendar-tsx/core';
import { backgroundFeature, createBackgroundLayer, monthView, timeGridView } from '@calendar-tsx/core';
import { MonthView, MonthViewDay, MonthViewDayBackground, MonthViewWeek } from '#month-view';
import type { Fixtures_EventData } from '#tests/calendar.fixtures';
import { calendarSolidSetup_render } from '#tests/calendar-solid.setup';
import { TimeGridView, TimeGridViewBackground, TimeGridViewBody, TimeGridViewColumn } from '#time-grid-view';
import { useCalendarSelector } from '#use-calendar';

type Features = { backgroundFeature: typeof backgroundFeature };

const views = {
  day: timeGridView({ days: 1, features: { backgroundFeature } }),
  month: monthView({ maxEventsPerDay: 2, features: { backgroundFeature } }),
};

const holiday = createBackgroundLayer({
  id: 'holiday',
  kind: 'holiday',
  ranges: [{ allDay: true, start: Temporal.PlainDate.from('2026-03-11') }],
});

const lunch = createBackgroundLayer({
  id: 'lunch',
  kind: 'lunch',
  ranges: [
    {
      start: Temporal.ZonedDateTime.from('2026-03-11T12:00[America/New_York]'),
      end: Temporal.ZonedDateTime.from('2026-03-11T13:00[America/New_York]'),
    },
  ],
});

const TimeGridBody = () => {
  const grid = useCalendarSelector(state => state.layout as Calendar_TimeGridLayout<Fixtures_EventData, null, Features>);

  return (
    <TimeGridView model={grid()}>
      <TimeGridViewBody model={grid()}>
        <For each={grid().columns}>
          {column => (
            <TimeGridViewColumn column={column}>
              <For each={column.backgrounds}>{background => <TimeGridViewBackground background={background} />}</For>
            </TimeGridViewColumn>
          )}
        </For>
      </TimeGridViewBody>
    </TimeGridView>
  );
};

const MonthBody = () => {
  const month = useCalendarSelector(state => state.layout as Calendar_MonthLayout<Fixtures_EventData, Features>);

  return (
    <MonthView model={month()}>
      <For each={month().weeks}>
        {week => (
          <MonthViewWeek week={week}>
            <For each={week.days}>
              {day => (
                <MonthViewDay day={day}>
                  <For each={day.backgrounds}>{background => <MonthViewDayBackground background={background} />}</For>
                </MonthViewDay>
              )}
            </For>
          </MonthViewWeek>
        )}
      </For>
    </MonthView>
  );
};

const part = (name: string) => [...document.querySelectorAll<HTMLElement>(`[data-part="${name}"]`)];

it('renders a time-grid background with its kind and geometry', () => {
  calendarSolidSetup_render(() => <TimeGridBody />, { views, view: 'day', backgrounds: [lunch] });
  const [background] = part('time-grid-background');

  expect(part('time-grid-background')).toHaveLength(1);
  expect(background?.getAttribute('aria-hidden')).toBe('true');
  expect(background?.dataset).toMatchObject({ scope: 'calendar', kind: 'lunch', layer: 'lunch' });
  expect(background?.style.getPropertyValue('--cal-start')).toBe('0.5');
  expect(background?.style.getPropertyValue('--cal-span')).toBe(String(1 / 24));
});

it('renders a day background inside its month day', () => {
  calendarSolidSetup_render(() => <MonthBody />, { views, view: 'month', backgrounds: [holiday] });
  const backgrounds = part('month-day-background');

  expect(backgrounds).toHaveLength(1);
  expect(backgrounds[0]?.dataset).toMatchObject({ kind: 'holiday', layer: 'holiday' });
  expect(backgrounds[0]?.closest('[data-part="month-day"]')?.getAttribute('data-date')).toBe('2026-03-11');
});
