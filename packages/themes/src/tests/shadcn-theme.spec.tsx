import { afterEach, beforeEach, expect, it } from 'vitest';

import type { Calendar_DayGridLayout } from '@calendar-tsx/core';
import {
  DayGridViewDay,
  DayGridViewDayTrigger,
  DayGridView,
  DayGridViewRow,
  DayGridViewRowEvent,
  useCalendarSelector,
  DayGridViewSection,
} from '@calendar-tsx/react';
import type { ThemesSetup_EventData } from '#tests/themes.setup';
import '../../shadcn.css';

import { themesSetup_allDay, themesSetup_part, themesSetup_render } from '#tests/themes.setup';

const Month = () => {
  const month = useCalendarSelector(state => state.layout) as Calendar_DayGridLayout<ThemesSetup_EventData>;

  return (
    <DayGridView model={month}>
      {month.sections.map(section => (
        <DayGridViewSection key={section.key} section={section}>
          {section.rows.map(week => (
            <DayGridViewRow key={week.key} row={week}>
              {week.days.map(day => (
                <DayGridViewDay key={day.key} day={day}>
                  <DayGridViewDayTrigger day={day} view='month'>
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

// A stand-in for an app's shadcn variables, light on :root and dark under .dark
const shadcnVariables = `
  :root { --background: rgb(255, 255, 255); --primary: rgb(10, 20, 30); --primary-foreground: rgb(250, 250, 250); --radius: 10px; }
  .dark { --background: rgb(0, 0, 0); --primary: rgb(230, 231, 232); }
`;

let style: HTMLStyleElement;

beforeEach(() => {
  style = document.head.appendChild(document.createElement('style'));
  style.textContent = shadcnVariables;
});

afterEach(() => {
  style.remove();
  document.documentElement.classList.remove('dark');
});

/** Resolves a color the way the theme's event fill does: --primary tinted 16% into --background. */
const tint = (primary: string, background: string) => {
  const probe = document.body.appendChild(document.createElement('div'));
  probe.style.color = `color-mix(in oklab, ${primary} 16%, ${background})`;
  const color = getComputedStyle(probe).color;
  probe.remove();

  return color;
};

const today = () => themesSetup_part('day-grid-day', '[data-today]')[0]?.querySelector('[data-part="day-grid-day-trigger"]');
const bar = () => themesSetup_part('day-grid-row-event')[0];
const events = [themesSetup_allDay('Fair', { start: '2026-03-11', end: '2026-03-11' })];

it('takes the accent, event fill and radius from the shadcn variables', async () => {
  await themesSetup_render(<Month />, { view: 'month', events });

  expect(today() && getComputedStyle(today()!).backgroundColor).toBe('rgb(10, 20, 30)');
  expect(getComputedStyle(bar()!).backgroundColor).toBe(tint('rgb(10, 20, 30)', 'rgb(255, 255, 255)'));
  expect(getComputedStyle(bar()!).borderTopLeftRadius).toBe('6px');
});

it('follows .dark on the root element', async () => {
  document.documentElement.classList.add('dark');
  await themesSetup_render(<Month />, { view: 'month', events });

  expect(today() && getComputedStyle(today()!).backgroundColor).toBe('rgb(230, 231, 232)');
  expect(getComputedStyle(bar()!).backgroundColor).toBe(tint('rgb(230, 231, 232)', 'rgb(0, 0, 0)'));
});

it('follows .dark on an element inside the page', async () => {
  await themesSetup_render(<Month />, { view: 'month', events, className: 'dark' });

  expect(today() && getComputedStyle(today()!).backgroundColor).toBe('rgb(230, 231, 232)');
});
