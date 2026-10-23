import { afterEach, beforeEach, expect, it } from 'vitest';

import type { Calendar_MonthLayout } from '@calendar-tsx/core';
import { MonthViewDay, MonthViewDayTrigger, MonthView, MonthViewWeek, MonthViewWeekEvent, useCalendarSelector } from '@calendar-tsx/react';
import type { ThemesSetup_EventData } from '#tests/themes.setup';
import '../../material-ui.css';

import { themesSetup_allDay, themesSetup_part, themesSetup_render } from '#tests/themes.setup';

const Month = () => {
  const month = useCalendarSelector(state => state.layout) as Calendar_MonthLayout<ThemesSetup_EventData>;

  return (
    <MonthView model={month}>
      {month.weeks.map(week => (
        <MonthViewWeek key={week.key} week={week}>
          {week.days.map(day => (
            <MonthViewDay key={day.key} day={day}>
              <MonthViewDayTrigger day={day} view='month'>
                {day.date.day}
              </MonthViewDayTrigger>
            </MonthViewDay>
          ))}
          {week.segments.map(segment => (
            <MonthViewWeekEvent key={segment.key} segment={segment}>
              {segment.event.data.title}
            </MonthViewWeekEvent>
          ))}
        </MonthViewWeek>
      ))}
    </MonthView>
  );
};

// A stand-in for the variables MUI emits, with the light scheme on :root and the dark one under each built-in selector
const muiVariables = `
  :root {
    --mui-palette-background-paper: rgb(255, 255, 255);
    --mui-palette-primary-main: rgb(25, 118, 210);
    --mui-palette-primary-contrastText: rgb(255, 255, 255);
    --mui-shape-borderRadius: 4px;
  }
  .dark, [data-dark], [data-mui-color-scheme='dark'] {
    --mui-palette-background-paper: rgb(18, 18, 18);
    --mui-palette-primary-main: rgb(144, 202, 249);
    --mui-palette-primary-contrastText: rgba(0, 0, 0, 0.87);
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

/** Resolves a color the way the theme's event fill does: the primary color tinted 16% into the paper. */
const tint = (primary: string, paper: string) => {
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.color = `color-mix(in oklab, ${primary} 16%, ${paper})`;
  const color = getComputedStyle(probe).color;
  probe.remove();

  return color;
};

const today = () => themesSetup_part('month-day', '[data-today]')[0]?.querySelector('[data-part="month-day-trigger"]');
const bar = () => themesSetup_part('month-week-event')[0];
const events = [themesSetup_allDay('Fair', { start: '2026-03-11', end: '2026-03-11' })];

it('takes the accent, event fill and radius from the MUI variables', async () => {
  await themesSetup_render(<Month />, { view: 'month', events });

  expect(today() && getComputedStyle(today()!).backgroundColor).toBe('rgb(25, 118, 210)');
  expect(today() && getComputedStyle(today()!).color).toBe('rgb(255, 255, 255)');
  expect(getComputedStyle(bar()!).backgroundColor).toBe(tint('rgb(25, 118, 210)', 'rgb(255, 255, 255)'));
  expect(getComputedStyle(bar()!).borderTopLeftRadius).toBe('4px');
});

it('follows the dark scheme class on the root element', async () => {
  document.documentElement.classList.add('dark');
  await themesSetup_render(<Month />, { view: 'month', events });

  expect(today() && getComputedStyle(today()!).backgroundColor).toBe('rgb(144, 202, 249)');
  expect(getComputedStyle(bar()!).backgroundColor).toBe(tint('rgb(144, 202, 249)', 'rgb(18, 18, 18)'));
});

it.each(['dark', 'data-dark', 'data-mui-color-scheme'])('follows a dark scheme set by %s on an element inside the page', async selector => {
  await themesSetup_render(<Month />, { view: 'month', events, className: selector === 'dark' ? 'dark' : undefined });
  const root = themesSetup_part('month-root')[0]!.parentElement!;
  if (selector !== 'dark') root.setAttribute(selector, 'dark');

  expect(today() && getComputedStyle(today()!).backgroundColor).toBe('rgb(144, 202, 249)');
});
