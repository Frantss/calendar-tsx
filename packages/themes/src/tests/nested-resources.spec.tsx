/// <reference types="@vitest/browser-playwright" />
import { Temporal } from 'temporal-polyfill';
import { expect, it } from 'vitest';
import { page, userEvent, cdp } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { createCalendar, calendarFeatures, calendarViews, fixedClock, resourceExpansionFeature, timelineView } from '@calendar-tsx/core';
import type { Calendar_StateOf } from '@calendar-tsx/core';
import {
  CalendarProvider,
  useCalendarSelector,
  TimelineView,
  TimelineViewBody,
  TimelineViewRow,
  TimelineViewResource,
  TimelineViewResourceToggle,
  TimelineViewLane,
} from '@calendar-tsx/react';
import '../../default.css';

const setup = async (colorScheme: 'light' | 'dark', dir: 'ltr' | 'rtl' = 'ltr') => {
  const features = calendarFeatures({ tree: resourceExpansionFeature() });
  const calendar = createCalendar({
    features,
    views: calendarViews({ features, views: { timeline: timelineView({ days: 1, groupBy: 'resource' }) } }),
    view: 'timeline',
    timeZone: 'UTC',
    date: Temporal.PlainDate.from('2026-03-11'),
    events: [],
    onNavigate: () => {},
    clock: fixedClock(Temporal.Instant.from('2026-03-11T12:00Z')),
    resources: [
      { id: 'building', title: 'Building', availability: [], data: null },
      { id: 'floor', title: 'Floor', parentId: 'building', availability: [], data: null },
      { id: 'room', title: 'Room', parentId: 'floor', availability: [], data: null },
    ],
  });
  const Rows = () => {
    const layout = useCalendarSelector((state: Calendar_StateOf<typeof calendar>) => state.layout);
    return (
      <TimelineView model={layout}>
        <TimelineViewBody>
          {layout.rows.map(row => (
            <TimelineViewRow key={row.key} row={row}>
              <TimelineViewResource row={row}>
                <TimelineViewResourceToggle calendar={calendar} row={row}>
                  <span aria-hidden='true'>{row.isExpanded ? '−' : '+'}</span>
                </TimelineViewResourceToggle>
                {row.resource?.title}
              </TimelineViewResource>
              <TimelineViewLane row={row} />
            </TimelineViewRow>
          ))}
        </TimelineViewBody>
      </TimelineView>
    );
  };
  await render(
    <div dir={dir} style={{ inlineSize: 700, colorScheme }}>
      <CalendarProvider value={calendar}>
        <Rows />
      </CalendarProvider>
    </div>,
  );
  return [...document.querySelectorAll<HTMLElement>('[data-part="timeline-resource"]')];
};

it.each(['ltr', 'rtl'] as const)('indents nested resources from the inline start in %s', async dir => {
  const cells = await setup('light', dir);
  const padding = cells.map(cell => Number.parseFloat(getComputedStyle(cell).paddingInlineStart));
  expect(padding).toEqual([12, 28, 44]);
  const rows = [...document.querySelectorAll<HTMLElement>('[data-part="timeline-row"]')];
  for (const row of rows) {
    const cell = row.querySelector('[data-part="timeline-resource"]')!.getBoundingClientRect();
    const lane = row.querySelector('[data-part="timeline-lane"]')!.getBoundingClientRect();
    expect(cell.top).toBe(lane.top);
    expect(cell.bottom).toBe(lane.bottom);
  }
});

it.each(['light', 'dark'] as const)('keeps a visible keyboard focus ring and a 24px toggle in %s', async colorScheme => {
  await setup(colorScheme);
  await userEvent.tab();
  const button = page.getByRole('button', { name: 'Collapse Building' });
  expect(document.activeElement).toBe(button.element());
  const style = getComputedStyle(button.element());
  expect(style.outlineStyle).toBe('solid');
  expect(style.outlineWidth).toBe('2px');
  expect(button.element().getBoundingClientRect().width).toBeGreaterThanOrEqual(24);
  expect(button.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
  await userEvent.keyboard('{Enter}');
  expect(document.querySelectorAll('[data-part="timeline-row"]')).toHaveLength(1);
});

it('retains the native expansion state and focus ring in forced colors', async () => {
  await cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
  try {
    await setup('light');
    await userEvent.tab();
    const button = page.getByRole('button', { name: 'Collapse Building' });
    await expect.element(button).toHaveAttribute('aria-expanded', 'true');
    expect(getComputedStyle(button.element()).outlineStyle).toBe('solid');
    await userEvent.keyboard(' ');
    await expect.element(page.getByRole('button', { name: 'Expand Building' })).toHaveAttribute('aria-expanded', 'false');
  } finally {
    await cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'none' }] });
  }
});
