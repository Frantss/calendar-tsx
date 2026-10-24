import { calendarViews, calendarFeatures, fixedClock, listView } from '@calendar-tsx/core';
import { createRRuleEvent, rruleFeature } from '@calendar-tsx/rrule';
import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { ListView, ListViewDay, ListViewEvent } from '#list-view';
import { CalendarProvider, useCalendar, useCalendarSelector } from '#use-calendar';
import { useCalendarEventStore } from '#use-calendar-event-store';

const viewsFeatures = calendarFeatures({ rrule: rruleFeature() });
const views = calendarViews({ features: viewsFeatures, views: { list: listView({ days: 3 }) } });
const series = createRRuleEvent({
  id: 'review',
  kind: 'timed',
  start: Temporal.ZonedDateTime.from('2026-03-07T09:00[America/New_York]'),
  duration: Temporal.Duration.from({ minutes: 30 }),
  rrule: 'FREQ=DAILY;COUNT=3',
  data: { title: 'Review' },
});
const Body = () => {
  const layout = useCalendarSelector(state => state.layout);
  if (layout.kind !== 'list') return null;
  return (
    <ListView model={layout}>
      {layout.days.map(day => (
        <ListViewDay key={day.key} day={day}>
          {day.events.map(event => (
            <ListViewEvent key={event.id} event={event}>
              {event.occurrence?.seriesId}
            </ListViewEvent>
          ))}
        </ListViewDay>
      ))}
    </ListView>
  );
};

it('renders derived occurrences and removes them by updating the stored series', async () => {
  const Harness = () => {
    const store = useCalendarEventStore([series]);
    const instance = useCalendar({
      timeZone: 'America/New_York',
      views: views,
      features: viewsFeatures,
      view: 'list',
      date: Temporal.PlainDate.from('2026-03-07'),
      events: store.events,
      onNavigate: () => {},
      clock: fixedClock(Temporal.Instant.from('2026-03-07T00:00Z')),
    });
    return (
      <CalendarProvider value={instance}>
        <button type='button' onClick={() => store.remove(series.id)}>
          remove series
        </button>
        <Body />
      </CalendarProvider>
    );
  };
  await render(<Harness />);
  expect(page.getByRole('button', { name: 'review', exact: true }).elements()).toHaveLength(3);
  await page.getByRole('button', { name: 'remove series' }).click();
  expect(page.getByRole('button', { name: 'review', exact: true }).elements()).toHaveLength(0);
});
