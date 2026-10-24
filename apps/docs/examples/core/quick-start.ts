// #region app
import type { Calendar_DayGridLayout } from '@calendar-tsx/core';
import { createCalendar, createCalendarViews, dayGridView, timeGridView } from '@calendar-tsx/core';
import '@calendar-tsx/themes/default.css';
import { Temporal } from 'temporal-polyfill';

type Booking = { title: string };

const views = createCalendarViews({
  month: dayGridView({ period: 'month', maxEventsPerDay: 3 }),
  week: timeGridView({ days: 7 }),
});

const calendar = createCalendar({
  timeZone: 'America/New_York',
  views: views.views,
  features: { ...views.features },
  view: 'month',
  date: Temporal.Now.plainDateISO(),
  events: [{ id: 'standup', kind: 'allDay', start: Temporal.Now.plainDateISO(), data: { title: 'Standup' } }],
  // `view` and `date` are controlled: apply the next ones yourself
  onNavigate: next => calendar['~update']({ ...calendar.options, view: next.view, date: next.date }),
});

// the attributes and custom properties the themes read
const part = (tag: string, name: string, attributes: Record<string, string> = {}) => {
  const element = document.createElement(tag);

  element.dataset['scope'] = 'calendar';
  element.dataset['part'] = name;
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);

  return element;
};

const renderDayGrid = (layout: Calendar_DayGridLayout<Booking>) => {
  const root = part('div', 'day-grid-root', { role: 'grid' });

  for (const week of layout.weeks) {
    const row = part('div', 'day-grid-week', { role: 'row' });

    row.style.setProperty('--cal-rows', String(week.rows));
    for (const day of week.days) {
      const cell = part('div', 'day-grid-day', { role: 'gridcell' });

      if (day.isToday) cell.dataset['today'] = '';
      if (day.isOutside) cell.dataset['outside'] = '';
      cell.textContent = String(day.date.day);
      row.append(cell);
    }
    for (const segment of week.segments) {
      const bar = part('button', 'day-grid-week-event', { type: 'button' });

      bar.style.setProperty('--cal-col-start', String(segment.colStart));
      bar.style.setProperty('--cal-col-span', String(segment.colSpan));
      bar.style.setProperty('--cal-row', String(segment.row));
      bar.textContent = segment.event.data.title;
      row.append(bar);
    }
    root.append(row);
  }

  return root;
};

const container = document.querySelector('#calendar')!;

const render = () => {
  const { layout } = calendar.store.state;

  if (layout.kind === 'dayGrid') container.replaceChildren(renderDayGrid(layout));
};

calendar['~mount'](); // starts the clock
calendar.store.subscribe(render);
render();

document.querySelector('#next')!.addEventListener('click', () => calendar.api.next());
// #endregion app
