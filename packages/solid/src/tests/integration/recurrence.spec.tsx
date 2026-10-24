import { calendarViews, calendarFeatures, fixedClock, listView, createRecurringEvent, recurrenceFeature } from '@calendar-tsx/core';
import { For, Show } from 'solid-js';
import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { ListView, ListViewDay, ListViewEvent } from '#views/list/list-view';
import { tests_render } from '#tests/support/render';
import { CalendarProvider, useCalendar, useCalendarSelector } from '#calendar/calendar';
import { useCalendarEventStore } from '#events/use-calendar-event-store';

const viewsFeatures = calendarFeatures({ recurrence: recurrenceFeature() });
const views = calendarViews({ features: viewsFeatures, views: { list: listView({ days: 3 }) } });
const series = createRecurringEvent({
  id: 'review',
  kind: 'timed',
  start: Temporal.ZonedDateTime.from('2026-03-07T09:00[America/New_York]'),
  duration: Temporal.Duration.from({ minutes: 30 }),
  rrule: { freq: 'DAILY', count: 3 },
  data: { title: 'Review' },
});
const Body = () => {
  const layout = useCalendarSelector(state => (state.layout.kind === 'list' ? state.layout : undefined));
  return (
    <Show when={layout()}>
      {list => (
        <ListView model={list()}>
          <For each={list().days}>
            {day => (
              <ListViewDay day={day}>
                <For each={day.events}>{event => <ListViewEvent event={event}>{event.occurrence?.seriesId}</ListViewEvent>}</For>
              </ListViewDay>
            )}
          </For>
        </ListView>
      )}
    </Show>
  );
};

it('renders derived occurrences and removes them by updating the stored series', async () => {
  const Harness = () => {
    const store = useCalendarEventStore([series]);
    const instance = useCalendar(() => ({
      timeZone: 'America/New_York',
      views: views,
      features: viewsFeatures,
      view: 'list',
      date: Temporal.PlainDate.from('2026-03-07'),
      events: store.events(),
      onNavigate: () => {},
      clock: fixedClock(Temporal.Instant.from('2026-03-07T00:00Z')),
    }));
    return (
      <CalendarProvider value={instance}>
        <button type='button' onClick={() => store.remove(series.id)}>
          remove series
        </button>
        <Body />
      </CalendarProvider>
    );
  };
  tests_render(() => <Harness />);
  expect(page.getByRole('button', { name: 'review', exact: true }).elements()).toHaveLength(3);
  await page.getByRole('button', { name: 'remove series' }).click();
  expect(page.getByRole('button', { name: 'review', exact: true }).elements()).toHaveLength(0);
});
