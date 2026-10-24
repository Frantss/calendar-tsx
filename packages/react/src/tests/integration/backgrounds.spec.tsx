import type { backgroundFeature } from '@calendar-tsx/core';
import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';

import type { Calendar_DayGridLayout, Calendar_TimeGridLayout } from '@calendar-tsx/core';
import { createBackgroundLayer, dayGridView, timeGridView } from '@calendar-tsx/core';
import { DayGridView, DayGridViewDay, DayGridViewDayBackground, DayGridViewRow, DayGridViewSection } from '#views/day-grid/day-grid-view';
import type { Fixtures_EventData } from '#tests/support/calendar.fixtures';
import { calendarReactSetup_render } from '#tests/support/calendar.setup';
import { TimeGridView, TimeGridViewBackground, TimeGridViewBody, TimeGridViewColumn } from '#views/time-grid/time-grid-view';
import { useCalendarSelector } from '#calendar/calendar';

type Features = { backgroundFeature: ReturnType<typeof backgroundFeature> };

const views = {
  day: timeGridView({ days: 1 }),
  month: dayGridView({ period: 'month', maxEventsPerDay: 2 }),
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
  const grid = useCalendarSelector(state => state.layout) as Calendar_TimeGridLayout<Fixtures_EventData, null, Features>;

  return (
    <TimeGridView model={grid}>
      <TimeGridViewBody model={grid}>
        {grid.columns.map(column => (
          <TimeGridViewColumn key={column.key} column={column}>
            {column.backgrounds.map(background => (
              <TimeGridViewBackground key={background.key} background={background} />
            ))}
          </TimeGridViewColumn>
        ))}
      </TimeGridViewBody>
    </TimeGridView>
  );
};

const MonthBody = () => {
  const month = useCalendarSelector(state => state.layout) as Calendar_DayGridLayout<Fixtures_EventData, unknown, Features>;

  return (
    <DayGridView model={month}>
      {month.sections.map(section => (
        <DayGridViewSection key={section.key} section={section}>
          {section.rows.map(week => (
            <DayGridViewRow key={week.key} row={week}>
              {week.days.map(day => (
                <DayGridViewDay key={day.key} day={day}>
                  {day.backgrounds.map(background => (
                    <DayGridViewDayBackground key={background.key} background={background} />
                  ))}
                </DayGridViewDay>
              ))}
            </DayGridViewRow>
          ))}
        </DayGridViewSection>
      ))}
    </DayGridView>
  );
};

const part = (name: string) => [...document.querySelectorAll<HTMLElement>(`[data-part="${name}"]`)];

it('renders a time-grid background with its kind and geometry', async () => {
  await calendarReactSetup_render(<TimeGridBody />, { views, view: 'day', backgrounds: [lunch] });
  const [background] = part('time-grid-background');

  expect(part('time-grid-background')).toHaveLength(1);
  expect(background?.getAttribute('aria-hidden')).toBe('true');
  expect(background?.dataset).toMatchObject({ scope: 'calendar', kind: 'lunch', layer: 'lunch' });
  expect(background?.style.getPropertyValue('--cal-start')).toBe('0.5');
  expect(background?.style.getPropertyValue('--cal-span')).toBe(String(1 / 24));
});

it('renders a day background inside its month day', async () => {
  await calendarReactSetup_render(<MonthBody />, { views, view: 'month', backgrounds: [holiday] });
  const backgrounds = part('day-grid-day-background');

  expect(backgrounds).toHaveLength(1);
  expect(backgrounds[0]?.dataset).toMatchObject({ kind: 'holiday', layer: 'holiday' });
  expect(backgrounds[0]?.closest('[data-part="day-grid-day"]')?.getAttribute('data-date')).toBe('2026-03-11');
});
