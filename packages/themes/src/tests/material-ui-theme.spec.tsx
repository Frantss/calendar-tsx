import { afterEach, beforeEach, expect, it } from 'vitest';

import type { Calendar_DayGridLayout } from '@calendar-tsx/core';
import {
  DayGridViewDay,
  DayGridViewDayTrigger,
  DayGridView,
  DayGridViewRow,
  DayGridViewRowEvent,
  useCalendarSelector,
  useCalendarContext,
  DayGridViewSection,
} from '@calendar-tsx/react';
import type { ThemesSetup_EventData } from '#tests/themes.setup';
import '../../material-ui.css';

import { themesSetup_allDay, themesSetup_part, themesSetup_render } from '#tests/themes.setup';

const Month = () => {
  const { instance: calendar } = useCalendarContext();
  const month = useCalendarSelector(state => state.layout) as Calendar_DayGridLayout<ThemesSetup_EventData>;

  return (
    <DayGridView model={month}>
      {month.sections.map(section => (
        <DayGridViewSection key={section.key} section={section}>
          {section.rows.map(week => (
            <DayGridViewRow key={week.key} row={week}>
              {week.days.map(day => (
                <DayGridViewDay key={day.key} day={day}>
                  <DayGridViewDayTrigger calendar={calendar} day={day} view='month'>
                    {day.date.day}
                  </DayGridViewDayTrigger>
                </DayGridViewDay>
              ))}
              {week.segments.map(segment => (
                <DayGridViewRowEvent key={segment.key} segment={segment}>
                  {segment.event.data.title}
                </DayGridViewRowEvent>
              ))}
            </DayGridViewRow>
          ))}
        </DayGridViewSection>
      ))}
    </DayGridView>
  );
};

// A stand-in for the variables MUI emits, with the light scheme on :root and the dark one under each built-in selector
const muiVariables = `
  :root {
    --mui-palette-background-paper: rgb(255, 255, 255);
    --mui-palette-primary-main: rgb(25, 118, 210);
    --mui-palette-primary-contrastText: rgb(255, 255, 255);
    --mui-palette-secondary-main: rgb(156, 39, 176);
    --mui-palette-secondary-contrastText: rgb(255, 255, 255);
    --mui-shape-borderRadius: 4px;
  }
  .dark, [data-dark], [data-mui-color-scheme='dark'] {
    --mui-palette-background-paper: rgb(18, 18, 18);
    --mui-palette-primary-main: rgb(144, 202, 249);
    --mui-palette-primary-contrastText: rgba(0, 0, 0, 0.87);
    --mui-palette-secondary-main: rgb(206, 147, 216);
    --mui-palette-secondary-contrastText: rgba(0, 0, 0, 0.87);
  }
`;

let style: HTMLStyleElement;

beforeEach(() => {
  style = document.head.appendChild(document.createElement('style'));
  style.textContent = muiVariables;
});

afterEach(() => {
  style.remove();
  document.documentElement.classList.remove('dark');
});

const today = () => themesSetup_part('day-grid-day', '[data-today]')[0]?.querySelector('[data-part="day-grid-day-trigger"]');
const bar = () => themesSetup_part('day-grid-row-event')[0];
const events = [themesSetup_allDay('Fair', { start: '2026-03-11', end: '2026-03-11' })];

it('takes the accent, event color and radius from the MUI variables', async () => {
  await themesSetup_render(<Month />, { view: 'month', events });

  expect(today() && getComputedStyle(today()!).backgroundColor).toBe('rgb(25, 118, 210)');
  expect(today() && getComputedStyle(today()!).color).toBe('rgb(255, 255, 255)');
  expect(getComputedStyle(bar()!).backgroundColor).toBe('rgb(156, 39, 176)');
  expect(getComputedStyle(bar()!).color).toBe('rgb(255, 255, 255)');
  expect(getComputedStyle(bar()!).borderTopLeftRadius).toBe('4px');
});

it('follows the dark scheme class on the root element', async () => {
  document.documentElement.classList.add('dark');
  await themesSetup_render(<Month />, { view: 'month', events });

  expect(today() && getComputedStyle(today()!).backgroundColor).toBe('rgb(144, 202, 249)');
  expect(getComputedStyle(bar()!).backgroundColor).toBe('rgb(206, 147, 216)');
  expect(getComputedStyle(bar()!).color).toBe('rgba(0, 0, 0, 0.87)');
});

it.each(['dark', 'data-dark', 'data-mui-color-scheme'])('follows a dark scheme set by %s on an element inside the page', async selector => {
  await themesSetup_render(<Month />, { view: 'month', events, className: selector === 'dark' ? 'dark' : undefined });
  const root = themesSetup_part('day-grid-root')[0]!.parentElement!;
  if (selector !== 'dark') root.setAttribute(selector, 'dark');

  expect(today() && getComputedStyle(today()!).backgroundColor).toBe('rgb(144, 202, 249)');
});
