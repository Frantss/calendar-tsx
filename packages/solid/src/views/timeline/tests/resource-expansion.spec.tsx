import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { createCalendar, calendarFeatures, calendarViews, resourceExpansionFeature, timelineView, fixedClock } from '@calendar-tsx/core';
import type { Calendar_StateOf } from '@calendar-tsx/core';
import { CalendarProvider, useCalendarSelector } from '#calendar/calendar';
import {
  TimelineView,
  TimelineViewBody,
  TimelineViewRow,
  TimelineViewResource,
  TimelineViewResourceToggle,
  TimelineViewLane,
  TimelineViewEvent,
} from '#views/timeline/timeline-view';
import { For } from 'solid-js';
import { tests_render } from '#tests/support/render';

const setup = async (prevent = false) => {
  const features = calendarFeatures({ tree: resourceExpansionFeature() });
  const calendar = createCalendar({
    features,
    views: calendarViews({ features, views: { timeline: timelineView({ days: 1, groupBy: 'resource' }) } }),
    view: 'timeline',
    timeZone: 'UTC',
    date: Temporal.PlainDate.from('2026-03-11'),
    onNavigate: () => {},
    clock: fixedClock(Temporal.Instant.from('2026-03-11T12:00Z')),
    resources: [
      { id: 'parent', title: 'Building', availability: [], data: null },
      { id: 'child', parentId: 'parent', title: 'Room', availability: [], data: null },
    ],
    events: [{ id: 'booking', kind: 'allDay', start: Temporal.PlainDate.from('2026-03-11'), resourceIds: ['child'], data: { title: 'Booking' } }],
  });
  const Rows = () => {
    const layout = useCalendarSelector((state: Calendar_StateOf<typeof calendar>) => state.layout);
    return (
      <TimelineView model={layout()}>
        <TimelineViewBody>
          <For each={layout().rows}>
            {row => (
              <TimelineViewRow row={row}>
                <TimelineViewResource row={row}>
                  <TimelineViewResourceToggle
                    calendar={calendar}
                    row={row}
                    onClick={event => {
                      if (prevent) event.preventDefault();
                    }}
                  >
                    <span aria-hidden='true'>{row.isExpanded ? '−' : '+'}</span>
                  </TimelineViewResourceToggle>
                  {row.resource?.title}
                </TimelineViewResource>
                <TimelineViewLane row={row}>
                  <For each={row.segments}>{segment => <TimelineViewEvent segment={segment}>{segment.event.data.title}</TimelineViewEvent>}</For>
                </TimelineViewLane>
              </TimelineViewRow>
            )}
          </For>
        </TimelineViewBody>
      </TimelineView>
    );
  };
  tests_render(() => (
    <CalendarProvider value={calendar}>
      <Rows />
    </CalendarProvider>
  ));
  return calendar;
};

it('collapses descendants with a labelled native button and restores them through the keyboard', async () => {
  await setup();
  const toggle = page.getByRole('button', { name: 'Collapse Building' });
  await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(document.querySelectorAll('[data-part="timeline-resource-toggle"]')).toHaveLength(1);
  const child = document.querySelector<HTMLElement>('[data-part="timeline-resource"][data-resource-id="child"]')!;
  expect(child.style.getPropertyValue('--cal-resource-depth')).toBe('1');
  await toggle.click();
  await expect.element(page.getByRole('button', { name: 'Booking', exact: true })).not.toBeInTheDocument();
  const collapsed = page.getByRole('button', { name: 'Expand Building' });
  await expect.element(collapsed).toHaveAttribute('aria-expanded', 'false');
  expect(document.activeElement).toBe(collapsed.element());
  await userEvent.keyboard('{Enter}');
  await expect.element(page.getByRole('button', { name: 'Booking', exact: true })).toBeInTheDocument();
  await userEvent.keyboard(' ');
  await expect.element(page.getByRole('button', { name: 'Booking', exact: true })).not.toBeInTheDocument();
});

it('lets consumer handlers prevent expansion', async () => {
  const calendar = await setup(true);
  await page.getByRole('button', { name: 'Collapse Building' }).click();
  expect(calendar.store.state.layout.rows).toHaveLength(2);
  await expect.element(page.getByRole('button', { name: 'Booking', exact: true })).toBeInTheDocument();
});
